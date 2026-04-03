/**
 * CHAIN-OF-TOOLS PLANNER — Planejador de Cadeias de Ferramentas
 *
 * Recebe uma tarefa e gera automaticamente uma cadeia de tools
 * a serem executadas em sequencia, com passagem de dados entre elas.
 *
 * Ex: scrape_website → extrair dados → generate_image → instagram post
 */

const https = require('https');

const OPENROUTER_HOST = 'openrouter.ai';
const OPENROUTER_PATH = '/api/v1/chat/completions';

const AVAILABLE_TOOLS = [
  'search_kb', 'google_search', 'maps_search', 'scrape_website',
  'seo_check', 'pagespeed', 'fetch_api', 'call_crm', 'meta_ads',
  'read_file', 'write_file', 'execute_node', 'run_command',
  'generate_image', 'instagram', 'chrome', 'csv_processor',
  'pdf_reader', 'get_credential', 'open_url', 'git',
  'search_in_files', 'find_files', 'list_directory'
];

const PLAN_SYSTEM_PROMPT = `Voce e um planejador de cadeias de ferramentas. Dado uma tarefa, crie um plano de execucao sequencial usando as ferramentas disponiveis.

Ferramentas disponiveis: ${AVAILABLE_TOOLS.join(', ')}

Responda APENAS com JSON valido:
{
  "chain": [
    {
      "step": 1,
      "tool": "nome_da_ferramenta",
      "args": { "param": "valor" },
      "description": "O que este passo faz",
      "outputVar": "nome_variavel_para_resultado",
      "dependsOn": [],
      "condition": null
    }
  ],
  "description": "Descricao geral da cadeia",
  "estimatedTime": "tempo estimado em segundos"
}

Regras:
- Cada step pode referenciar resultados de steps anteriores usando {{outputVar}}
- dependsOn lista os steps que precisam completar antes
- condition e opcional: "{{var}} != null", "{{var}}.length > 0", etc
- Maximo 10 steps por cadeia
- Use a ferramenta mais especifica disponivel
- args deve ser um objeto com os parametros reais da ferramenta`;

class ChainPlanner {
  constructor({ apiKey, model, credentialVault, executeTool } = {}) {
    this.apiKey = apiKey;
    this.model = model || 'anthropic/claude-sonnet-4-6';
    this.credentialVault = credentialVault || null;
    this.executeTool = executeTool || null;
    this.chains = new Map(); // chainId → chain state
  }

  /**
   * Planeja uma cadeia de tools para uma tarefa
   * @param {string} task - Descricao da tarefa
   * @returns {Promise<Object>} Plano da cadeia
   */
  async plan(task) {
    const response = await this._callLLM([
      { role: 'system', content: PLAN_SYSTEM_PROMPT },
      { role: 'user', content: `Planeje a cadeia de ferramentas para: ${task}` }
    ]);

    let jsonStr = response;
    const codeMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeMatch) jsonStr = codeMatch[1];
    const objMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objMatch) jsonStr = objMatch[0];

    const plan = JSON.parse(jsonStr);

    // Validar tools
    if (plan.chain) {
      plan.chain = plan.chain.filter(step => AVAILABLE_TOOLS.includes(step.tool));
    }

    const chainId = `chain_${Date.now()}`;
    plan.id = chainId;
    plan.status = 'planned';
    plan.createdAt = new Date().toISOString();

    this.chains.set(chainId, plan);
    return plan;
  }

  /**
   * Executa uma cadeia planejada
   * @param {string} chainId - ID da cadeia
   * @param {Function} onProgress - Callback de progresso (step, result)
   * @returns {Promise<Object>} Resultados de toda a cadeia
   */
  async execute(chainId, onProgress) {
    const chain = this.chains.get(chainId);
    if (!chain) throw new Error(`Cadeia ${chainId} nao encontrada`);
    if (!this.executeTool) throw new Error('executeTool nao configurado');

    chain.status = 'running';
    chain.startedAt = new Date().toISOString();
    const outputs = {};
    const results = [];

    for (const step of chain.chain) {
      const stepNum = step.step;

      // Verificar dependencias
      if (step.dependsOn && step.dependsOn.length > 0) {
        const allDepsOk = step.dependsOn.every(dep => {
          const depStep = results.find(r => r.step === dep);
          return depStep && depStep.status === 'completed';
        });
        if (!allDepsOk) {
          results.push({ step: stepNum, status: 'skipped', reason: 'dependencia falhou' });
          continue;
        }
      }

      // Verificar condicao
      if (step.condition) {
        const conditionMet = this._evaluateCondition(step.condition, outputs);
        if (!conditionMet) {
          results.push({ step: stepNum, status: 'skipped', reason: 'condicao nao atendida' });
          continue;
        }
      }

      // Resolver variaveis nos args
      const resolvedArgs = this._resolveVars(step.args, outputs);

      try {
        console.log(`[ChainPlanner] Executando step ${stepNum}: ${step.tool}`, resolvedArgs);
        const result = await this.executeTool(step.tool, resolvedArgs);

        if (step.outputVar) {
          outputs[step.outputVar] = result;
        }

        const stepResult = { step: stepNum, tool: step.tool, status: 'completed', result };
        results.push(stepResult);

        if (onProgress) onProgress(stepResult);
      } catch (error) {
        const stepResult = { step: stepNum, tool: step.tool, status: 'failed', error: error.message };
        results.push(stepResult);
        if (onProgress) onProgress(stepResult);
      }
    }

    chain.status = results.every(r => r.status === 'completed' || r.status === 'skipped') ? 'completed' : 'partial';
    chain.completedAt = new Date().toISOString();
    chain.results = results;
    chain.outputs = outputs;

    return { chainId, status: chain.status, results, outputs };
  }

  /**
   * Retorna todas as cadeias armazenadas
   */
  getChains() {
    return Array.from(this.chains.values());
  }

  /**
   * Retorna uma cadeia por ID
   */
  getChain(chainId) {
    return this.chains.get(chainId) || null;
  }

  _resolveVars(obj, outputs) {
    if (!obj) return obj;
    const str = JSON.stringify(obj);
    const resolved = str.replace(/\{\{(\w+)\}\}/g, (_, varName) => {
      const val = outputs[varName];
      if (val === undefined) return `{{${varName}}}`;
      return typeof val === 'string' ? val : JSON.stringify(val);
    });
    try { return JSON.parse(resolved); } catch { return obj; }
  }

  _evaluateCondition(condition, outputs) {
    try {
      const resolved = condition.replace(/\{\{(\w+)\}\}/g, (_, varName) => {
        const val = outputs[varName];
        if (val === undefined) return 'null';
        return JSON.stringify(val);
      });
      // Avaliacao segura: apenas comparacoes simples
      if (resolved.includes('!= null')) return !resolved.includes('null != null');
      if (resolved.includes('.length > 0')) return true; // simplificacao
      return true;
    } catch {
      return true;
    }
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
        max_tokens: 2048,
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
            resolve(parsed.choices?.[0]?.message?.content || '');
          } catch (e) { reject(e); }
        });
      });
      req.on('error', reject);
      req.write(body, 'utf8');
      req.end();
    });
  }
}

module.exports = { ChainPlanner, AVAILABLE_TOOLS };
