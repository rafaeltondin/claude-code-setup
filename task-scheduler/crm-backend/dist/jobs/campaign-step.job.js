"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.campaignStepWorker = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("../config/redis");
const database_1 = require("../config/database");
const logger_1 = require("../utils/logger");
const template_variables_1 = require("../utils/template-variables");
const settings_service_1 = require("../modules/settings/settings.service");
const queue_1 = require("./queue");
// ---------------------------------------------------------------------------
// Horário comercial — disparos apenas seg-sex 8h-17h (America/Sao_Paulo)
// ---------------------------------------------------------------------------
const TIMEZONE = 'America/Sao_Paulo';
const HORA_INICIO = 8; // 08:00
const HORA_FIM = 17; // 17:00 (último disparo às 16:59)
/**
 * Retorna a data/hora no fuso America/Sao_Paulo.
 */
function agora_SP() {
    const str = new Date().toLocaleString('en-US', { timeZone: TIMEZONE });
    return new Date(str);
}
/**
 * Verifica se uma data está dentro do horário comercial (seg-sex 8h-17h SP).
 */
function isDentroHorarioComercial(date) {
    const d = date ?? agora_SP();
    const dia = d.getDay(); // 0=dom, 6=sab
    const hora = d.getHours();
    return dia >= 1 && dia <= 5 && hora >= HORA_INICIO && hora < HORA_FIM;
}
/**
 * Dado um Date, retorna o próximo horário comercial válido.
 * Se já estiver dentro do horário, retorna o próprio Date.
 * Caso contrário, avança para a próxima seg-sex às 8h + jitter.
 */
function proximoHorarioComercial(date) {
    // Converter para SP para avaliação
    const spStr = date.toLocaleString('en-US', { timeZone: TIMEZONE });
    const sp = new Date(spStr);
    const dia = sp.getDay();
    const hora = sp.getHours();
    const min = sp.getMinutes();
    // Já dentro do horário comercial
    if (dia >= 1 && dia <= 5 && hora >= HORA_INICIO && hora < HORA_FIM) {
        return date;
    }
    // Calcular quantos dias avançar
    let diasAvancar = 0;
    if (dia === 0) {
        // Domingo → seg
        diasAvancar = 1;
    }
    else if (dia === 6) {
        // Sábado → seg
        diasAvancar = 2;
    }
    else if (hora >= HORA_FIM) {
        // Dia útil mas depois das 17h → próximo dia útil
        diasAvancar = dia === 5 ? 3 : 1; // sexta → segunda, senão → amanhã
    }
    else if (hora < HORA_INICIO) {
        // Dia útil mas antes das 8h → mesmo dia às 8h
        diasAvancar = 0;
    }
    const resultado = new Date(date);
    resultado.setDate(resultado.getDate() + diasAvancar);
    // Setar horário para 8h + jitter de 0-30 min (distribuir disparos)
    // Usar horário SP: calcular offset entre UTC e SP
    const utcStr = resultado.toLocaleString('en-US', { timeZone: 'UTC' });
    const spStr2 = resultado.toLocaleString('en-US', { timeZone: TIMEZONE });
    const offsetMs = new Date(utcStr).getTime() - new Date(spStr2).getTime();
    resultado.setUTCHours(HORA_INICIO + Math.floor(offsetMs / 3600000), Math.floor(Math.random() * 30), 0, 0);
    return resultado;
}
// ---------------------------------------------------------------------------
// Calcular próxima data de ação (respeitando horário comercial)
// ---------------------------------------------------------------------------
/**
 * Calcula a data da próxima ação baseada no delayDays do step seguinte.
 * Garante que o disparo caia dentro do horário comercial (seg-sex 8h-17h SP).
 * Quando delayDays é 0, aplica jitter aleatório de 1-60 segundos mas
 * só se estiver dentro do horário comercial.
 */
function calcularProximaAcao(delayDays) {
    const proxima = new Date();
    if (delayDays === 0) {
        // Jitter de 1-60s para evitar thundering herd quando delayDays=0
        proxima.setSeconds(proxima.getSeconds() + Math.floor(Math.random() * 60) + 1);
    }
    else {
        proxima.setDate(proxima.getDate() + delayDays);
    }
    // Garantir que caia em horário comercial
    return proximoHorarioComercial(proxima);
}
// ---------------------------------------------------------------------------
// Processador do job
// ---------------------------------------------------------------------------
async function processarCampaignStep(job) {
    const { campaignLeadId } = job.data;
    const logCtx = { jobId: job.id, campaignLeadId };
    logger_1.logger.info('[campaign-step.job] INÍCIO', logCtx);
    // 0. Guard de horário comercial — seg-sex 8h-17h (America/Sao_Paulo)
    if (!isDentroHorarioComercial()) {
        const proximoHorario = proximoHorarioComercial(new Date());
        const delayMs = Math.max(proximoHorario.getTime() - Date.now(), 60000);
        logger_1.logger.info('[campaign-step.job] FORA DO HORÁRIO COMERCIAL — reagendando', {
            ...logCtx,
            agoraSP: agora_SP().toISOString(),
            proximoHorario: proximoHorario.toISOString(),
            delayMs,
        });
        // Re-enfileirar o mesmo job para o próximo horário comercial
        await queue_1.campaignStepQueue.add(`campaign-step-${campaignLeadId}-reagendado`, { campaignLeadId }, {
            delay: delayMs,
            jobId: `cs-${campaignLeadId}-reagendado-${Date.now()}`,
        });
        return { status: 'rescheduled_business_hours' };
    }
    // 1. Buscar CampaignLead com relações necessárias
    logger_1.logger.debug('[campaign-step.job] Buscando CampaignLead...', logCtx);
    const campaignLead = await database_1.prisma.campaignLead.findUnique({
        where: { id: campaignLeadId },
        include: {
            campaign: {
                include: {
                    steps: {
                        orderBy: { order: 'asc' },
                    },
                },
            },
            lead: true,
        },
    });
    if (!campaignLead) {
        logger_1.logger.error('[campaign-step.job] CampaignLead não encontrado', logCtx);
        throw new Error(`CampaignLead ${campaignLeadId} não encontrado`);
    }
    logger_1.logger.debug('[campaign-step.job] CampaignLead encontrado', {
        ...logCtx,
        leadId: campaignLead.leadId,
        campaignId: campaignLead.campaignId,
        currentStep: campaignLead.currentStep,
        status: campaignLead.status,
        totalSteps: campaignLead.campaign.steps.length,
    });
    // 2. Verificar se a campanha ou lead estão em estado válido
    if (campaignLead.status !== 'active') {
        logger_1.logger.warn('[campaign-step.job] CampaignLead não está ativo — ignorando', {
            ...logCtx,
            status: campaignLead.status,
        });
        return { status: 'skipped' };
    }
    if (campaignLead.campaign.status !== 'active') {
        logger_1.logger.warn('[campaign-step.job] Campanha não está ativa — ignorando', {
            ...logCtx,
            campaignStatus: campaignLead.campaign.status,
        });
        return { status: 'skipped' };
    }
    // 3. Verificar se o lead respondeu recentemente (tem Message inbound nas últimas 24h)
    const recentemente = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const respostaRecente = await database_1.prisma.message.findFirst({
        where: {
            leadId: campaignLead.leadId,
            direction: 'inbound',
            createdAt: { gte: recentemente },
        },
        select: { id: true, createdAt: true },
    });
    if (respostaRecente) {
        logger_1.logger.info('[campaign-step.job] Lead respondeu recentemente — pausando campanha para esse lead', {
            ...logCtx,
            leadId: campaignLead.leadId,
            messageId: respostaRecente.id,
            respondeuEm: respostaRecente.createdAt.toISOString(),
        });
        await database_1.prisma.campaignLead.update({
            where: { id: campaignLeadId },
            data: { status: 'replied' },
        });
        return { status: 'paused_by_reply' };
    }
    // 4. Obter o step atual
    // Busca exata pelo order; se não encontrar (ex: currentStep=0 e orders começam em 1),
    // busca o primeiro step com order >= currentStep para não pular nenhum step.
    const steps = campaignLead.campaign.steps;
    const stepAtual = steps.find((s) => s.order === campaignLead.currentStep)
        ?? steps.find((s) => s.order >= campaignLead.currentStep);
    if (!stepAtual) {
        logger_1.logger.warn('[campaign-step.job] Step atual não encontrado — campanha completada', {
            ...logCtx,
            currentStep: campaignLead.currentStep,
            stepsDisponiveis: steps.map((s) => s.order),
        });
        // Marcar como completado
        await database_1.prisma.campaignLead.update({
            where: { id: campaignLeadId },
            data: {
                status: 'completed',
                completedAt: new Date(),
            },
        });
        return { status: 'completed' };
    }
    logger_1.logger.info('[campaign-step.job] Processando step', {
        ...logCtx,
        stepId: stepAtual.id,
        stepOrder: stepAtual.order,
        channel: stepAtual.channel,
        delayDays: stepAtual.delayDays,
        conditionType: stepAtual.conditionType ?? null,
    });
    // 4b. Avaliar condição de branching (se o step tiver conditionType)
    if (stepAtual.conditionType) {
        logger_1.logger.info('[campaign-step.job] Step tem condição de branching — avaliando...', {
            ...logCtx,
            conditionType: stepAtual.conditionType,
            conditionValue: stepAtual.conditionValue ?? null,
            nextStepOnMatch: stepAtual.nextStepOnMatch ?? null,
            nextStepOnNoMatch: stepAtual.nextStepOnNoMatch ?? null,
        });
        // Verificar se o lead tem alguma mensagem inbound desde o início da campanha
        const inicioParticipacao = campaignLead.createdAt;
        const respostaInbound = await database_1.prisma.message.findFirst({
            where: {
                leadId: campaignLead.leadId,
                direction: 'inbound',
                createdAt: { gte: inicioParticipacao },
            },
            select: { id: true, createdAt: true },
            orderBy: { createdAt: 'asc' },
        });
        const leadRespondeu = respostaInbound !== null;
        logger_1.logger.debug('[campaign-step.job] Resultado da checagem de resposta para branching', {
            ...logCtx,
            leadRespondeu,
            primeiraRespostaEm: respostaInbound?.createdAt.toISOString() ?? null,
            inicioParticipacao: inicioParticipacao.toISOString(),
        });
        // BUG 10 FIX: conditionType desconhecido — logar warning e pular branching (seguir sequencial)
        if (stepAtual.conditionType !== 'replied' && stepAtual.conditionType !== 'not_replied') {
            logger_1.logger.warn('[campaign-step.job] conditionType desconhecido — ignorando branching, seguindo sequencial', {
                ...logCtx,
                conditionType: stepAtual.conditionType,
            });
            // Sair do bloco de branching e continuar com execução sequencial normal
        }
        else {
            let condicaoAtendida = false;
            if (stepAtual.conditionType === 'replied') {
                condicaoAtendida = leadRespondeu;
            }
            else if (stepAtual.conditionType === 'not_replied') {
                condicaoAtendida = !leadRespondeu;
            }
            logger_1.logger.info('[campaign-step.job] Condição avaliada', {
                ...logCtx,
                conditionType: stepAtual.conditionType,
                condicaoAtendida,
            });
            // Determinar destino do branching
            const proximaOrdemBranch = condicaoAtendida
                ? stepAtual.nextStepOnMatch
                : stepAtual.nextStepOnNoMatch;
            if (proximaOrdemBranch !== null && proximaOrdemBranch !== undefined) {
                // Pular para o step especificado pelo branching
                const stepDestino = steps.find((s) => s.order === proximaOrdemBranch);
                if (stepDestino) {
                    const proximaAcaoBranch = calcularProximaAcao(stepDestino.delayDays);
                    const delayMsBranch = Math.max(proximaAcaoBranch.getTime() - Date.now(), 0);
                    logger_1.logger.info('[campaign-step.job] Branching: pulando para step de ordem', {
                        ...logCtx,
                        stepAtualOrder: stepAtual.order,
                        proximaOrdemBranch,
                        condicaoAtendida,
                        delayDias: stepDestino.delayDays,
                        proximaAcao: proximaAcaoBranch.toISOString(),
                    });
                    await database_1.prisma.campaignLead.update({
                        where: { id: campaignLeadId },
                        data: {
                            currentStep: proximaOrdemBranch,
                            nextActionAt: proximaAcaoBranch,
                        },
                    });
                    await queue_1.campaignStepQueue.add(`campaign-step-branch-${campaignLeadId}-${proximaOrdemBranch}`, { campaignLeadId }, {
                        delay: delayMsBranch,
                        jobId: `cs-${campaignLeadId}-step-${proximaOrdemBranch}-branch`,
                    });
                    logger_1.logger.info('[campaign-step.job] FIM - Branching executado', {
                        ...logCtx,
                        destino: proximaOrdemBranch,
                    });
                    return { status: 'branched' };
                }
                else {
                    logger_1.logger.warn('[campaign-step.job] Step de destino do branching não encontrado — completando', {
                        ...logCtx,
                        proximaOrdemBranch,
                        stepsDisponiveis: steps.map((s) => s.order),
                    });
                    await database_1.prisma.campaignLead.update({
                        where: { id: campaignLeadId },
                        data: { status: 'completed', completedAt: new Date() },
                    });
                    return { status: 'completed' };
                }
            }
            // Se nenhuma ordem de destino foi definida para o resultado, seguir sequencial normal
            logger_1.logger.info('[campaign-step.job] Branching sem destino definido para este resultado — seguindo sequencial', {
                ...logCtx,
                condicaoAtendida,
            });
        } // fecha else do conditionType conhecido
    } // fecha if (stepAtual.conditionType)
    const lead = campaignLead.lead;
    // Verificar se o lead ainda existe (pode ter sido deletado após enfileiramento)
    if (!lead) {
        logger_1.logger.error('[campaign-step.job] Lead do CampaignLead não encontrado (deletado?)', logCtx);
        await database_1.prisma.campaignLead.update({
            where: { id: campaignLeadId },
            data: { status: 'failed' },
        });
        return { status: 'lead_not_found' };
    }
    // 5. Buscar conteúdo do template e substituir variáveis
    logger_1.logger.debug('[campaign-step.job] Buscando template e settings para substituição...', logCtx);
    // 5a. Buscar conteúdo do template pelo ID armazenado em stepAtual.template
    let templateContent = stepAtual.template;
    let templateSubject = stepAtual.subject;
    const templateRecord = await database_1.prisma.template.findUnique({
        where: { id: stepAtual.template },
        select: { content: true, subject: true },
    });
    if (templateRecord) {
        templateContent = templateRecord.content;
        if (templateRecord.subject && !templateSubject) {
            templateSubject = templateRecord.subject;
        }
        logger_1.logger.debug('[campaign-step.job] Template encontrado no banco', {
            ...logCtx,
            templateId: stepAtual.template,
            contentPreview: templateContent.substring(0, 80),
        });
    }
    else {
        // Fallback: stepAtual.template pode já ser o conteúdo direto (compatibilidade)
        logger_1.logger.warn('[campaign-step.job] Template não encontrado no banco — usando valor direto', {
            ...logCtx,
            templateId: stepAtual.template,
        });
    }
    let settingsMap;
    try {
        const allSettings = await (0, settings_service_1.getAllSettings)();
        settingsMap = Object.fromEntries(allSettings.map((s) => [s.key, s.value]));
    }
    catch (settingsErr) {
        logger_1.logger.warn('[campaign-step.job] Não foi possível carregar settings — variáveis do agente não serão substituídas', {
            ...logCtx,
            error: settingsErr.message,
        });
    }
    const conteudoFinal = await (0, template_variables_1.substituirVariaveis)(templateContent, lead, settingsMap);
    const assuntoFinal = templateSubject
        ? await (0, template_variables_1.substituirVariaveis)(templateSubject, lead, settingsMap)
        : null;
    logger_1.logger.debug('[campaign-step.job] Template processado', {
        ...logCtx,
        canal: stepAtual.channel,
        conteudoPreview: conteudoFinal.substring(0, 80),
        assunto: assuntoFinal,
    });
    // 6. Criar Message no banco para rastreamento
    const mensagem = await database_1.prisma.message.create({
        data: {
            leadId: lead.id,
            channel: stepAtual.channel,
            direction: 'outbound',
            content: conteudoFinal,
            subject: assuntoFinal ?? null,
            status: 'pending',
            campaignId: campaignLead.campaignId,
            metadata: JSON.stringify({
                campaignLeadId,
                stepId: stepAtual.id,
                stepOrder: stepAtual.order,
            }),
        },
    });
    logger_1.logger.debug('[campaign-step.job] Message criada para o step', {
        ...logCtx,
        messageId: mensagem.id,
        channel: stepAtual.channel,
    });
    // 7. Enfileirar envio de acordo com o canal
    if (stepAtual.channel === 'whatsapp') {
        if (!lead.phone) {
            logger_1.logger.warn('[campaign-step.job] Lead sem telefone para WhatsApp', {
                ...logCtx,
                leadId: lead.id,
            });
            await database_1.prisma.message.update({
                where: { id: mensagem.id },
                data: { status: 'failed', error: 'Lead sem número de telefone' },
            });
        }
        else {
            await queue_1.sendWhatsAppQueue.add(`whatsapp-${mensagem.id}`, {
                messageId: mensagem.id,
                leadId: lead.id,
                phone: lead.phone,
                content: conteudoFinal,
            }, { jobId: `whatsapp-msg-${mensagem.id}` });
            logger_1.logger.info('[campaign-step.job] Job WhatsApp enfileirado', {
                ...logCtx,
                messageId: mensagem.id,
                phone: lead.phone,
            });
        }
    }
    else if (stepAtual.channel === 'email') {
        if (!lead.email) {
            logger_1.logger.warn('[campaign-step.job] Lead sem email para envio', {
                ...logCtx,
                leadId: lead.id,
            });
            await database_1.prisma.message.update({
                where: { id: mensagem.id },
                data: { status: 'failed', error: 'Lead sem endereço de email' },
            });
        }
        else {
            await queue_1.sendEmailQueue.add(`email-${mensagem.id}`, {
                messageId: mensagem.id,
                leadId: lead.id,
                to: lead.email,
                subject: assuntoFinal ?? `Mensagem para ${lead.name}`,
                content: conteudoFinal,
            }, { jobId: `email-msg-${mensagem.id}` });
            logger_1.logger.info('[campaign-step.job] Job Email enfileirado', {
                ...logCtx,
                messageId: mensagem.id,
                to: lead.email,
            });
        }
    }
    else {
        logger_1.logger.warn('[campaign-step.job] Canal desconhecido', {
            ...logCtx,
            channel: stepAtual.channel,
        });
    }
    // 8. Calcular próximo step
    // Busca o step com order MAIOR que o step recém-processado (stepAtual.order)
    // para suportar orders não contíguos (ex: 1, 2, 5, 10) e o caso currentStep=0
    const proximoStep = steps.find((s) => s.order > stepAtual.order);
    if (!proximoStep) {
        // Era o último step: completar
        logger_1.logger.info('[campaign-step.job] Último step concluído — marcando como completed', {
            ...logCtx,
            leadId: lead.id,
        });
        await database_1.prisma.campaignLead.update({
            where: { id: campaignLeadId },
            data: {
                currentStep: stepAtual.order + 1,
                status: 'completed',
                completedAt: new Date(),
                nextActionAt: null,
            },
        });
        logger_1.logger.info('[campaign-step.job] FIM - CampaignLead completado', logCtx);
        // Bug 9 Fix: verificar se TODOS os CampaignLeads da campanha estao completed
        // Se sim, marcar a campanha como completed tambem
        const totalLeads = await database_1.prisma.campaignLead.count({
            where: { campaignId: campaignLead.campaignId },
        });
        const totalCompletados = await database_1.prisma.campaignLead.count({
            where: { campaignId: campaignLead.campaignId, status: 'completed' },
        });
        logger_1.logger.debug('[campaign-step.job] Verificando se campanha esta completa...', {
            ...logCtx,
            campaignId: campaignLead.campaignId,
            totalLeads,
            totalCompletados,
        });
        if (totalLeads > 0 && totalLeads === totalCompletados) {
            logger_1.logger.info('[campaign-step.job] Todos os leads completados — marcando campanha como completed', {
                ...logCtx,
                campaignId: campaignLead.campaignId,
                totalLeads,
            });
            await database_1.prisma.campaign.update({
                where: { id: campaignLead.campaignId },
                data: {
                    status: 'completed',
                    completedAt: new Date(),
                },
            });
            logger_1.logger.info('[campaign-step.job] Campanha marcada como completed', {
                ...logCtx,
                campaignId: campaignLead.campaignId,
            });
        }
        return { status: 'completed' };
    }
    // Há próximo step: agendar
    const proximaAcao = calcularProximaAcao(proximoStep.delayDays);
    const delayMs = proximaAcao.getTime() - Date.now();
    logger_1.logger.info('[campaign-step.job] Agendando próximo step', {
        ...logCtx,
        proximoStepOrder: proximoStep.order,
        delayDias: proximoStep.delayDays,
        delayMs,
        proximaAcao: proximaAcao.toISOString(),
    });
    // Atualizar CampaignLead para o próximo step (usar order do próximo step para busca exata)
    await database_1.prisma.campaignLead.update({
        where: { id: campaignLeadId },
        data: {
            currentStep: proximoStep.order,
            nextActionAt: proximaAcao,
        },
    });
    // Agendar próximo job com delay
    await queue_1.campaignStepQueue.add(`campaign-step-${campaignLeadId}-${proximoStep.order}`, { campaignLeadId }, {
        delay: Math.max(delayMs, 0),
        jobId: `cs-${campaignLeadId}-step-${proximoStep.order}`,
    });
    logger_1.logger.info('[campaign-step.job] FIM - Próximo step agendado', {
        ...logCtx,
        proximoStep: proximoStep.order,
        proximaAcao: proximaAcao.toISOString(),
    });
    return { status: 'next_step_scheduled' };
}
// ---------------------------------------------------------------------------
// Instanciar Worker
// ---------------------------------------------------------------------------
const campaignStepWorker = new bullmq_1.Worker('campaign-step', processarCampaignStep, {
    connection: redis_1.redis.ioredis,
    concurrency: 5,
});
exports.campaignStepWorker = campaignStepWorker;
campaignStepWorker.on('failed', (job, error) => {
    logger_1.logger.error('[campaign-step.job] Job falhou', {
        jobId: job?.id,
        campaignLeadId: job?.data.campaignLeadId,
        errorMessage: error.message,
        errorStack: error.stack,
        tentativas: job?.attemptsMade,
    });
});
campaignStepWorker.on('error', (error) => {
    logger_1.logger.error('[campaign-step.job] Erro no Worker', {
        errorMessage: error.message,
    });
});
campaignStepWorker.on('active', (job) => {
    logger_1.logger.info('[campaign-step.job] Job iniciado', {
        jobId: job.id,
        campaignLeadId: job.data.campaignLeadId,
        tentativa: job.attemptsMade + 1,
    });
});
// Registrar worker para graceful shutdown
(0, queue_1.registerWorker)(campaignStepWorker);
logger_1.logger.info('[campaign-step.job] Worker registrado', { fila: 'campaign-step', concurrency: 5 });
//# sourceMappingURL=campaign-step.job.js.map