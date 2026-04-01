/**
 * OPENROUTER CLIENT - Cliente para a API do OpenRouter
 *
 * Substitui o Claude Code CLI como backend de IA.
 * Compatível com a API OpenAI (endpoint openrouter.ai/api/v1/chat/completions)
 *
 * CONFIGURACAO:
 *   1. Adicionar ao vault: node credential-cli.js set OPENROUTER_API_KEY sk-or-v1-...
 *   2. Ou definir a variável de ambiente: OPENROUTER_API_KEY=sk-or-v1-...
 *
 * MODELOS POPULARES (OpenRouter):
 *   - anthropic/claude-sonnet-4-5       (Claude Sonnet 4.5 - recomendado)
 *   - anthropic/claude-3.5-sonnet       (Claude 3.5 Sonnet)
 *   - anthropic/claude-3-haiku          (mais rápido/barato)
 *   - openai/gpt-4o                     (GPT-4o)
 *   - google/gemini-2.0-flash-001       (Gemini 2.0 Flash)
 *   - anthropic/claude-sonnet-4-5:free  (gratuito, rate limited)
 */

const https = require('https');

const OPENROUTER_HOST = 'openrouter.ai';
const OPENROUTER_PATH = '/api/v1/chat/completions';
const DEFAULT_MODEL = process.env.OPENROUTER_DEFAULT_MODEL || 'z-ai/glm-4.7-flash';
const APP_REFERER = 'http://localhost:3847';
const APP_TITLE = 'Claude Task Scheduler';

// Modelos que usam reasoning (pensamento antes da resposta) — precisam de max_tokens alto
const REASONING_MODELS = ['z-ai/glm-5', 'z-ai/glm-4', 'z-ai/glm-4.7', 'deepseek/deepseek-r1', 'openai/o1', 'openai/o3'];

/**
 * Obtém a chave da API OpenRouter.
 * Prioridade: 1) env var OPENROUTER_API_KEY  2) credential vault
 */
function getApiKey() {
  if (process.env.OPENROUTER_API_KEY) {
    return process.env.OPENROUTER_API_KEY;
  }

  try {
    const vault = require('./credential-vault');
    const envVars = vault.getEnvVars();
    const key = envVars['OPENROUTER_API_KEY'];
    if (key) return key;
  } catch (e) {
    // vault não disponível
  }

  throw new Error(
    'OPENROUTER_API_KEY não configurada.\n' +
    'Adicione via: node credential-cli.js set OPENROUTER_API_KEY sk-or-v1-...\n' +
    'Ou defina a variável de ambiente: OPENROUTER_API_KEY=sk-or-v1-...'
  );
}

/**
 * Monta os headers padrão para a API OpenRouter.
 */
function buildHeaders(apiKey, bodyLength) {
  return {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': APP_REFERER,
    'X-Title': APP_TITLE,
    'Content-Length': bodyLength
  };
}

/**
 * Streaming chat completion via OpenRouter.
 *
 * @param {Array} messages - Array de mensagens no formato OpenAI [{role, content}, ...]
 * @param {Object} options
 * @param {string} [options.model] - Modelo a usar (default: DEFAULT_MODEL)
 * @param {number} [options.maxTokens] - Máximo de tokens (default: 4096, auto 16000 para reasoning models)
 * @param {number} [options.temperature] - Temperatura (default: 0.7)
 * @param {Function} [options.onChunk] - Callback chamado com cada chunk de texto (conteúdo final)
 * @param {Function} [options.onReasoning] - Callback chamado com chunks de raciocínio (opcional)
 * @param {Array} [options.tools] - Array de tools no formato OpenAI (function calling nativo)
 * @param {AbortSignal} [options.signal] - Signal para cancelamento
 * @returns {Promise<{text: string, reasoning: string, model: string, usage: Object, toolCalls: Array}>}
 */
function streamCompletion(messages, options = {}) {
  const {
    model = DEFAULT_MODEL,
    temperature = 0.7,
    onChunk = null,
    onReasoning = null,
    tools = null,
    signal = null
  } = options;

  // Modelos de reasoning precisam de max_tokens alto (usam tokens para pensar antes de responder)
  const isReasoningModel = REASONING_MODELS.some(m => model.startsWith(m));
  const maxTokens = options.maxTokens || (isReasoningModel ? 16000 : 4096);

  return new Promise((resolve, reject) => {
    let apiKey;
    try {
      apiKey = getApiKey();
    } catch (e) {
      return reject(e);
    }

    const fallbackModels = options.fallbackModels !== undefined ? options.fallbackModels
      : (REASONING_MODELS.some(m => model.startsWith(m)) ? [] : ['google/gemini-2.0-flash-001', 'anthropic/claude-3-haiku']);
    const bodyObj = {
      model,
      messages,
      stream: true,
      max_tokens: maxTokens,
      temperature,
      provider: {
        sort: 'price',
        allow_fallbacks: true
      },
      ...(fallbackModels.length ? { models: [model, ...fallbackModels] } : {})
    };

    // Function calling nativo: enviar tools se fornecidas
    if (tools && tools.length > 0) {
      bodyObj.tools = tools;
      bodyObj.tool_choice = 'auto';
    }

    const body = JSON.stringify(bodyObj);

    const reqOptions = {
      hostname: OPENROUTER_HOST,
      path: OPENROUTER_PATH,
      method: 'POST',
      headers: buildHeaders(apiKey, Buffer.byteLength(body, 'utf8'))
    };

    let fullText = '';
    let fullReasoning = '';
    let usageInfo = null;
    let modelUsed = model;
    let buffer = '';
    // Acumulador de tool_calls (function calling nativo)
    // Formato: { [index]: { id, type, function: { name, arguments } } }
    const toolCallsAccum = {};

    const req = https.request(reqOptions, (res) => {
      if (res.statusCode !== 200) {
        let errBody = '';
        res.on('data', (d) => { errBody += d.toString(); });
        res.on('end', () => {
          reject(new Error(`OpenRouter API retornou ${res.statusCode}: ${errBody}`));
        });
        return;
      }

      res.setEncoding('utf8');

      res.on('data', (chunk) => {
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop(); // manter linha incompleta no buffer

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const dataStr = trimmed.slice(6); // remover "data: "
          if (dataStr === '[DONE]') continue;

          try {
            const event = JSON.parse(dataStr);

            // Capturar modelo real usado
            if (event.model) modelUsed = event.model;

            // Capturar usage info (vem no último chunk)
            if (event.usage) usageInfo = event.usage;

            const delta = event.choices && event.choices[0] ? event.choices[0].delta : null;
            if (!delta) continue;

            // Capturar raciocínio interno (reasoning models como z-ai/glm-5)
            if (delta.reasoning) {
              fullReasoning += delta.reasoning;
              if (onReasoning) onReasoning(delta.reasoning);
            }

            // Capturar texto final (content)
            if (delta.content) {
              fullText += delta.content;
              if (onChunk) onChunk(delta.content);
            }

            // Capturar tool_calls nativos (function calling)
            if (delta.tool_calls) {
              for (const tc of delta.tool_calls) {
                const idx = tc.index !== undefined ? tc.index : 0;
                if (!toolCallsAccum[idx]) {
                  toolCallsAccum[idx] = { id: '', type: 'function', function: { name: '', arguments: '' } };
                }
                if (tc.id) toolCallsAccum[idx].id = tc.id;
                if (tc.type) toolCallsAccum[idx].type = tc.type;
                if (tc.function) {
                  if (tc.function.name) toolCallsAccum[idx].function.name += tc.function.name;
                  if (tc.function.arguments) toolCallsAccum[idx].function.arguments += tc.function.arguments;
                }
              }
            }
          } catch (e) {
            // linha não é JSON válido, ignorar
          }
        }
      });

      res.on('end', () => {
        // Processar qualquer dado restante no buffer
        if (buffer.trim() && buffer.trim().startsWith('data: ')) {
          const dataStr = buffer.trim().slice(6);
          if (dataStr !== '[DONE]') {
            try {
              const event = JSON.parse(dataStr);
              const delta = event.choices && event.choices[0] ? event.choices[0].delta : null;
              if (delta) {
                if (delta.reasoning) {
                  fullReasoning += delta.reasoning;
                  if (onReasoning) onReasoning(delta.reasoning);
                }
                if (delta.content) {
                  fullText += delta.content;
                  if (onChunk) onChunk(delta.content);
                }
              }
            } catch (e) { }
          }
        }

        // Fallback: se content é vazio mas reasoning tem conteúdo, usar reasoning como resposta
        const finalText = fullText || (fullReasoning ? `[Raciocínio do modelo]\n${fullReasoning}` : '');

        // Montar array de tool_calls nativos
        const nativeToolCalls = Object.keys(toolCallsAccum)
          .sort((a, b) => Number(a) - Number(b))
          .map(idx => {
            const tc = toolCallsAccum[idx];
            let parsedArgs = {};
            try { parsedArgs = JSON.parse(tc.function.arguments || '{}'); } catch (_) {}
            return {
              id: tc.id,
              name: tc.function.name,
              args: parsedArgs,
              rawArguments: tc.function.arguments
            };
          })
          .filter(tc => tc.name); // Filtrar tool calls sem nome

        resolve({
          text: finalText,
          reasoning: fullReasoning,
          model: modelUsed,
          usage: usageInfo || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
          toolCalls: nativeToolCalls
        });
      });

      res.on('error', reject);
    });

    req.on('error', reject);

    // Suporte a cancelamento
    if (signal) {
      signal.addEventListener('abort', () => {
        req.destroy();
        reject(new Error('Requisição cancelada'));
      });
    }

    req.write(body, 'utf8');
    req.end();
  });
}

/**
 * Chat completion simples (sem streaming).
 *
 * @param {Array} messages - Array de mensagens no formato OpenAI
 * @param {Object} options
 * @param {string} [options.model] - Modelo a usar
 * @param {number} [options.maxTokens] - Máximo de tokens (auto 16000 para reasoning models)
 * @param {number} [options.temperature] - Temperatura
 * @returns {Promise<{text: string, reasoning: string, model: string, usage: Object}>}
 */
function complete(messages, options = {}) {
  const {
    model = DEFAULT_MODEL,
    temperature = 0.7
  } = options;

  const isReasoningModel = REASONING_MODELS.some(m => model.startsWith(m));
  const maxTokens = options.maxTokens || (isReasoningModel ? 16000 : 4096);

  return new Promise((resolve, reject) => {
    let apiKey;
    try {
      apiKey = getApiKey();
    } catch (e) {
      return reject(e);
    }

    const tools = options.tools || null;
    const fallbackModelsC = options.fallbackModels !== undefined ? options.fallbackModels
      : (REASONING_MODELS.some(m => model.startsWith(m)) ? [] : ['google/gemini-2.0-flash-001', 'anthropic/claude-3-haiku']);
    const bodyObj = {
      model,
      messages,
      stream: false,
      max_tokens: maxTokens,
      temperature,
      provider: {
        sort: 'price',
        allow_fallbacks: true
      },
      ...(fallbackModelsC.length ? { models: [model, ...fallbackModelsC] } : {})
    };
    if (tools && tools.length > 0) {
      bodyObj.tools = tools;
      bodyObj.tool_choice = 'auto';
    }
    const body = JSON.stringify(bodyObj);

    const reqOptions = {
      hostname: OPENROUTER_HOST,
      path: OPENROUTER_PATH,
      method: 'POST',
      headers: buildHeaders(apiKey, Buffer.byteLength(body, 'utf8'))
    };

    let responseBody = '';

    const req = https.request(reqOptions, (res) => {
      res.setEncoding('utf8');
      res.on('data', (d) => { responseBody += d; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseBody);
          if (res.statusCode !== 200) {
            return reject(new Error(`OpenRouter API retornou ${res.statusCode}: ${responseBody}`));
          }
          const msg = parsed.choices && parsed.choices[0] ? parsed.choices[0].message : {};
          const content = msg.content || '';
          const reasoning = msg.reasoning || '';
          // Fallback: se content vazio, usar reasoning como resposta
          const finalText = content || (reasoning ? `[Raciocínio do modelo]\n${reasoning}` : '');
          // Extrair tool_calls nativos
          const nativeToolCalls = (msg.tool_calls || []).map(tc => {
            let parsedArgs = {};
            try { parsedArgs = JSON.parse(tc.function?.arguments || '{}'); } catch (_) {}
            return { id: tc.id, name: tc.function?.name, args: parsedArgs };
          }).filter(tc => tc.name);
          resolve({
            text: finalText,
            reasoning,
            model: parsed.model || model,
            usage: parsed.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
            toolCalls: nativeToolCalls
          });
        } catch (e) {
          reject(new Error(`Erro ao parsear resposta OpenRouter: ${e.message}`));
        }
      });
      res.on('error', reject);
    });

    req.on('error', reject);
    req.write(body, 'utf8');
    req.end();
  });
}

/**
 * Reconstrói array de mensagens OpenAI a partir do conversationLog do executor.
 * Útil para retomar conversas (resumeClaudeSession).
 *
 * @param {string} originalPrompt - Prompt original do usuário
 * @param {Array} steps - Array de steps do conversationLog
 * @param {string} [systemPrompt] - Prompt de sistema opcional
 * @returns {Array} Mensagens no formato OpenAI
 */
function buildMessagesFromSteps(originalPrompt, steps, systemPrompt) {
  const messages = [];

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }

  // Mensagem original do usuário
  if (originalPrompt) {
    messages.push({ role: 'user', content: originalPrompt });
  }

  // Reconstruir conversa a partir dos steps
  const assistantTexts = steps
    .filter(s => s.type === 'assistant_text')
    .map(s => s.text)
    .filter(Boolean);

  if (assistantTexts.length > 0) {
    messages.push({ role: 'assistant', content: assistantTexts.join('\n\n') });
  } else {
    // Tentar pegar do result
    const resultStep = steps.find(s => s.type === 'result');
    if (resultStep?.finalText) {
      messages.push({ role: 'assistant', content: resultStep.finalText });
    }
  }

  return messages;
}

// Preços aproximados por 1M tokens (input / output em USD) via OpenRouter
const MODEL_PRICES = {
  'anthropic/claude-opus-4':       [15.0, 75.0],
  'anthropic/claude-sonnet-4':     [3.0, 15.0],
  'anthropic/claude-sonnet-4-5':   [3.0, 15.0],
  'anthropic/claude-3.5-sonnet':   [3.0, 15.0],
  'anthropic/claude-3-haiku':      [0.25, 1.25],
  'openai/gpt-4o':                 [2.5, 10.0],
  'openai/gpt-4o-mini':            [0.15, 0.60],
  'google/gemini-2.0-flash-001':   [0.10, 0.40],
  'google/gemini-flash-1.5':       [0.075, 0.30],
  'z-ai/glm-4.7-flash':            [0.05, 0.20],
  'z-ai/glm-4.7':                  [0.14, 0.28],
  'deepseek/deepseek-r1':          [0.55, 2.19],
  'meta-llama/llama-3.1-70b-instruct': [0.52, 0.75],
};

/**
 * Calcula custo aproximado em USD com base no uso de tokens.
 * Usa tabela de preços por modelo; fallback para Claude Sonnet.
 */
function estimateCost(usage, model) {
  const { prompt_tokens = 0, completion_tokens = 0 } = usage || {};

  // Buscar preço pelo prefixo mais longo que casar com o modelo
  let inputPrice = 3.0 / 1_000_000;
  let outputPrice = 15.0 / 1_000_000;
  if (model) {
    const key = Object.keys(MODEL_PRICES).find(k => model.startsWith(k));
    if (key) {
      inputPrice = MODEL_PRICES[key][0] / 1_000_000;
      outputPrice = MODEL_PRICES[key][1] / 1_000_000;
    }
  }

  return (prompt_tokens * inputPrice) + (completion_tokens * outputPrice);
}

module.exports = {
  streamCompletion,
  complete,
  getApiKey,
  buildMessagesFromSteps,
  estimateCost,
  DEFAULT_MODEL
};
