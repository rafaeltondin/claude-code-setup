"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analisarTagsLead = analisarTagsLead;
exports.analisarTagsTodos = analisarTagsTodos;
const database_1 = require("../../config/database");
const errors_1 = require("../../utils/errors");
const logger_1 = require("../../utils/logger");
const KEYWORD_RULES = [
    {
        keywords: [
            'quanto custa', 'proposta', 'orçamento', 'contratar', 'preço', 'valor',
            'quero comprar', 'quero contratar', 'me interessa', 'fechado', 'vamos fechar',
        ],
        score: 3,
        label: 'interesse-alto',
    },
    {
        keywords: [
            'mais informações', 'mais informacoes', 'como funciona', 'gostaria de saber',
            'interessante', 'me conta mais', 'pode me explicar', 'quero saber mais',
            'tem disponível', 'tem disponivel',
        ],
        score: 2,
        label: 'interesse-medio',
    },
    {
        keywords: [
            'obrigado', 'entendi', 'vou pensar', 'deixa eu ver', 'vou analisar',
            'tá bom', 'ok', 'certo', 'blz',
        ],
        score: 1,
        label: 'interesse-baixo',
    },
    {
        keywords: [
            'não tenho interesse', 'nao tenho interesse', 'não preciso', 'nao preciso',
            'cancela', 'cancelar', 'não quero', 'nao quero', 'remova', 'me remove',
            'para de mandar', 'chega', 'não me contate', 'nao me contate',
        ],
        score: -2,
        label: 'negativo',
    },
];
// ---------------------------------------------------------------------------
// Calcular score NLP de um texto
// ---------------------------------------------------------------------------
function calcularScoreTexto(texto) {
    const textoLower = texto.toLowerCase();
    let score = 0;
    const matchedLabels = [];
    for (const rule of KEYWORD_RULES) {
        for (const keyword of rule.keywords) {
            if (textoLower.includes(keyword)) {
                score += rule.score;
                if (!matchedLabels.includes(rule.label)) {
                    matchedLabels.push(rule.label);
                }
                break; // Contabilizar cada regra no máximo uma vez por texto
            }
        }
    }
    return { score, matchedLabels };
}
// ---------------------------------------------------------------------------
// Determinar temperatura a partir do score
// ---------------------------------------------------------------------------
function determinarTemperatura(score) {
    // Score negativo (keywords negativas como "cancela", "não quero") → cold
    // Score 0-1 (sem interação ou interesse baixo) → cold
    // Score 2-4 (interesse médio) → warm
    // Score 5+ (interesse alto, pediu proposta) → hot
    if (score >= 5)
        return 'hot';
    if (score >= 2)
        return 'warm';
    return 'cold';
}
// ---------------------------------------------------------------------------
// Determinar tags a partir do score e das labels encontradas
// ---------------------------------------------------------------------------
function determinarTags(score, matchedLabels) {
    const tags = [];
    if (score < 0 || matchedLabels.includes('negativo')) {
        tags.push('negativo');
    }
    else if (score >= 5 || matchedLabels.includes('interesse-alto')) {
        tags.push('interesse-alto');
    }
    else if (score >= 2 || matchedLabels.includes('interesse-medio')) {
        tags.push('interesse-medio');
    }
    else if (score > 0) {
        tags.push('interesse-baixo');
    }
    else {
        tags.push('sem-interacao');
    }
    return tags;
}
async function analisarTagsLead(leadId) {
    const requestId = `atl_${Date.now()}`;
    logger_1.logger.info('[tags.service.analisarTagsLead] INÍCIO', { requestId, leadId });
    // Buscar lead com mensagens inbound e notas
    logger_1.logger.debug('[tags.service.analisarTagsLead] Buscando lead com mensagens...', { requestId, leadId });
    const lead = await database_1.prisma.lead.findUnique({
        where: { id: leadId },
        include: {
            messages: {
                where: { direction: 'inbound' },
                select: { content: true, createdAt: true },
                orderBy: { createdAt: 'desc' },
            },
            activities: {
                where: { type: 'note_added' },
                select: { details: true, createdAt: true },
                orderBy: { createdAt: 'desc' },
            },
        },
    });
    if (!lead) {
        logger_1.logger.warn('[tags.service.analisarTagsLead] Lead não encontrado', { requestId, leadId });
        throw new errors_1.AppError(404, 'Lead não encontrado', 'LEAD_NOT_FOUND');
    }
    logger_1.logger.debug('[tags.service.analisarTagsLead] Lead encontrado', {
        requestId,
        leadId,
        leadName: lead.name,
        mensagensInbound: lead.messages.length,
        notas: lead.activities.length,
    });
    // Coletar todos os textos para análise
    const textos = [];
    // Mensagens inbound do lead
    for (const msg of lead.messages) {
        if (msg.content && msg.content.trim().length > 0) {
            textos.push(msg.content);
        }
    }
    // Conteúdo das notas (extraído do JSON de details)
    for (const activity of lead.activities) {
        try {
            const detalhes = JSON.parse(activity.details);
            if (detalhes.content && detalhes.content.trim().length > 0) {
                textos.push(detalhes.content);
            }
        }
        catch {
            logger_1.logger.debug('[tags.service.analisarTagsLead] Erro ao parsear details de activity', {
                requestId,
                leadId,
            });
        }
    }
    logger_1.logger.debug('[tags.service.analisarTagsLead] Textos coletados para análise', {
        requestId,
        leadId,
        totalTextos: textos.length,
    });
    // Calcular score total somando todos os textos
    let scoreTotal = 0;
    const todasLabels = [];
    for (const texto of textos) {
        const { score, matchedLabels } = calcularScoreTexto(texto);
        scoreTotal += score;
        for (const label of matchedLabels) {
            if (!todasLabels.includes(label)) {
                todasLabels.push(label);
            }
        }
    }
    logger_1.logger.info('[tags.service.analisarTagsLead] Score calculado', {
        requestId,
        leadId,
        scoreTotal,
        matchedLabels: todasLabels,
        textosSemMensagens: textos.length === 0,
    });
    // Determinar novas tags e temperatura
    const novaTemperatura = determinarTemperatura(scoreTotal);
    const novasTags = determinarTags(scoreTotal, todasLabels);
    logger_1.logger.debug('[tags.service.analisarTagsLead] Nova temperatura e tags determinadas', {
        requestId,
        leadId,
        novaTemperatura,
        novasTags,
    });
    // Tags atuais do lead (JSON array string)
    let tagsAtuais = [];
    try {
        tagsAtuais = JSON.parse(lead.tags);
        if (!Array.isArray(tagsAtuais))
            tagsAtuais = [];
    }
    catch {
        tagsAtuais = [];
    }
    // Mesclar tags novas com as existentes (manter as que não são de análise NLP)
    const tagsPermanentes = tagsAtuais.filter((t) => !['interesse-alto', 'interesse-medio', 'interesse-baixo', 'sem-interacao', 'negativo'].includes(t));
    const tagsMescladas = [...new Set([...tagsPermanentes, ...novasTags])];
    // Verificar se algo mudou
    const temperaturaAntes = lead.temperature;
    const tagsAntes = tagsAtuais;
    const temperaturaAlterou = novaTemperatura !== temperaturaAntes;
    const tagsAlteraram = JSON.stringify([...tagsAntes].sort()) !== JSON.stringify([...tagsMescladas].sort());
    const alterado = temperaturaAlterou || tagsAlteraram;
    logger_1.logger.debug('[tags.service.analisarTagsLead] Verificação de mudanças', {
        requestId,
        leadId,
        temperaturaAlterou,
        tagsAlteraram,
        temperaturaAntes,
        novaTemperatura,
        tagsAntes,
        tagsMescladas,
    });
    if (alterado) {
        logger_1.logger.info('[tags.service.analisarTagsLead] Atualizando lead com novos dados...', {
            requestId,
            leadId,
            temperaturaAlterou,
            tagsAlteraram,
        });
        await database_1.prisma.lead.update({
            where: { id: leadId },
            data: {
                temperature: novaTemperatura,
                tags: JSON.stringify(tagsMescladas),
            },
        });
        logger_1.logger.info('[tags.service.analisarTagsLead] Lead atualizado', { requestId, leadId });
    }
    // BUG 15 FIX: Criar activity NLP apenas quando houve mudança real (alterado === true)
    if (alterado) {
        logger_1.logger.debug('[tags.service.analisarTagsLead] Criando activity de análise NLP (houve mudança)...', {
            requestId,
            leadId,
        });
        await database_1.prisma.activity.create({
            data: {
                leadId,
                type: 'nlp_analysis',
                details: JSON.stringify({
                    score: scoreTotal,
                    matchedLabels: todasLabels,
                    tagsAntes,
                    tagsDepois: tagsMescladas,
                    temperaturaAntes,
                    temperaturaDepois: novaTemperatura,
                    totalTextosAnalisados: textos.length,
                    alterado,
                    analisadoEm: new Date().toISOString(),
                }),
            },
        });
    }
    else {
        logger_1.logger.debug('[tags.service.analisarTagsLead] Sem mudanças — activity NLP não criada', {
            requestId,
            leadId,
        });
    }
    logger_1.logger.info('[tags.service.analisarTagsLead] FIM - Análise concluída', {
        requestId,
        leadId,
        scoreTotal,
        novaTemperatura,
        novasTags,
        alterado,
    });
    return {
        leadId,
        leadName: lead.name,
        score: scoreTotal,
        matchedLabels: todasLabels,
        tagsAntes,
        tagsDepois: tagsMescladas,
        temperaturaAntes,
        temperaturaDepois: novaTemperatura,
        alterado,
    };
}
async function analisarTagsTodos() {
    const requestId = `att_${Date.now()}`;
    logger_1.logger.info('[tags.service.analisarTagsTodos] INÍCIO', { requestId });
    const BATCH_SIZE = 50;
    let skip = 0;
    const resultados = [];
    let analisados = 0;
    let alterados = 0;
    let erros = 0;
    let totalLeads = 0;
    // Contar total primeiro para evitar carregar todos na memória
    totalLeads = await database_1.prisma.lead.count();
    logger_1.logger.info('[tags.service.analisarTagsTodos] Total de leads', { requestId, total: totalLeads });
    while (skip < totalLeads) {
        const leads = await database_1.prisma.lead.findMany({
            select: { id: true, name: true },
            orderBy: { createdAt: 'asc' },
            skip,
            take: BATCH_SIZE,
        });
        if (leads.length === 0)
            break;
        for (const lead of leads) {
            try {
                const resultado = await analisarTagsLead(lead.id);
                resultados.push(resultado);
                analisados++;
                if (resultado.alterado)
                    alterados++;
            }
            catch (error) {
                const err = error;
                logger_1.logger.error('[tags.service.analisarTagsTodos] Erro ao analisar lead', {
                    requestId, leadId: lead.id, leadName: lead.name,
                    errorType: err.constructor.name, errorMessage: err.message,
                });
                erros++;
            }
        }
        skip += BATCH_SIZE;
        logger_1.logger.debug('[tags.service.analisarTagsTodos] Batch processado', {
            requestId, skip, totalLeads, analisados, erros,
        });
    }
    logger_1.logger.info('[tags.service.analisarTagsTodos] FIM', {
        requestId, total: totalLeads, analisados, alterados, erros,
    });
    return { total: totalLeads, analisados, alterados, erros, resultados };
}
//# sourceMappingURL=tags.service.js.map