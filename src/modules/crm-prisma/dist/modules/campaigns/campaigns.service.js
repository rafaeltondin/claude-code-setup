"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listCampaigns = listCampaigns;
exports.getCampaign = getCampaign;
exports.createCampaign = createCampaign;
exports.updateCampaign = updateCampaign;
exports.addSteps = addSteps;
exports.addLeads = addLeads;
exports.startCampaign = startCampaign;
exports.pauseCampaign = pauseCampaign;
exports.getCampaignStats = getCampaignStats;
exports.deleteCampaign = deleteCampaign;
exports.listCampaignLeads = listCampaignLeads;
exports.removeCampaignLead = removeCampaignLead;
exports.duplicateCampaign = duplicateCampaign;
const database_1 = require("../../config/database");
const logger_1 = require("../../utils/logger");
const errors_1 = require("../../utils/errors");
const queue_1 = require("../../jobs/queue");
// ---------------------------------------------------------------------------
// Campanhas Service
// ---------------------------------------------------------------------------
/**
 * Lista campanhas com paginação e filtro opcional por status.
 */
async function listCampaigns(params) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const { status } = params;
    const skip = (page - 1) * limit;
    const where = status ? { status } : {};
    logger_1.logger.info('[campaigns.service.listCampaigns] INÍCIO', { page, limit, status });
    const [campanhas, total] = await Promise.all([
        database_1.prisma.campaign.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: {
                        steps: true,
                        leads: true,
                        messages: true,
                    },
                },
            },
        }),
        database_1.prisma.campaign.count({ where }),
    ]);
    const totalPages = Math.ceil(total / limit);
    logger_1.logger.info('[campaigns.service.listCampaigns] FIM', {
        total,
        retornados: campanhas.length,
        page,
        totalPages,
    });
    return {
        data: campanhas,
        pagination: { page, limit, total, totalPages },
    };
}
/**
 * Retorna uma campanha com seus steps e contagens de leads/mensagens.
 */
async function getCampaign(id) {
    logger_1.logger.info('[campaigns.service.getCampaign] INÍCIO', { id });
    const campanha = await database_1.prisma.campaign.findUnique({
        where: { id },
        include: {
            steps: {
                orderBy: { order: 'asc' },
            },
            _count: {
                select: {
                    leads: true,
                    messages: true,
                },
            },
        },
    });
    if (!campanha) {
        logger_1.logger.warn('[campaigns.service.getCampaign] Campanha não encontrada', { id });
        throw new errors_1.AppError(404, 'Campanha não encontrada', 'CAMPAIGN_NOT_FOUND');
    }
    logger_1.logger.info('[campaigns.service.getCampaign] FIM', {
        id,
        nome: campanha.name,
        totalSteps: campanha.steps.length,
    });
    return campanha;
}
/**
 * Cria uma nova campanha.
 */
async function createCampaign(data) {
    logger_1.logger.info('[campaigns.service.createCampaign] INÍCIO', {
        nome: data.name,
        channel: data.channel,
    });
    const campanha = await database_1.prisma.campaign.create({
        data: {
            name: data.name,
            description: data.description ?? null,
            channel: data.channel,
            status: 'draft',
        },
    });
    logger_1.logger.info('[campaigns.service.createCampaign] FIM - Campanha criada', {
        id: campanha.id,
        nome: campanha.name,
    });
    return campanha;
}
/**
 * Atualiza uma campanha existente.
 */
async function updateCampaign(id, data) {
    logger_1.logger.info('[campaigns.service.updateCampaign] INÍCIO', { id, data });
    // Verificar existência
    const existente = await database_1.prisma.campaign.findUnique({
        where: { id },
        select: { id: true, status: true },
    });
    if (!existente) {
        logger_1.logger.warn('[campaigns.service.updateCampaign] Campanha não encontrada', { id });
        throw new errors_1.AppError(404, 'Campanha não encontrada', 'CAMPAIGN_NOT_FOUND');
    }
    if (existente.status === 'active') {
        logger_1.logger.warn('[campaigns.service.updateCampaign] Tentativa de editar campanha ativa', { id });
        throw new errors_1.AppError(409, 'Não é possível editar uma campanha ativa', 'CAMPAIGN_ACTIVE');
    }
    const atualizada = await database_1.prisma.campaign.update({
        where: { id },
        data: {
            ...(data.name !== undefined && { name: data.name }),
            ...(data.description !== undefined && { description: data.description }),
            ...(data.channel !== undefined && { channel: data.channel }),
        },
    });
    logger_1.logger.info('[campaigns.service.updateCampaign] FIM - Campanha atualizada', { id });
    return atualizada;
}
/**
 * Adiciona ou substitui os steps de uma campanha.
 */
async function addSteps(campaignId, steps) {
    logger_1.logger.info('[campaigns.service.addSteps] INÍCIO', {
        campaignId,
        totalSteps: steps.length,
    });
    // Verificar existência da campanha
    const campanha = await database_1.prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { id: true, status: true },
    });
    if (!campanha) {
        logger_1.logger.warn('[campaigns.service.addSteps] Campanha não encontrada', { campaignId });
        throw new errors_1.AppError(404, 'Campanha não encontrada', 'CAMPAIGN_NOT_FOUND');
    }
    if (campanha.status === 'active') {
        logger_1.logger.warn('[campaigns.service.addSteps] Tentativa de editar steps de campanha ativa', {
            campaignId,
        });
        throw new errors_1.AppError(409, 'Não é possível editar steps de uma campanha ativa', 'CAMPAIGN_ACTIVE');
    }
    // Validar orders únicos
    const orders = steps.map((s) => s.order);
    const ordersUnicos = new Set(orders);
    if (ordersUnicos.size !== orders.length) {
        throw new errors_1.AppError(400, 'Orders dos steps devem ser únicos', 'DUPLICATE_STEP_ORDER');
    }
    // Apagar steps existentes e criar novos (substitui)
    await database_1.prisma.$transaction(async (tx) => {
        await tx.campaignStep.deleteMany({ where: { campaignId } });
        await tx.campaignStep.createMany({
            data: steps.map((s) => ({
                campaignId,
                order: s.order,
                delayDays: s.delayDays,
                channel: s.channel,
                template: s.template,
                subject: s.subject ?? null,
            })),
        });
    });
    const stepsAtualizados = await database_1.prisma.campaignStep.findMany({
        where: { campaignId },
        orderBy: { order: 'asc' },
    });
    logger_1.logger.info('[campaigns.service.addSteps] FIM - Steps adicionados', {
        campaignId,
        totalSteps: stepsAtualizados.length,
    });
    return stepsAtualizados;
}
/**
 * Adiciona leads a uma campanha usando createMany para evitar N queries individuais.
 */
async function addLeads(campaignId, leadIds) {
    logger_1.logger.info('[campaigns.service.addLeads] INÍCIO', {
        campaignId,
        totalLeads: leadIds.length,
    });
    // Verificar existência da campanha
    const campanha = await database_1.prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { id: true, status: true },
    });
    if (!campanha) {
        throw new errors_1.AppError(404, 'Campanha não encontrada', 'CAMPAIGN_NOT_FOUND');
    }
    // Verificar existência dos leads
    const leadsExistentes = await database_1.prisma.lead.findMany({
        where: { id: { in: leadIds } },
        select: { id: true },
    });
    const idsEncontrados = leadsExistentes.map((l) => l.id);
    const idsNaoEncontrados = leadIds.filter((id) => !idsEncontrados.includes(id));
    if (idsNaoEncontrados.length > 0) {
        logger_1.logger.warn('[campaigns.service.addLeads] Alguns leads não encontrados', {
            idsNaoEncontrados,
        });
        throw new errors_1.AppError(404, `Leads não encontrados: ${idsNaoEncontrados.join(', ')}`, 'LEADS_NOT_FOUND');
    }
    // Filtrar leads que ja estao na campanha para evitar violacao de unique constraint
    // SQLite nao suporta skipDuplicates no createMany
    const jaExistentes = await database_1.prisma.campaignLead.findMany({
        where: { campaignId, leadId: { in: leadIds } },
        select: { leadId: true },
    });
    const idsJaExistentes = new Set(jaExistentes.map((cl) => cl.leadId));
    const idsNovos = leadIds.filter((lid) => !idsJaExistentes.has(lid));
    const ignorados = leadIds.length - idsNovos.length;
    logger_1.logger.debug('[campaigns.service.addLeads] Inserindo leads novos em batch com createMany...', {
        campaignId,
        total: leadIds.length,
        novos: idsNovos.length,
        ignorados,
    });
    let adicionados = 0;
    if (idsNovos.length > 0) {
        const resultado = await database_1.prisma.campaignLead.createMany({
            data: idsNovos.map((leadId) => ({
                campaignId,
                leadId,
                currentStep: 0,
                status: 'active',
            })),
        });
        adicionados = resultado.count;
        // Bug 8 Fix: Se a campanha ja esta ativa, agendar imediatamente os novos leads
        if (campanha.status === 'active' && adicionados > 0) {
            logger_1.logger.info('[campaigns.service.addLeads] Campanha ativa — agendando novos leads imediatamente...', {
                campaignId,
                novosLeads: adicionados,
            });
            // Buscar os CampaignLead recém-criados para obter os IDs gerados
            const novosLeadsAgendados = await database_1.prisma.campaignLead.findMany({
                where: { campaignId, leadId: { in: idsNovos }, currentStep: 0 },
                select: { id: true },
            });
            const jobsNovos = novosLeadsAgendados.map((cl) => ({
                name: `campaign-step-${cl.id}-step-0-new`,
                data: { campaignLeadId: cl.id },
                opts: { jobId: `cs-${cl.id}-step-0` },
            }));
            await queue_1.campaignStepQueue.addBulk(jobsNovos);
            logger_1.logger.info('[campaigns.service.addLeads] Jobs agendados para novos leads da campanha ativa', {
                campaignId,
                jobsAgendados: jobsNovos.length,
            });
        }
    }
    logger_1.logger.info('[campaigns.service.addLeads] FIM', {
        campaignId,
        adicionados,
        ignorados,
        total: leadIds.length,
    });
    return { adicionados, ignorados, total: leadIds.length };
}
/**
 * Inicia uma campanha: muda status de forma atomica (evita race condition),
 * registra startedAt e agenda o primeiro step para todos os leads ativos
 * usando addBulk para enfileirar todos os jobs de uma vez.
 */
async function startCampaign(id) {
    logger_1.logger.info('[campaigns.service.startCampaign] INÍCIO', { id });
    // Bug 7 Fix: buscar tanto leads com currentStep=0 (inicio) quanto leads ativos em qualquer step
    // A query de leads a agendar depende se a campanha esta sendo retomada de pausa ou iniciada do zero
    const campanha = await database_1.prisma.campaign.findUnique({
        where: { id },
        include: {
            steps: { orderBy: { order: 'asc' } },
            // Buscar todos os leads ativos para poder reagendar os que estao no meio do funil
            leads: {
                where: { status: 'active' },
                select: { id: true, leadId: true, currentStep: true },
            },
        },
    });
    if (!campanha) {
        throw new errors_1.AppError(404, 'Campanha não encontrada', 'CAMPAIGN_NOT_FOUND');
    }
    if (campanha.steps.length === 0) {
        throw new errors_1.AppError(400, 'A campanha precisa ter pelo menos um step antes de ser iniciada', 'NO_STEPS');
    }
    if (campanha.leads.length === 0) {
        throw new errors_1.AppError(400, 'A campanha precisa ter pelo menos um lead antes de ser iniciada', 'NO_LEADS');
    }
    const estaReiniciando = campanha.status === 'paused';
    logger_1.logger.info('[campaigns.service.startCampaign] Iniciando campanha com updateMany atomico...', {
        id,
        totalLeads: campanha.leads.length,
        totalSteps: campanha.steps.length,
        estaReiniciando,
    });
    // Bug 7 Fix: aceitar transicao de 'draft' OU 'paused' para 'active'
    const resultado = await database_1.prisma.campaign.updateMany({
        where: { id, status: { in: ['draft', 'paused'] } },
        data: {
            status: 'active',
            startedAt: new Date(),
        },
    });
    if (resultado.count === 0) {
        logger_1.logger.warn('[campaigns.service.startCampaign] Campanha ja esta ativa ou nao encontrada', {
            id,
        });
        throw new errors_1.AppError(409, 'Campanha ja esta ativa ou nao existe', 'CAMPAIGN_ALREADY_ACTIVE');
    }
    logger_1.logger.debug('[campaigns.service.startCampaign] Status atualizado com sucesso', {
        id,
        rowsAffected: resultado.count,
    });
    // Agendar jobs para os leads ativos
    // - Se iniciando do zero: leads com currentStep=0
    // - Se retomando de pausa: todos os leads ativos (currentStep pode ser > 0)
    logger_1.logger.debug('[campaigns.service.startCampaign] Enfileirando jobs em bulk...', {
        totalJobs: campanha.leads.length,
        estaReiniciando,
    });
    const jobs = campanha.leads.map((campaignLead) => {
        // Para campanha pausada que esta sendo retomada, usar o currentStep atual do lead
        // Para campanha iniciando do zero, o currentStep ja e 0
        const stepSuffix = estaReiniciando ? campaignLead.currentStep : 0;
        return {
            name: `campaign-step-${campaignLead.id}-step-${stepSuffix}`,
            data: { campaignLeadId: campaignLead.id },
            opts: { jobId: `cs-${campaignLead.id}-step-${stepSuffix}` },
        };
    });
    await queue_1.campaignStepQueue.addBulk(jobs);
    logger_1.logger.info('[campaigns.service.startCampaign] FIM - Campanha iniciada', {
        id,
        jobsAgendados: jobs.length,
        estaReiniciando,
    });
    return {
        id,
        status: 'active',
        jobsAgendados: jobs.length,
    };
}
/**
 * Pausa uma campanha ativa.
 */
async function pauseCampaign(id) {
    logger_1.logger.info('[campaigns.service.pauseCampaign] INÍCIO', { id });
    const campanha = await database_1.prisma.campaign.findUnique({
        where: { id },
        select: { id: true, status: true },
    });
    if (!campanha) {
        throw new errors_1.AppError(404, 'Campanha não encontrada', 'CAMPAIGN_NOT_FOUND');
    }
    if (campanha.status !== 'active') {
        throw new errors_1.AppError(409, 'Apenas campanhas ativas podem ser pausadas', 'CAMPAIGN_NOT_ACTIVE');
    }
    await database_1.prisma.campaign.update({
        where: { id },
        data: { status: 'paused' },
    });
    logger_1.logger.info('[campaigns.service.pauseCampaign] FIM - Campanha pausada', { id });
    return { id, status: 'paused' };
}
/**
 * Retorna estatísticas de uma campanha com breakdown por step e contagem de leads por status.
 */
async function getCampaignStats(id) {
    logger_1.logger.info('[campaigns.service.getCampaignStats] INÍCIO', { id });
    const campanha = await database_1.prisma.campaign.findUnique({
        where: { id },
        select: {
            id: true,
            name: true,
            status: true,
            steps: {
                orderBy: { order: 'asc' },
                select: { id: true, order: true, channel: true, delayDays: true },
            },
        },
    });
    if (!campanha) {
        throw new errors_1.AppError(404, 'Campanha não encontrada', 'CAMPAIGN_NOT_FOUND');
    }
    // Buscar contagens dos leads por status em paralelo
    const [totalLeads, leadsAtivos, leadsCompletados, leadsResponderam, leadsFailed] = await Promise.all([
        database_1.prisma.campaignLead.count({ where: { campaignId: id } }),
        database_1.prisma.campaignLead.count({ where: { campaignId: id, status: 'active' } }),
        database_1.prisma.campaignLead.count({ where: { campaignId: id, status: 'completed' } }),
        database_1.prisma.campaignLead.count({ where: { campaignId: id, status: 'replied' } }),
        database_1.prisma.campaignLead.count({ where: { campaignId: id, status: 'failed' } }),
    ]);
    // Contagens de mensagens
    const [totalMensagens, mensagensEnviadas] = await Promise.all([
        database_1.prisma.message.count({ where: { campaignId: id } }),
        database_1.prisma.message.count({ where: { campaignId: id, status: 'sent', direction: 'outbound' } }),
    ]);
    const deliveryRate = totalMensagens > 0 ? Math.round((mensagensEnviadas / totalMensagens) * 100) : 0;
    const responseRate = totalLeads > 0 ? Math.round((leadsResponderam / totalLeads) * 100) : 0;
    // Breakdown por step: para cada step, contar mensagens enviadas e respostas
    // O campo metadata armazena JSON com "stepId" para rastreamento
    logger_1.logger.debug('[campaigns.service.getCampaignStats] Calculando breakdown por step...', {
        id,
        totalSteps: campanha.steps.length,
    });
    const stepsBreakdown = await Promise.all(campanha.steps.map(async (step) => {
        const [mensagensStep, respostasStep] = await Promise.all([
            database_1.prisma.message.count({
                where: {
                    campaignId: id,
                    direction: 'outbound',
                    metadata: { contains: `"stepId":"${step.id}"` },
                },
            }),
            database_1.prisma.message.count({
                where: {
                    campaignId: id,
                    direction: 'inbound',
                    metadata: { contains: `"stepId":"${step.id}"` },
                },
            }),
        ]);
        return {
            stepId: step.id,
            order: step.order,
            channel: step.channel,
            delayDays: step.delayDays,
            messagesSent: mensagensStep,
            replies: respostasStep,
        };
    }));
    const stats = {
        campaignId: id,
        nome: campanha.name,
        status: campanha.status,
        // Contagens de leads agrupadas por status
        leads: {
            total: totalLeads,
            active: leadsAtivos,
            completed: leadsCompletados,
            replied: leadsResponderam,
            failed: leadsFailed,
            paused: Math.max(0, totalLeads - leadsAtivos - leadsCompletados - leadsResponderam - leadsFailed),
        },
        // Métricas gerais de mensagens
        messagesSent: mensagensEnviadas,
        deliveryRate,
        responseRate,
        // Breakdown detalhado por step
        stepsBreakdown,
    };
    logger_1.logger.info('[campaigns.service.getCampaignStats] FIM', {
        id,
        totalLeads,
        deliveryRate,
        responseRate,
        totalSteps: campanha.steps.length,
    });
    return stats;
}
// ---------------------------------------------------------------------------
// Novos endpoints
// ---------------------------------------------------------------------------
/**
 * Deleta uma campanha. Permitido apenas nos status: draft, paused, completed.
 * Se status for 'active', retorna erro 400 solicitando que pause primeiro.
 * A exclusão em cascata (steps, leads, messages) é garantida pelo schema Prisma.
 */
async function deleteCampaign(id) {
    logger_1.logger.info('[campaigns.service.deleteCampaign] INÍCIO', { id });
    const campanha = await database_1.prisma.campaign.findUnique({
        where: { id },
        select: { id: true, name: true, status: true },
    });
    if (!campanha) {
        logger_1.logger.warn('[campaigns.service.deleteCampaign] Campanha não encontrada', { id });
        throw new errors_1.AppError(404, 'Campanha não encontrada', 'CAMPAIGN_NOT_FOUND');
    }
    if (campanha.status === 'active') {
        logger_1.logger.warn('[campaigns.service.deleteCampaign] Tentativa de deletar campanha ativa', {
            id,
            status: campanha.status,
        });
        throw new errors_1.AppError(400, 'Pause a campanha antes de deletar', 'CAMPAIGN_ACTIVE');
    }
    logger_1.logger.debug('[campaigns.service.deleteCampaign] Status permite exclusão', {
        id,
        status: campanha.status,
    });
    await database_1.prisma.campaign.delete({ where: { id } });
    logger_1.logger.info('[campaigns.service.deleteCampaign] FIM - Campanha deletada', {
        id,
        nome: campanha.name,
        status: campanha.status,
    });
}
/**
 * Lista os leads de uma campanha com dados do lead (name, email, phone, company)
 * e informações de progresso (currentStep, status, nextActionAt, completedAt).
 * Suporta paginação e filtro por status.
 */
async function listCampaignLeads(campaignId, params) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const { status } = params;
    const skip = (page - 1) * limit;
    logger_1.logger.info('[campaigns.service.listCampaignLeads] INÍCIO', {
        campaignId,
        page,
        limit,
        status,
    });
    // Verificar existência da campanha
    const campanha = await database_1.prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { id: true },
    });
    if (!campanha) {
        logger_1.logger.warn('[campaigns.service.listCampaignLeads] Campanha não encontrada', { campaignId });
        throw new errors_1.AppError(404, 'Campanha não encontrada', 'CAMPAIGN_NOT_FOUND');
    }
    const where = {
        campaignId,
        ...(status ? { status } : {}),
    };
    const [campaignLeads, total] = await Promise.all([
        database_1.prisma.campaignLead.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'asc' },
            select: {
                id: true,
                currentStep: true,
                status: true,
                nextActionAt: true,
                completedAt: true,
                createdAt: true,
                updatedAt: true,
                lead: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        company: true,
                    },
                },
            },
        }),
        database_1.prisma.campaignLead.count({ where }),
    ]);
    const totalPages = Math.ceil(total / limit);
    logger_1.logger.info('[campaigns.service.listCampaignLeads] FIM', {
        campaignId,
        total,
        retornados: campaignLeads.length,
        page,
        totalPages,
    });
    return {
        data: campaignLeads,
        pagination: { page, limit, total, totalPages },
    };
}
/**
 * Remove um lead de uma campanha.
 * Se a campanha estiver ativa, o lead simplesmente para de receber mensagens
 * (os jobs agendados verificam o status do CampaignLead antes de disparar).
 */
async function removeCampaignLead(campaignId, leadId) {
    logger_1.logger.info('[campaigns.service.removeCampaignLead] INÍCIO', { campaignId, leadId });
    // Verificar existência da campanha
    const campanha = await database_1.prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { id: true, status: true },
    });
    if (!campanha) {
        logger_1.logger.warn('[campaigns.service.removeCampaignLead] Campanha não encontrada', { campaignId });
        throw new errors_1.AppError(404, 'Campanha não encontrada', 'CAMPAIGN_NOT_FOUND');
    }
    // Verificar existência do CampaignLead usando unique composto
    const campaignLead = await database_1.prisma.campaignLead.findUnique({
        where: { campaignId_leadId: { campaignId, leadId } },
        select: { id: true, status: true },
    });
    if (!campaignLead) {
        logger_1.logger.warn('[campaigns.service.removeCampaignLead] Lead não encontrado na campanha', {
            campaignId,
            leadId,
        });
        throw new errors_1.AppError(404, 'Lead não encontrado nesta campanha', 'CAMPAIGN_LEAD_NOT_FOUND');
    }
    logger_1.logger.debug('[campaigns.service.removeCampaignLead] Removendo CampaignLead...', {
        campaignId,
        leadId,
        campaignLeadId: campaignLead.id,
        campanhaStatus: campanha.status,
    });
    await database_1.prisma.campaignLead.delete({
        where: { campaignId_leadId: { campaignId, leadId } },
    });
    logger_1.logger.info('[campaigns.service.removeCampaignLead] FIM - Lead removido da campanha', {
        campaignId,
        leadId,
        campanhaAtiva: campanha.status === 'active',
    });
}
/**
 * Clona uma campanha: cria nova com nome + " (cópia)", copia todos os steps.
 * Não copia leads — começa do zero. Status da cópia é 'draft'.
 */
async function duplicateCampaign(id) {
    logger_1.logger.info('[campaigns.service.duplicateCampaign] INÍCIO', { id });
    // Buscar campanha original com seus steps
    const original = await database_1.prisma.campaign.findUnique({
        where: { id },
        include: {
            steps: { orderBy: { order: 'asc' } },
        },
    });
    if (!original) {
        logger_1.logger.warn('[campaigns.service.duplicateCampaign] Campanha não encontrada', { id });
        throw new errors_1.AppError(404, 'Campanha não encontrada', 'CAMPAIGN_NOT_FOUND');
    }
    logger_1.logger.debug('[campaigns.service.duplicateCampaign] Campanha original encontrada', {
        id,
        nome: original.name,
        totalSteps: original.steps.length,
    });
    const nomeCopia = `${original.name} (cópia)`;
    // Criar cópia em transação atômica: nova campanha + steps copiados
    const copia = await database_1.prisma.$transaction(async (tx) => {
        const novaCampanha = await tx.campaign.create({
            data: {
                name: nomeCopia,
                description: original.description ?? null,
                channel: original.channel,
                status: 'draft',
            },
        });
        logger_1.logger.debug('[campaigns.service.duplicateCampaign] Nova campanha criada', {
            novoId: novaCampanha.id,
            nome: novaCampanha.name,
        });
        if (original.steps.length > 0) {
            await tx.campaignStep.createMany({
                data: original.steps.map((step) => ({
                    campaignId: novaCampanha.id,
                    order: step.order,
                    delayDays: step.delayDays,
                    channel: step.channel,
                    template: step.template,
                    subject: step.subject ?? null,
                    conditionType: step.conditionType ?? null,
                    conditionValue: step.conditionValue ?? null,
                    nextStepOnMatch: step.nextStepOnMatch ?? null,
                    nextStepOnNoMatch: step.nextStepOnNoMatch ?? null,
                })),
            });
            logger_1.logger.debug('[campaigns.service.duplicateCampaign] Steps copiados', {
                novoId: novaCampanha.id,
                totalSteps: original.steps.length,
            });
        }
        return novaCampanha;
    });
    // Buscar cópia completa para retornar
    const copiaCompleta = await database_1.prisma.campaign.findUnique({
        where: { id: copia.id },
        include: {
            steps: { orderBy: { order: 'asc' } },
            _count: { select: { leads: true, messages: true } },
        },
    });
    logger_1.logger.info('[campaigns.service.duplicateCampaign] FIM - Campanha clonada', {
        originalId: id,
        novoId: copia.id,
        nome: copia.name,
        totalSteps: original.steps.length,
    });
    return copiaCompleta;
}
//# sourceMappingURL=campaigns.service.js.map