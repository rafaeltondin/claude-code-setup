/**
 * AUTO-TAGGER — Sistema de Tags Inteligentes via LLM
 *
 * Analisa conteudo de mensagens/leads e sugere tags automaticamente.
 * Usa OpenRouter para classificacao semantica.
 *
 * Tags possiveis: interessado, pediu-preco, reclamacao, suporte,
 * agendamento, feedback-positivo, sem-interesse, spam, urgente, retorno
 */

const https = require('https');

const OPENROUTER_HOST = 'openrouter.ai';
const OPENROUTER_PATH = '/api/v1/chat/completions';

const TAG_CATEGORIES = [
  'interessado',
  'pediu-preco',
  'reclamacao',
  'suporte',
  'agendamento',
  'feedback-positivo',
  'sem-interesse',
  'spam',
  'urgente',
  'retorno',
  'duvida',
  'negociacao',
  'fechamento',
  'indicacao',
];

const SYSTEM_PROMPT = `Voce e um classificador de mensagens de leads/clientes para um CRM de prospeccao.

Analise a mensagem e retorne APENAS um JSON valido com as tags aplicaveis e uma confianca (0-1) para cada:

{
  "tags": [
    { "name": "tag-name", "confidence": 0.95, "reason": "motivo curto" }
  ],
  "sentiment": "positivo|neutro|negativo",
  "intent": "descricao curta da intencao do lead",
  "suggestedAction": "proxima acao recomendada",
  "priority": "alta|media|baixa"
}

Tags disponiveis: ${TAG_CATEGORIES.join(', ')}

Regras:
- Retorne entre 1 e 4 tags mais relevantes
- confidence >= 0.7 para incluir
- Se a mensagem for curta ou ambigua, use menos tags
- sentiment reflete o tom geral
- suggestedAction deve ser acionavel (ex: "Enviar tabela de precos", "Agendar ligacao")
- RESPONDA APENAS COM JSON, sem markdown`;

class AutoTagger {
  /**
   * @param {Object} options
   * @param {string} options.apiKey - OpenRouter API key
   * @param {string} options.model - Modelo a usar (default: haiku para economia)
   * @param {Object} options.credentialVault - Vault de credenciais
   */
  constructor({ apiKey, model, credentialVault } = {}) {
    this.apiKey = apiKey;
    this.model = model || 'anthropic/claude-haiku-4-5';
    this.credentialVault = credentialVault || null;
  }

  /**
   * Analisa uma mensagem e retorna tags sugeridas
   * @param {string} messageContent - Conteudo da mensagem
   * @param {Object} context - Contexto adicional (nome do lead, historico, etc)
   * @returns {Promise<Object>} Tags, sentiment, intent, suggestedAction
   */
  async analyze(messageContent, context = {}) {
    if (!messageContent || messageContent.trim().length < 3) {
      return { tags: [], sentiment: 'neutro', intent: 'mensagem vazia', suggestedAction: 'Aguardar', priority: 'baixa' };
    }

    let userPrompt = `Mensagem do lead:\n"${messageContent}"`;

    if (context.leadName) userPrompt += `\n\nNome do lead: ${context.leadName}`;
    if (context.leadStatus) userPrompt += `\nStatus atual: ${context.leadStatus}`;
    if (context.leadTemperature) userPrompt += `\nTemperatura: ${context.leadTemperature}`;
    if (context.previousMessages) userPrompt += `\n\nMensagens anteriores:\n${context.previousMessages}`;

    try {
      const response = await this._callLLM([
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ]);

      // Parsear JSON da resposta
      let jsonStr = response;
      const codeMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeMatch) jsonStr = codeMatch[1];
      const objMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (objMatch) jsonStr = objMatch[0];

      const result = JSON.parse(jsonStr);

      // Validar e filtrar tags
      if (result.tags && Array.isArray(result.tags)) {
        result.tags = result.tags.filter(t =>
          TAG_CATEGORIES.includes(t.name) && t.confidence >= 0.7
        );
      }

      return {
        tags: result.tags || [],
        sentiment: result.sentiment || 'neutro',
        intent: result.intent || '',
        suggestedAction: result.suggestedAction || '',
        priority: result.priority || 'media',
        analyzedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('[AutoTagger] Erro na analise:', error.message);
      return {
        tags: [],
        sentiment: 'neutro',
        intent: 'erro na analise',
        suggestedAction: 'Revisar manualmente',
        priority: 'media',
        error: error.message
      };
    }
  }

  /**
   * Analisa multiplas mensagens em batch
   * @param {Array<{content: string, context: Object}>} messages
   * @returns {Promise<Array<Object>>}
   */
  async analyzeBatch(messages) {
    const results = [];
    // Processar em chunks de 5 para nao sobrecarregar a API
    for (let i = 0; i < messages.length; i += 5) {
      const chunk = messages.slice(i, i + 5);
      const chunkResults = await Promise.all(
        chunk.map(msg => this.analyze(msg.content, msg.context || {}))
      );
      results.push(...chunkResults);
    }
    return results;
  }

  /**
   * Sugere temperatura do lead baseado nas tags
   * @param {Array} tags - Tags do auto-tagger
   * @returns {string} hot|warm|cold
   */
  static suggestTemperature(tags) {
    const tagNames = tags.map(t => t.name);
    if (tagNames.includes('fechamento') || tagNames.includes('urgente')) return 'hot';
    if (tagNames.includes('interessado') || tagNames.includes('pediu-preco') || tagNames.includes('negociacao')) return 'warm';
    if (tagNames.includes('sem-interesse') || tagNames.includes('spam')) return 'cold';
    return 'warm';
  }

  /**
   * Sugere proximo status do lead
   * @param {Array} tags
   * @param {string} currentStatus
   * @returns {string|null} Novo status sugerido ou null
   */
  static suggestStatus(tags, currentStatus) {
    const tagNames = tags.map(t => t.name);
    if (tagNames.includes('fechamento') && currentStatus !== 'won') return 'negotiation';
    if (tagNames.includes('interessado') && currentStatus === 'new') return 'contacted';
    if (tagNames.includes('sem-interesse')) return 'lost';
    if (tagNames.includes('agendamento')) return 'qualified';
    return null;
  }

  _callLLM(messages) {
    return new Promise((resolve, reject) => {
      let apiKey = this.apiKey;
      if (!apiKey && this.credentialVault) {
        try {
          const envVars = this.credentialVault.getEnvVars ? this.credentialVault.getEnvVars() : {};
          apiKey = envVars['OPENROUTER_API_KEY'];
        } catch (_) {}
      }
      if (!apiKey) return reject(new Error('OPENROUTER_API_KEY nao configurada'));

      const body = JSON.stringify({
        model: this.model,
        messages,
        stream: false,
        max_tokens: 512,
        temperature: 0.3
      });

      const req = https.request({
        hostname: OPENROUTER_HOST,
        path: OPENROUTER_PATH,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body, 'utf8')
        }
      }, res => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode !== 200) return reject(new Error(`API ${res.statusCode}: ${data.slice(0, 300)}`));
            const msg = parsed.choices?.[0]?.message;
            resolve(msg?.content || msg?.reasoning || '');
          } catch (e) { reject(e); }
        });
      });
      req.on('error', reject);
      req.write(body, 'utf8');
      req.end();
    });
  }
}

module.exports = { AutoTagger, TAG_CATEGORIES };
