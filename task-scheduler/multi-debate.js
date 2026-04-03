/**
 * MULTI-DEBATE — Sistema de Multi-Agente com Debate
 *
 * Para decisoes criticas, dispara 2-3 agentes com perspectivas diferentes
 * simultaneamente. Cada um gera sua proposta, depois um "juiz" sintetiza
 * a melhor solucao.
 *
 * Perspectivas: otimista, conservador, critico, inovador, pragmatico
 */

const https = require('https');

const OPENROUTER_HOST = 'openrouter.ai';
const OPENROUTER_PATH = '/api/v1/chat/completions';

const PERSPECTIVES = {
  otimista: {
    name: 'Otimista',
    emoji: '🌟',
    systemPrompt: `Voce e um analista OTIMISTA. Foque nos pontos positivos, oportunidades e potencial de crescimento. Seja entusiasmado mas fundamentado em dados. Sempre sugira o caminho mais ambicioso viavel.`
  },
  conservador: {
    name: 'Conservador',
    emoji: '🛡️',
    systemPrompt: `Voce e um analista CONSERVADOR. Foque nos riscos, custos, e no que pode dar errado. Prefira abordagens testadas e seguras. Sempre considere o pior cenario e sugira mitigacoes.`
  },
  critico: {
    name: 'Critico',
    emoji: '🔍',
    systemPrompt: `Voce e um CRITICO rigido. Questione premissas, identifique falhas logicas, aponte fraquezas. Nao aceite nada sem evidencia. Seu papel e encontrar problemas que os outros nao veem.`
  },
  inovador: {
    name: 'Inovador',
    emoji: '💡',
    systemPrompt: `Voce e um pensador INOVADOR. Proponha solucoes criativas e nao-convencionais. Pense fora da caixa. Sugira abordagens que ninguem mais pensaria. Use analogias de outras industrias.`
  },
  pragmatico: {
    name: 'Pragmatico',
    emoji: '⚙️',
    systemPrompt: `Voce e um analista PRAGMATICO. Foque no que e implementavel AGORA com os recursos disponiveis. Prefira 80% feito hoje a 100% feito nunca. Sugira o caminho mais rapido para resultado.`
  }
};

const JUDGE_SYSTEM_PROMPT = `Voce e o JUIZ de um debate entre especialistas com diferentes perspectivas.

Analise TODAS as propostas apresentadas e sintetize a MELHOR solucao, combinando os pontos fortes de cada perspectiva.

Responda com JSON:
{
  "synthesis": "Solucao sintetizada detalhada",
  "reasoning": "Por que esta e a melhor abordagem",
  "keyPoints": ["ponto 1", "ponto 2", "ponto 3"],
  "risks": ["risco 1 mitigado de X forma"],
  "actionPlan": ["acao 1", "acao 2", "acao 3"],
  "winner": "perspectiva que mais contribuiu",
  "agreementLevel": "alto|medio|baixo"
}`;

class MultiDebate {
  constructor({ apiKey, model, credentialVault } = {}) {
    this.apiKey = apiKey;
    this.model = model || 'anthropic/claude-sonnet-4-6';
    this.credentialVault = credentialVault || null;
    this.debates = new Map();
  }

  /**
   * Inicia um debate multi-agente
   * @param {string} topic - Topico/questao a debater
   * @param {string[]} perspectives - Array de nomes de perspectivas (default: 3)
   * @param {Object} context - Contexto adicional (dados, restricoes)
   * @returns {Promise<Object>} Resultado do debate com sintese
   */
  async debate(topic, perspectives = ['otimista', 'conservador', 'critico'], context = {}) {
    const debateId = `debate_${Date.now()}`;
    const startTime = Date.now();

    console.log(`[MultiDebate] Iniciando debate ${debateId} com ${perspectives.length} perspectivas`);

    const debateState = {
      id: debateId,
      topic,
      perspectives: perspectives,
      status: 'running',
      startedAt: new Date().toISOString(),
      proposals: [],
      synthesis: null
    };
    this.debates.set(debateId, debateState);

    // Fase 1: Coletar propostas de cada agente em paralelo
    const proposalPromises = perspectives.map(async (perspName) => {
      const persp = PERSPECTIVES[perspName];
      if (!persp) return { perspective: perspName, error: 'Perspectiva desconhecida' };

      const userPrompt = this._buildUserPrompt(topic, context);

      try {
        const response = await this._callLLM([
          { role: 'system', content: persp.systemPrompt },
          { role: 'user', content: userPrompt }
        ]);

        return {
          perspective: perspName,
          name: persp.name,
          emoji: persp.emoji,
          proposal: response,
          status: 'completed'
        };
      } catch (error) {
        return {
          perspective: perspName,
          name: persp.name,
          emoji: persp.emoji,
          proposal: null,
          error: error.message,
          status: 'failed'
        };
      }
    });

    const proposals = await Promise.all(proposalPromises);
    debateState.proposals = proposals;

    // Fase 2: Juiz sintetiza as propostas
    const completedProposals = proposals.filter(p => p.status === 'completed');

    if (completedProposals.length === 0) {
      debateState.status = 'failed';
      debateState.error = 'Nenhuma proposta gerada com sucesso';
      return debateState;
    }

    const judgePrompt = this._buildJudgePrompt(topic, completedProposals, context);

    try {
      const judgeResponse = await this._callLLM([
        { role: 'system', content: JUDGE_SYSTEM_PROMPT },
        { role: 'user', content: judgePrompt }
      ]);

      // Parsear JSON
      let jsonStr = judgeResponse;
      const codeMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeMatch) jsonStr = codeMatch[1];
      const objMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (objMatch) jsonStr = objMatch[0];

      debateState.synthesis = JSON.parse(jsonStr);
    } catch (error) {
      // Fallback: usar o texto como sintese
      debateState.synthesis = {
        synthesis: 'Erro ao parsear sintese. Veja as propostas individuais.',
        reasoning: error.message,
        keyPoints: completedProposals.map(p => `${p.name}: proposta gerada`),
        risks: [],
        actionPlan: [],
        winner: completedProposals[0]?.perspective || 'n/a',
        agreementLevel: 'baixo'
      };
    }

    debateState.status = 'completed';
    debateState.completedAt = new Date().toISOString();
    debateState.durationMs = Date.now() - startTime;

    console.log(`[MultiDebate] Debate ${debateId} concluido em ${debateState.durationMs}ms`);
    return debateState;
  }

  /**
   * Retorna todos os debates
   */
  getDebates() {
    return Array.from(this.debates.values());
  }

  getDebate(debateId) {
    return this.debates.get(debateId) || null;
  }

  /**
   * Perspectivas disponiveis
   */
  static getPerspectives() {
    return Object.entries(PERSPECTIVES).map(([key, val]) => ({
      id: key, name: val.name, emoji: val.emoji
    }));
  }

  _buildUserPrompt(topic, context) {
    let prompt = `## Topico para analise:\n${topic}\n`;
    if (context.data) prompt += `\n## Dados disponiveis:\n${context.data}\n`;
    if (context.constraints) prompt += `\n## Restricoes:\n${context.constraints}\n`;
    if (context.budget) prompt += `\n## Orcamento: ${context.budget}\n`;
    if (context.deadline) prompt += `\n## Prazo: ${context.deadline}\n`;
    prompt += `\nApresente sua analise e proposta detalhada (3-5 paragrafos).`;
    return prompt;
  }

  _buildJudgePrompt(topic, proposals, context) {
    let prompt = `## Topico original:\n${topic}\n\n## Propostas dos especialistas:\n\n`;
    for (const p of proposals) {
      prompt += `### ${p.emoji} ${p.name} (${p.perspective}):\n${p.proposal}\n\n---\n\n`;
    }
    if (context.constraints) prompt += `\n## Restricoes a considerar:\n${context.constraints}\n`;
    prompt += `\nSintetize a melhor solucao combinando os pontos fortes de cada perspectiva.`;
    return prompt;
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
        temperature: 0.7
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

module.exports = { MultiDebate, PERSPECTIVES };
