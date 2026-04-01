/**
 * ORCHESTRATOR - Sistema orquestrador de agentes especializados
 *
 * Implementa o protocolo FASE 0-4:
 *   FASE 0: Ancoragem  - registra pedido original
 *   FASE 1: Decomposicao - chama LLM para criar plano JSON com subtarefas
 *   FASE 2: Execucao  - loop paralelo de agentes ate todas as tasks completed
 *   FASE 3: Self-Audit - verifica cada requisito foi atendido
 *   FASE 4: Relatorio - gera markdown com evidencias
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const PLANS_DIR = path.join(__dirname, 'data', 'plans');
if (!fs.existsSync(PLANS_DIR)) fs.mkdirSync(PLANS_DIR, { recursive: true });

const OPENROUTER_HOST = 'openrouter.ai';
const OPENROUTER_PATH = '/api/v1/chat/completions';
const APP_REFERER = 'http://localhost:8000';
const APP_TITLE = 'Claude Task Scheduler Orchestrator';

// System prompt para decomposicao de tarefas
const DECOMPOSE_SYSTEM_PROMPT = `Voce e um master-orchestrator. Analise a tarefa e crie um plano de execucao.
Responda APENAS com JSON valido neste formato:
{
  "steps": [
    {
      "id": "1",
      "name": "nome curto da subtarefa",
      "agent": "nome-do-agente",
      "description": "descricao detalhada do que fazer",
      "blockedBy": []
    }
  ]
}

## CONTEXTO CRITICO — API LOCAL
Este sistema tem uma API REST local em http://localhost:8000 com Auth: "Authorization: Bearer local-dev-token".
Quando o usuario pedir dados (leads, tarefas, financeiro, notas, calendario, etc), os agentes DEVEM usar a API local para buscar dados REAIS.
NUNCA instrua agentes a criar codigo generico com URLs ficticias ou dados mock.

Endpoints principais:
- GET /api/crm/leads — listar leads (query: search, status, temperature)
- GET /api/crm/leads/:id — detalhe do lead
- POST /api/crm/leads — criar lead
- GET /api/crm/personal-tasks — listar tarefas pessoais
- POST /api/crm/personal-tasks — criar tarefa
- GET /api/crm/finance/transactions — listar transacoes
- GET /api/crm/finance/summary — resumo financeiro
- GET /api/crm/notes — listar notas
- GET /api/crm/campaigns — listar campanhas
- GET /api/crm/dashboard/stats — KPIs do CRM
- GET /api/crm/calendar/events — eventos do calendario
- GET /api/crm/templates — templates de mensagem
- POST /api/crm/messages/whatsapp — enviar WhatsApp (requer leadId)
- POST /api/crm/messages/email — enviar email
- GET /api/crm/finance/report — resumo financeiro completo (query: month, year)

#### Evolution API — WhatsApp Direto (/api/evolution)
- POST /api/evolution/send-text — enviar texto direto (body: {number, text}). NAO requer lead.
- POST /api/evolution/send-media — enviar midia (body: {number, mediatype, media, caption?})
- POST /api/evolution/check-numbers — verificar numeros (body: {numbers: [...]})
- GET /api/evolution/connection — estado da conexao
- POST /api/evolution/messages — buscar mensagens (body: {remoteJid, limit?, page?})

Na description de cada step, INCLUA o endpoint exato que o agente deve usar. Exemplo:
"Buscar todos os leads via GET http://localhost:8000/api/crm/leads com header Authorization: Bearer local-dev-token e apresentar os resultados formatados."

Agentes disponiveis (escolha o mais adequado para cada subtarefa):
- general: tarefas gerais, consultas a API, consolidacao de dados
- nodejs-ninja: Node.js, Express, APIs, integracao backend
- python-expert: Python, scripts, automacao, processamento de dados
- javascript-wizard: JavaScript, TypeScript, frontend
- css-master: CSS, estilos, responsivo
- html5-guru: HTML, acessibilidade
- database-expert: SQL, schemas, queries
- devops-engineer: Docker, CI/CD, deploy
- debug-master: debugging, troubleshooting
- code-reviewer: revisao de codigo
- documentation-specialist: documentacao
- security-specialist: seguranca
- api-designer: design de APIs
- performance-optimizer: otimizacao de performance
- data-analyst: analise de dados e metricas

## FERRAMENTAS DISPONIVEIS PARA OS AGENTES
Os agentes tem acesso a TODAS estas ferramentas via tool calling:
- call_crm: Chamada a API do CRM local (endpoints acima)
- fetch_api: Chamada HTTP a qualquer URL externa (GET, POST, PUT, DELETE)
- scrape_website: Raspar conteudo de qualquer site (texto, cores, logo, contato)
- search_kb: Buscar na Knowledge Base local
- read_file / write_file: Ler/escrever arquivos
- execute_node: Executar codigo Node.js
- instagram: Interagir com Instagram (posts, followers, DM, etc)
- chrome: Automacao de browser via Chrome DevTools
- get_credential: Obter credenciais do vault
- pdf_reader: Ler e extrair texto de PDFs (relatorios, contratos, notas fiscais)
- csv_processor: Processar CSV (ler, filtrar, agregar, buscar, transformar)
- scheduler: Agendar tarefas recorrentes com cron (create, list, delete, pause, resume)
- meta_ads: Consultar Meta Ads API (insights, campanhas, adsets, ROAS, spend — credenciais automaticas do vault)
- seo_check: Analisar SEO de uma URL (score, meta tags, headings, images, links, schema, social)
- pagespeed: Google PageSpeed Insights (scores performance/a11y/seo/best-practices + Core Web Vitals)
- google_search: Buscar no Google (resultados organicos). Params: query, num_results (max 30), lang, country. Aceita operadores Google (site:, intitle:, "frase exata"). OBRIGATORIO para pesquisar na web e prospectar.
- maps_search: Buscar negocios no Google Maps por categoria + localizacao. Params: query (tipo), location (cidade). Retorna: nome, endereco, telefone, rating, reviews, website. OBRIGATORIO para prospectar leads locais.
- call_crm: Chamar qualquer endpoint do CRM. Inclui GET /api/crm/finance/report?month=M&year=Y para resumo financeiro COMPLETO (totalRecebido, totalPago, faltaReceber, faltaPagar, breakdown por categoria, top transacoes, metas, investimentos)

## REGRA CRITICA — URLs EXTERNAS
Quando o usuario fornecer uma URL de site, produto, pagina ou qualquer recurso externo:
1. PRIMEIRO crie um step para BUSCAR dados reais da URL usando scrape_website ou fetch_api
2. DEPOIS crie steps que analisem/processem os dados obtidos
3. O step de busca deve ser blockedBy: [] (primeiro a executar)
4. Os steps de analise devem ter blockedBy: ["id-do-step-de-busca"]
Exemplo: Se o usuario pedir "analise o produto https://loja.com/produto-x":
  Step 1: "Buscar dados do produto via scrape_website na URL https://loja.com/produto-x" (agent: general)
  Step 2: "Analisar dados coletados e gerar relatorio" (agent: general, blockedBy: ["1"])

## MAPEAMENTO INTENCAO → FERRAMENTA (OBRIGATORIO para decomposicao)
Quando o usuario pedir algo sobre um site/URL, o step DEVE instruir o agente a usar a ferramenta CORRETA:
| Pedido | Ferramenta | Instrucao no step |
|---|---|---|
| velocidade, speed, pagespeed, performance, nota do site, lighthouse, core web vitals | pagespeed | "Use a ferramenta pagespeed com url=X e strategy=mobile/desktop" |
| SEO, meta tags, headings, otimizacao | seo_check | "Use a ferramenta seo_check com url=X" |
| dados do produto, conteudo da pagina, informacoes do site | scrape_website | "Use scrape_website na URL X" |
| Meta Ads, ROAS, campanhas | meta_ads | "Use meta_ads com action=insights" |
| resumo financeiro, financas, falta pagar, falta receber, situacao financeira | call_crm | "Use call_crm GET /api/crm/finance/report?month=M&year=Y para obter resumo completo" |
| enviar whatsapp, mandar mensagem, whatsapp para | call_crm | "Use call_crm POST /api/crm/messages/whatsapp {leadId, content} se lead existe. Se nao existe ou e teste, use call_crm POST /api/evolution/send-text {number, text}" |
| verificar whatsapp, checar numero | call_crm | "Use call_crm POST /api/evolution/check-numbers {numbers: [...]}" |
| estado conexao whatsapp, status whatsapp | call_crm | "Use call_crm GET /api/evolution/connection" |
| buscar leads, prospectar, encontrar empresas/negocios em cidade | maps_search + google_search | "Use maps_search com query=tipo e location=cidade para encontrar negocios. Complementar com google_search se necessario." |
| pesquisar na web, buscar no google, o que e X | google_search | "Use google_search com query=termos para buscar na web" |
| encontrar [profissionais] em [cidade], listar negocios em [local] | maps_search | "Use maps_search com query=tipo e location=cidade" |
NUNCA instrua o agente a usar execute_node com http.request para medir velocidade — isso mede latencia de rede, NAO performance real do site.
NUNCA diga que o agente nao pode buscar na web — use google_search e maps_search.

## PROTOCOLO ANTI-HALLUCINATION (OBRIGATORIO)
Os agentes NUNCA devem inventar, fabricar ou supor informacoes que nao possuem.

Regras absolutas:
1. Se o usuario pedir dados sobre um produto/site/pessoa/empresa → o agente DEVE buscar via ferramenta (scrape_website, fetch_api, call_crm, search_kb) ANTES de responder
2. Se a ferramenta falhar ou nao retornar dados → o agente DEVE dizer "Nao consegui obter os dados de [X]. [motivo do erro]." NUNCA preencher lacunas com suposicoes
3. Se o agente nao tem informacao suficiente para responder → DEVE dizer "Nao tenho essa informacao disponivel." ao inves de inventar
4. PROIBIDO: inventar precos, especificacoes, descricoes de produtos, dados demograficos, metricas, nomes, numeros ou qualquer dado factual sem fonte
5. PROIBIDO: afirmar como fato algo que e suposicao. Se for inferencia, marcar explicitamente como "Suposicao:" ou "Com base em praticas comuns:"
6. Ao analisar um produto/servico, a description do step DEVE incluir: "PRIMEIRO use scrape_website para buscar dados reais. Se falhar, informe que nao foi possivel obter os dados. NAO invente."

Na description de CADA step, adicione ao final:
"IMPORTANTE: Se nao conseguir obter os dados necessarios, informe claramente o que faltou. NUNCA invente informacoes."

REGRAS GERAIS:
- Crie entre 1 e 8 steps (nao mais que isso). Se a tarefa for simples, 1 step basta.
- Use blockedBy para indicar dependencias entre steps (array de IDs)
- Escolha o agente mais especializado para cada subtarefa
- Steps independentes podem executar em paralelo
- Seja especifico na description de cada step
- Para consultas de dados do CRM, use o agente "general" e inclua o endpoint exato na description
- Para buscar dados de URLs externas, instrua o agente a usar scrape_website ou fetch_api
- NUNCA crie steps que gerem codigo generico quando uma ferramenta pode fornecer os dados
- NUNCA invente dados sobre um produto/site sem primeiro buscar na URL fornecida`;

/**
 * Classe principal do orquestrador
 */
class Orchestrator {
  /**
   * @param {Object} options
   * @param {string} options.apiKey - Chave da API OpenRouter
   * @param {string} options.model - Modelo padrao para o orquestrador
   * @param {Object} options.agentsConfig - Configuracoes dos agentes (require('./agents-config'))
   * @param {Function} options.executeTool - Funcao para executar ferramentas (name, args) => Promise<string>
   * @param {Object} options.credentialVault - Vault de credenciais
   * @param {Function} options.sendEvent - Callback SSE: (event) => void
   */
  constructor({ apiKey, model, agentsConfig, executeTool, credentialVault, sendEvent }) {
    this.apiKey = apiKey;
    this.model = model || 'anthropic/claude-sonnet-4-6';
    this.agentsConfig = agentsConfig || {};
    this.executeTool = executeTool || null;
    this.credentialVault = credentialVault || null;
    this.sendEvent = sendEvent || (() => {});

    // Estado interno
    this.originalInstruction = '';
    this.steps = [];
    this.results = {};
    this.startTime = null;
    this.planId = null;
    this.selfReflectionEnabled = true;
  }

  /**
   * Executa FASE 0-4 completo
   * @param {string} instruction - Instrucao/tarefa a orquestrar
   * @returns {Promise<string>} Relatorio markdown final
   */
  async run(instruction) {
    this.startTime = Date.now();
    console.log('[Orchestrator][run] INICIO', { instruction: instruction.slice(0, 100) });

    try {
      // FASE 0: Ancoragem
      this._phase(0, 'Ancoragem — registrando pedido original');
      this.originalInstruction = instruction;

      // FASE 1: Decomposicao
      this._phase(1, 'Decomposicao — criando plano de execucao');
      const plan = await this.decompose(instruction);
      this.steps = plan.steps || [];

      if (this.steps.length === 0) {
        throw new Error('Orquestrador nao conseguiu criar um plano de execucao');
      }

      // Inicializar status de todas as steps
      for (const step of this.steps) {
        step.status = 'pending';
        step.result = null;
        step.error = null;
      }

      this.sendEvent({ type: 'orchestration_plan', steps: this.steps });
      console.log(`[Orchestrator][run] Plano criado com ${this.steps.length} steps`);

      // Salvar plano para visualizacao no frontend (Agent Planner Visual)
      this.planId = `plan_${Date.now()}`;
      this._savePlan();

      // FASE 2: Execucao
      this._phase(2, `Execucao — ${this.steps.length} subtarefas para executar`);
      await this._executeLoop();

      // FASE 3: Self-Audit
      this._phase(3, 'Self-Audit — verificando requisitos atendidos');
      const auditResult = await this.selfAudit(instruction, this.results);

      // FASE 4: Relatorio
      this._phase(4, 'Relatorio — gerando documento final');
      const report = await this.generateReport(auditResult);

      this.sendEvent({ type: 'orchestration_done', report });
      console.log('[Orchestrator][run] FIM - Sucesso', {
        steps: this.steps.length,
        durationMs: Date.now() - this.startTime
      });

      return report;

    } catch (error) {
      console.error('[Orchestrator][run] ERRO:', error.message);
      console.error('[Orchestrator][run] Stack:', error.stack);
      this.sendEvent({ type: 'orchestration_error', error: error.message });
      throw error;
    }
  }

  /**
   * Emite evento de fase via SSE e loga
   */
  _phase(phase, message) {
    console.log(`[Orchestrator] FASE ${phase}: ${message}`);
    this.sendEvent({ type: 'orchestration_phase', phase, message });
  }

  /**
   * FASE 1: Chama OpenRouter para decompor tarefa em plano JSON
   * @param {string} instruction
   * @returns {Promise<{steps: Array}>}
   */
  async decompose(instruction) {
    console.log('[Orchestrator][decompose] INICIO');

    const messages = [
      { role: 'system', content: DECOMPOSE_SYSTEM_PROMPT },
      { role: 'user', content: `Crie um plano de execucao para esta tarefa:\n\n${instruction}` }
    ];

    try {
      const response = await this._callLLM(messages, {
        model: this.model,
        temperature: 0.3,
        maxTokens: 2048
      });

      console.log('[Orchestrator][decompose] Resposta LLM recebida, parseando JSON...');

      // Extrair JSON da resposta (pode ter markdown ```json ... ```)
      let jsonStr = response.text;

      // Tentar extrair de bloco de codigo markdown
      const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1];
      }

      // Tentar extrair objeto JSON diretamente
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }

      const plan = JSON.parse(jsonStr);

      if (!plan.steps || !Array.isArray(plan.steps)) {
        throw new Error('Plano invalido: campo "steps" ausente ou nao e array');
      }

      // Garantir que cada step tem os campos necessarios
      plan.steps = plan.steps.map((step, idx) => ({
        id: String(step.id || idx + 1),
        name: step.name || `Step ${idx + 1}`,
        agent: step.agent || 'general',
        description: step.description || '',
        blockedBy: Array.isArray(step.blockedBy) ? step.blockedBy.map(String) : [],
        type: step.type || 'implementation'
      }));

      console.log('[Orchestrator][decompose] FIM - Sucesso', { stepsCount: plan.steps.length });
      return plan;

    } catch (error) {
      console.error('[Orchestrator][decompose] ERRO ao parsear plano:', error.message);

      // Fallback: criar um plano simples com um step geral
      console.warn('[Orchestrator][decompose] Usando plano fallback');
      return {
        steps: [{
          id: '1',
          name: 'Executar tarefa',
          agent: 'general',
          description: instruction,
          blockedBy: [],
          type: 'implementation'
        }]
      };
    }
  }

  /**
   * FASE 2: Loop principal de execucao
   * Executa batches de ate 3 agentes em paralelo
   * Detecta quando tasks bloqueadas ficam liberadas
   * Continua ate TODAS as tasks com status="completed"
   */
  async _executeLoop() {
    const MAX_ITERATIONS = 5;
    let iteration = 0;

    while (iteration < MAX_ITERATIONS) {
      iteration++;
      console.log(`[Orchestrator][_executeLoop] Iteracao ${iteration}/${MAX_ITERATIONS}`);

      // Verificar se todas as steps estao concluidas
      const allDone = this.steps.every(s => s.status === 'completed' || s.status === 'failed');
      if (allDone) {
        console.log('[Orchestrator][_executeLoop] Todas as steps concluidas');
        break;
      }

      // Encontrar steps prontos para executar (pending + dependencias satisfeitas)
      const readySteps = this.steps.filter(step => {
        if (step.status !== 'pending') return false;

        // Verificar se todas as dependencias foram completadas
        const allDepsCompleted = step.blockedBy.every(depId => {
          const dep = this.steps.find(s => s.id === depId);
          return dep && dep.status === 'completed';
        });

        return allDepsCompleted;
      });

      if (readySteps.length === 0) {
        // Verificar se ha steps in_progress (aguardar proxima iteracao)
        const inProgress = this.steps.filter(s => s.status === 'in_progress');
        if (inProgress.length > 0) {
          console.log(`[Orchestrator][_executeLoop] ${inProgress.length} steps em progresso, aguardando...`);
          await new Promise(r => setTimeout(r, 100));
          continue;
        }

        // Nao ha mais steps para executar mas nao todas concluidas — impasse
        console.warn('[Orchestrator][_executeLoop] Impasse detectado, verificando steps bloqueadas');

        // Marcar steps bloqueadas como falhas para desbloquear o loop
        const blockedSteps = this.steps.filter(s => s.status === 'pending');
        for (const step of blockedSteps) {
          const failedDep = step.blockedBy.find(depId => {
            const dep = this.steps.find(s => s.id === depId);
            return dep && dep.status === 'failed';
          });

          if (failedDep !== undefined) {
            step.status = 'failed';
            step.error = `Dependencia ${failedDep} falhou`;
            console.warn(`[Orchestrator][_executeLoop] Step ${step.id} marcada como failed por dependencia`);
          }
        }

        // Checar novamente se todas estao concluidas
        const nowAllDone = this.steps.every(s => s.status === 'completed' || s.status === 'failed');
        if (nowAllDone) break;

        // Se nao conseguiu resolver, forcar saida
        console.error('[Orchestrator][_executeLoop] Nao conseguiu resolver impasse, saindo do loop');
        break;
      }

      // Executar batch de ate 3 steps em paralelo
      const batch = readySteps.slice(0, 3);
      console.log(`[Orchestrator][_executeLoop] Executando batch de ${batch.length} steps: ${batch.map(s => s.id).join(', ')}`);

      // Marcar todas como in_progress antes de executar
      for (const step of batch) {
        step.status = 'in_progress';
      }

      // Executar em paralelo
      await Promise.all(batch.map(step => this.executeAgent(step)));
    }

    if (iteration >= MAX_ITERATIONS) {
      console.warn(`[Orchestrator][_executeLoop] Limite maximo de ${MAX_ITERATIONS} iteracoes atingido`);
    }

    // Log do resultado final
    const completed = this.steps.filter(s => s.status === 'completed').length;
    const failed = this.steps.filter(s => s.status === 'failed').length;
    console.log(`[Orchestrator][_executeLoop] FIM - ${completed} completas, ${failed} falhas`);
  }

  /**
   * Executa um step com o system prompt do agente correspondente
   * @param {Object} step - Step a executar
   */
  async executeAgent(step) {
    const agentConfig = this.agentsConfig[step.agent] || this.agentsConfig['general'] || {
      name: step.agent,
      systemPrompt: 'Voce e um assistente especializado. Execute a tarefa com qualidade. API local disponivel em http://localhost:8000 com Auth: Bearer local-dev-token. Use GET /api/crm/leads para leads, GET /api/crm/personal-tasks para tarefas, etc.'
    };

    console.log(`[Orchestrator][executeAgent] INICIO - Step ${step.id} (${step.agent})`, {
      name: step.name,
      model: this.model
    });

    this.sendEvent({
      type: 'agent_started',
      stepId: step.id,
      agent: step.agent,
      name: step.name
    });

    try {
      // Construir contexto com resultados de steps anteriores
      let contextStr = '';
      if (step.blockedBy && step.blockedBy.length > 0) {
        const prevResults = step.blockedBy
          .map(depId => {
            const dep = this.steps.find(s => s.id === depId);
            const result = this.results[depId];
            return dep && result ? `### Resultado do Step ${depId} (${dep.name}):\n${result}` : null;
          })
          .filter(Boolean)
          .join('\n\n');

        if (prevResults) {
          contextStr = `\n\n## Contexto (resultados de steps anteriores):\n${prevResults}\n\n---\n\n`;
        }
      }

      const userPrompt = `${contextStr}## Sua tarefa:\n${step.description}\n\n## Instrucao original do usuario:\n${this.originalInstruction}`;

      const messages = [
        { role: 'system', content: agentConfig.systemPrompt },
        { role: 'user', content: userPrompt }
      ];

      // Carregar tools do chat-tools se executeTool estiver disponivel
      let tools = null;
      if (this.executeTool) {
        try {
          const { TOOLS_DEF } = require('./chat-tools');
          tools = TOOLS_DEF;
        } catch (e) {
          console.warn('[Orchestrator][executeAgent] Nao foi possivel carregar chat-tools:', e.message);
        }
      }

      // Tool calling loop — max 10 iteracoes para evitar loop infinito
      const MAX_TOOL_LOOPS = 40;
      let finalText = '';

      for (let i = 0; i < MAX_TOOL_LOOPS; i++) {
        const response = await this._callLLM(messages, {
          model: this.model,
          temperature: 0.7,
          maxTokens: 4096,
          tools
        });

        // Se nao tem tool_calls, temos a resposta final
        if (!response.toolCalls || response.toolCalls.length === 0) {
          finalText = response.text;
          break;
        }

        // Adicionar a message do assistente (com tool_calls) ao historico
        messages.push(response.message);

        // Executar cada tool call
        for (const tc of response.toolCalls) {
          const fnName = tc.function.name;
          let fnArgs = {};
          try { fnArgs = JSON.parse(tc.function.arguments || '{}'); } catch (_) {}

          console.log(`[Orchestrator][executeAgent] Step ${step.id} tool_call: ${fnName}`, fnArgs);

          this.sendEvent({
            type: 'tool_use',
            stepId: step.id,
            tool: fnName,
            input: fnArgs
          });

          let toolResult = '';
          try {
            toolResult = await this.executeTool(fnName, fnArgs);
          } catch (e) {
            toolResult = `ERRO ao executar ${fnName}: ${e.message}`;
          }

          // Adicionar resultado da tool ao historico
          messages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult)
          });
        }

        // Se estamos na ultima iteracao, forcar resposta sem tools
        if (i === MAX_TOOL_LOOPS - 1) {
          const finalResponse = await this._callLLM(messages, {
            model: this.model,
            temperature: 0.7,
            maxTokens: 4096
          });
          finalText = finalResponse.text;
        }
      }

      // Self-Reflection Loop: agente critica sua propria saida
      let reflectedText = finalText;
      if (this.selfReflectionEnabled && finalText.length > 50) {
        try {
          reflectedText = await this._selfReflect(step, finalText);
        } catch (e) {
          console.warn(`[Orchestrator][selfReflect] Step ${step.id} - reflection falhou:`, e.message);
        }
      }

      step.status = 'completed';
      step.result = reflectedText;
      step.reflected = reflectedText !== finalText;
      this.results[step.id] = reflectedText;

      console.log(`[Orchestrator][executeAgent] FIM - Step ${step.id} concluido`, {
        resultLength: reflectedText.length,
        reflected: step.reflected
      });

      this.sendEvent({
        type: 'agent_completed',
        stepId: step.id,
        agent: step.agent,
        name: step.name,
        result: reflectedText.slice(0, 500),
        reflected: step.reflected
      });

      // Atualizar plano salvo
      this._savePlan();

    } catch (error) {
      step.status = 'failed';
      step.error = error.message;
      this.results[step.id] = `ERRO: ${error.message}`;

      console.error(`[Orchestrator][executeAgent] ERRO - Step ${step.id}:`, error.message);

      this.sendEvent({
        type: 'agent_failed',
        stepId: step.id,
        agent: step.agent,
        error: error.message
      });
    }
  }

  /**
   * FASE 3: Self-Audit — verifica se os requisitos foram atendidos
   * @param {string} instruction - Instrucao original
   * @param {Object} results - Resultados das steps
   * @returns {Promise<Object>} Resultado da auditoria
   */
  async selfAudit(instruction, results) {
    console.log('[Orchestrator][selfAudit] INICIO');

    const completedSteps = this.steps.filter(s => s.status === 'completed');
    const failedSteps = this.steps.filter(s => s.status === 'failed');

    // Preparar resumo dos resultados para o audit
    const resultsStr = completedSteps
      .map(s => `### Step ${s.id}: ${s.name}\n${(results[s.id] || '').slice(0, 800)}`)
      .join('\n\n');

    const auditPrompt = `Verifique se a tarefa original foi completamente atendida pelos agentes.

## Tarefa Original:
${instruction}

## Steps Executadas (${completedSteps.length} completas, ${failedSteps.length} falhas):
${resultsStr}

## Responda com um JSON:
{
  "allRequirementsMet": true/false,
  "requirements": [
    { "requirement": "descricao do requisito", "status": "atendido|parcial|nao_atendido", "evidence": "..." }
  ],
  "missingItems": ["item 1", "item 2"],
  "overallQuality": "excelente|bom|regular|insatisfatorio",
  "summary": "resumo de 1-3 frases"
}`;

    try {
      const response = await this._callLLM([
        { role: 'user', content: auditPrompt }
      ], {
        model: this.model,
        temperature: 0.3,
        maxTokens: 1024
      });

      // Tentar parsear JSON da resposta
      let jsonStr = response.text;
      const codeMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeMatch) jsonStr = codeMatch[1];
      const objMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (objMatch) jsonStr = objMatch[0];

      const audit = JSON.parse(jsonStr);
      console.log('[Orchestrator][selfAudit] FIM - Sucesso', {
        allMet: audit.allRequirementsMet,
        quality: audit.overallQuality
      });

      return audit;

    } catch (error) {
      console.error('[Orchestrator][selfAudit] ERRO ao parsear audit:', error.message);

      // Retornar audit basico baseado nos resultados
      return {
        allRequirementsMet: failedSteps.length === 0,
        requirements: completedSteps.map(s => ({
          requirement: s.name,
          status: 'atendido',
          evidence: `Step ${s.id} concluida com sucesso`
        })),
        missingItems: failedSteps.map(s => `${s.name}: ${s.error}`),
        overallQuality: failedSteps.length === 0 ? 'bom' : 'regular',
        summary: `${completedSteps.length} de ${this.steps.length} steps concluidas com sucesso.`
      };
    }
  }

  /**
   * FASE 4: Gera relatorio markdown final
   * @param {Object} auditResult - Resultado da auditoria
   * @returns {Promise<string>} Relatorio em markdown
   */
  async generateReport(auditResult) {
    console.log('[Orchestrator][generateReport] INICIO');

    const durationSec = ((Date.now() - this.startTime) / 1000).toFixed(1);
    const completedSteps = this.steps.filter(s => s.status === 'completed');
    const failedSteps = this.steps.filter(s => s.status === 'failed');
    const audit = auditResult || {};

    // Cabecalho do relatorio
    let report = `# Relatorio de Orquestracao

**Tarefa:** ${this.originalInstruction.slice(0, 200)}${this.originalInstruction.length > 200 ? '...' : ''}
**Duracao:** ${durationSec}s
**Steps:** ${completedSteps.length}/${this.steps.length} concluidas
**Qualidade:** ${audit.overallQuality || 'n/a'}

---

## Resumo

${audit.summary || 'Orquestracao concluida.'}

`;

    // Status das steps
    report += `## Steps Executadas\n\n`;
    for (const step of this.steps) {
      const statusIcon = step.status === 'completed' ? 'OK' : step.status === 'failed' ? 'ERRO' : 'PENDENTE';
      report += `- [${statusIcon}] **Step ${step.id}** — ${step.name} _(agente: ${step.agent})_\n`;
      if (step.status === 'failed' && step.error) {
        report += `  - Erro: ${step.error}\n`;
      }
    }

    report += '\n---\n\n';

    // Requisitos verificados
    if (audit.requirements && audit.requirements.length > 0) {
      report += `## Verificacao de Requisitos\n\n`;
      for (const req of audit.requirements) {
        const icon = req.status === 'atendido' ? 'ATENDIDO' : req.status === 'parcial' ? 'PARCIAL' : 'NAO ATENDIDO';
        report += `- [${icon}] ${req.requirement}\n`;
        if (req.evidence) {
          report += `  - ${req.evidence}\n`;
        }
      }
      report += '\n';
    }

    // Itens faltantes
    if (audit.missingItems && audit.missingItems.length > 0) {
      report += `## Itens Pendentes\n\n`;
      for (const item of audit.missingItems) {
        report += `- ${item}\n`;
      }
      report += '\n';
    }

    // Resultados detalhados de cada step
    report += '---\n\n## Resultados Detalhados\n\n';

    for (const step of completedSteps) {
      const result = this.results[step.id] || '';
      report += `### Step ${step.id}: ${step.name}\n\n`;
      report += `**Agente:** ${step.agent}\n\n`;
      report += result + '\n\n---\n\n';
    }

    if (failedSteps.length > 0) {
      report += '## Steps com Erro\n\n';
      for (const step of failedSteps) {
        report += `### Step ${step.id}: ${step.name}\n\n`;
        report += `**Erro:** ${step.error || 'Erro desconhecido'}\n\n`;
      }
    }

    console.log('[Orchestrator][generateReport] FIM - Relatorio gerado', { length: report.length });
    return report;
  }

  /**
   * Self-Reflection Loop — Agente critica sua propria saida
   * Se qualidade < threshold, gera versao melhorada
   * @param {Object} step - Step executada
   * @param {string} output - Saida original do agente
   * @returns {Promise<string>} Saida original ou melhorada
   */
  async _selfReflect(step, output) {
    console.log(`[Orchestrator][_selfReflect] Avaliando step ${step.id}...`);

    const reflectPrompt = `Voce e um revisor critico. Avalie a qualidade desta resposta de um agente.

## Tarefa original do agente:
${step.description}

## Resposta do agente:
${output.slice(0, 3000)}

## Avalie e responda com JSON:
{
  "quality": 1-10,
  "issues": ["problema 1", "problema 2"],
  "suggestion": "como melhorar (ou null se ok)",
  "needsRevision": true/false
}`;

    const evalResponse = await this._callLLM([
      { role: 'user', content: reflectPrompt }
    ], { model: this.model, temperature: 0.3, maxTokens: 512 });

    let evaluation;
    try {
      let jsonStr = evalResponse.text;
      const objMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (objMatch) jsonStr = objMatch[0];
      evaluation = JSON.parse(jsonStr);
    } catch {
      return output; // Se nao conseguiu parsear, manter original
    }

    step.reflection = evaluation;
    this.sendEvent({ type: 'self_reflection', stepId: step.id, evaluation });

    // Se qualidade >= 7 ou nao precisa revisao, manter original
    if (!evaluation.needsRevision || evaluation.quality >= 7) {
      console.log(`[Orchestrator][_selfReflect] Step ${step.id} OK (quality: ${evaluation.quality})`);
      return output;
    }

    // Qualidade baixa: pedir revisao
    console.log(`[Orchestrator][_selfReflect] Step ${step.id} precisa revisao (quality: ${evaluation.quality})`);

    const revisionPrompt = `Sua resposta anterior tinha problemas:
${evaluation.issues.join('\n- ')}

Sugestao de melhoria: ${evaluation.suggestion}

Tarefa original: ${step.description}

Sua resposta original:
${output.slice(0, 2000)}

Reescreva uma versao MELHORADA, corrigindo os problemas identificados.`;

    const revised = await this._callLLM([
      { role: 'user', content: revisionPrompt }
    ], { model: this.model, temperature: 0.5, maxTokens: 4096 });

    console.log(`[Orchestrator][_selfReflect] Step ${step.id} revisada com sucesso`);
    return revised.text || output;
  }

  /**
   * Salva o estado atual do plano para visualizacao no frontend
   */
  _savePlan() {
    if (!this.planId) return;
    try {
      const plan = {
        id: this.planId,
        instruction: this.originalInstruction?.slice(0, 500),
        steps: this.steps.map(s => ({
          id: s.id,
          name: s.name,
          agent: s.agent,
          description: s.description?.slice(0, 300),
          blockedBy: s.blockedBy,
          status: s.status,
          error: s.error || null,
          reflected: s.reflected || false,
          reflection: s.reflection || null
        })),
        status: this.steps.every(s => s.status === 'completed') ? 'completed'
          : this.steps.some(s => s.status === 'failed') ? 'partial'
          : this.steps.some(s => s.status === 'in_progress') ? 'running'
          : 'planned',
        createdAt: this.startTime ? new Date(this.startTime).toISOString() : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      fs.writeFileSync(path.join(PLANS_DIR, `${this.planId}.json`), JSON.stringify(plan, null, 2));
    } catch (e) {
      console.warn('[Orchestrator][_savePlan] Erro ao salvar plano:', e.message);
    }
  }

  /**
   * Lista todos os planos salvos (para API)
   * @param {number} limit
   * @returns {Array}
   */
  static listPlans(limit = 30) {
    try {
      if (!fs.existsSync(PLANS_DIR)) return [];
      return fs.readdirSync(PLANS_DIR)
        .filter(f => f.startsWith('plan_') && f.endsWith('.json'))
        .sort().reverse().slice(0, limit)
        .map(f => {
          try { return JSON.parse(fs.readFileSync(path.join(PLANS_DIR, f), 'utf-8')); }
          catch { return null; }
        }).filter(Boolean);
    } catch { return []; }
  }

  /**
   * Retorna um plano por ID
   * @param {string} planId
   * @returns {Object|null}
   */
  static getPlan(planId) {
    try {
      const filePath = path.join(PLANS_DIR, `${planId}.json`);
      if (!fs.existsSync(filePath)) return null;
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch { return null; }
  }

  /**
   * Faz uma chamada ao LLM via OpenRouter
   * @param {Array} messages - Array de mensagens [{role, content}]
   * @param {Object} options - Opcoes da chamada
   * @returns {Promise<{text: string}>}
   */
  _callLLM(messages, options = {}) {
    const model = options.model || this.model;
    const maxTokens = options.maxTokens || 4096;
    const temperature = options.temperature !== undefined ? options.temperature : 0.7;

    return new Promise((resolve, reject) => {
      let apiKey = this.apiKey;

      // Tentar obter API key do vault se nao fornecida
      if (!apiKey && this.credentialVault) {
        try {
          const envVars = this.credentialVault.getEnvVars ? this.credentialVault.getEnvVars() : {};
          apiKey = envVars['OPENROUTER_API_KEY'];
        } catch (e) {
          console.warn('[Orchestrator][_callLLM] Erro ao obter key do vault:', e.message);
        }
      }

      if (!apiKey) {
        return reject(new Error('OPENROUTER_API_KEY nao configurada. Use o vault ou defina a variavel de ambiente.'));
      }

      const payload = {
        model,
        messages,
        stream: false,
        max_tokens: maxTokens,
        temperature,
        provider: {
          sort: 'price',
          allow_fallbacks: true
        }
      };
      if (options.tools && options.tools.length > 0) {
        payload.tools = options.tools;
      }
      const body = JSON.stringify(payload);

      const headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': APP_REFERER,
        'X-Title': APP_TITLE,
        'Content-Length': Buffer.byteLength(body, 'utf8')
      };

      const reqOptions = {
        hostname: OPENROUTER_HOST,
        path: OPENROUTER_PATH,
        method: 'POST',
        headers
      };

      let responseBody = '';

      const req = https.request(reqOptions, (res) => {
        res.setEncoding('utf8');
        res.on('data', (d) => { responseBody += d; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(responseBody);
            if (res.statusCode !== 200) {
              return reject(new Error(`OpenRouter API retornou ${res.statusCode}: ${responseBody.slice(0, 500)}`));
            }
            const msg = parsed.choices && parsed.choices[0] ? parsed.choices[0].message : {};
            const content = msg.content || '';
            const reasoning = msg.reasoning || '';
            const text = content || (reasoning ? reasoning : '');
            const toolCalls = msg.tool_calls || null;
            resolve({
              text,
              toolCalls,
              message: msg,
              model: parsed.model || model,
              usage: parsed.usage || {}
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
}

module.exports = { Orchestrator };
