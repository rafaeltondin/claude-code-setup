"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.whatsappWebhookRouter = void 0;
const express_1 = require("express");
const database_1 = require("../../config/database");
const logger_1 = require("../../utils/logger");
const events_controller_1 = require("../../modules/events/events.controller");
// ---------------------------------------------------------------------------
// Helpers de extração de conteúdo
// ---------------------------------------------------------------------------
/**
 * Extrai o texto de uma mensagem WhatsApp, independente do tipo.
 */
function extrairTextoMensagem(data) {
    const msg = data.message;
    if (!msg)
        return '';
    if (msg.conversation)
        return msg.conversation;
    if (msg.extendedTextMessage?.text)
        return msg.extendedTextMessage.text;
    if (msg.imageMessage?.caption)
        return msg.imageMessage.caption;
    if (msg.videoMessage?.caption)
        return msg.videoMessage.caption;
    if (msg.documentMessage?.title)
        return msg.documentMessage.title;
    return '[Mídia recebida]';
}
/**
 * Normaliza um remoteJid WhatsApp para número de telefone puro.
 * Ex: "5511999999999@s.whatsapp.net" → "5511999999999"
 */
function normalizePhone(remoteJid) {
    return remoteJid.split('@')[0];
}
/**
 * Mapeia o status da Evolution API para o status interno da Message.
 */
function mapearStatus(evolutionStatus) {
    const mapa = {
        PENDING: 'pending',
        SERVER_ACK: 'sent',
        DELIVERY_ACK: 'delivered',
        READ: 'read',
        PLAYED: 'read',
        ERROR: 'failed',
    };
    return mapa[evolutionStatus] ?? 'sent';
}
// ---------------------------------------------------------------------------
// Handlers de eventos
// ---------------------------------------------------------------------------
/**
 * Processa MESSAGES_UPSERT — nova mensagem recebida do WhatsApp.
 */
async function handleMessagesUpsert(event, data) {
    const requestId = `wu_${Date.now()}`;
    logger_1.logger.info('[Webhook] MESSAGES_UPSERT recebido', {
        requestId,
        instance: event.instance,
        remoteJid: data.key.remoteJid,
        fromMe: data.key.fromMe,
        messageId: data.key.id,
    });
    // Ignorar mensagens enviadas por nós mesmos
    if (data.key.fromMe) {
        logger_1.logger.debug('[Webhook] Mensagem própria ignorada', {
            requestId,
            messageId: data.key.id,
        });
        return;
    }
    const phone = normalizePhone(data.key.remoteJid);
    const phoneWithPlus = phone.startsWith('+') ? phone : `+${phone}`;
    const conteudo = extrairTextoMensagem(data);
    logger_1.logger.debug('[Webhook] Dados extraídos da mensagem', {
        requestId,
        phone,
        phoneWithPlus,
        conteudo: conteudo.substring(0, 100),
    });
    // Buscar lead pelo número de telefone (com e sem prefixo +)
    logger_1.logger.info('[Webhook] Buscando lead por telefone...', { requestId, phone, phoneWithPlus });
    let lead = await database_1.prisma.lead.findFirst({
        where: {
            OR: [
                { phone },
                { phone: phoneWithPlus },
            ],
        },
    });
    logger_1.logger.debug('[Webhook] Resultado da busca de lead', {
        requestId,
        encontrado: lead !== null,
        leadId: lead?.id,
    });
    // Se não existir no CRM, IGNORAR — somente leads cadastrados pela IA/usuario
    // Contatos pessoais do dia a dia NÃO devem ser importados automaticamente
    if (!lead) {
        logger_1.logger.debug('[Webhook] Telefone nao cadastrado no CRM — ignorando mensagem', {
            requestId,
            phone,
            pushName: data.pushName,
        });
        return;
    }
    // Salvar a mensagem recebida
    logger_1.logger.info('[Webhook] Salvando mensagem recebida...', {
        requestId,
        leadId: lead.id,
        externalId: data.key.id,
    });
    const message = await database_1.prisma.message.create({
        data: {
            leadId: lead.id,
            channel: 'whatsapp',
            direction: 'inbound',
            content: conteudo,
            status: 'delivered',
            externalId: data.key.id,
            metadata: JSON.stringify({
                remoteJid: data.key.remoteJid,
                pushName: data.pushName,
                timestamp: data.messageTimestamp,
                instance: event.instance,
            }),
            sentAt: data.messageTimestamp
                ? new Date(data.messageTimestamp * 1000)
                : new Date(),
            deliveredAt: new Date(),
        },
    });
    logger_1.logger.info('[Webhook] Mensagem salva', {
        requestId,
        messageId: message.id,
        leadId: lead.id,
    });
    // Notificar clientes SSE sobre nova mensagem recebida
    (0, events_controller_1.emitSSE)('new_message', {
        messageId: message.id,
        leadId: lead.id,
        channel: 'whatsapp',
        direction: 'inbound',
        status: 'delivered',
        preview: conteudo.substring(0, 100),
        timestamp: new Date().toISOString(),
    });
    logger_1.logger.debug('[Webhook] Evento SSE new_message emitido', {
        requestId,
        messageId: message.id,
        leadId: lead.id,
    });
    // Criar Activity para rastreamento
    logger_1.logger.debug('[Webhook] Criando activity de mensagem recebida...', {
        requestId,
        leadId: lead.id,
    });
    await database_1.prisma.activity.create({
        data: {
            leadId: lead.id,
            type: 'whatsapp_received',
            details: JSON.stringify({
                messageId: message.id,
                externalId: data.key.id,
                preview: conteudo.substring(0, 200),
                instance: event.instance,
            }),
        },
    });
    // Bug 2 Fix: Atualizar lead.status e temperatura quando mensagem inbound é recebida
    const deveMudarStatus = lead.status === 'new' || lead.status === 'contacted';
    const deveMudarTemperatura = lead.temperature === 'cold';
    if (deveMudarStatus || deveMudarTemperatura) {
        const atualizacaoLead = {};
        if (deveMudarStatus) {
            atualizacaoLead.status = 'replied';
            logger_1.logger.info('[Webhook] Atualizando lead.status para replied', {
                requestId,
                leadId: lead.id,
                statusAnterior: lead.status,
            });
        }
        if (deveMudarTemperatura) {
            atualizacaoLead.temperature = 'warm';
            logger_1.logger.info('[Webhook] Atualizando lead.temperature para warm (era cold)', {
                requestId,
                leadId: lead.id,
            });
        }
        await database_1.prisma.lead.update({
            where: { id: lead.id },
            data: atualizacaoLead,
        });
        logger_1.logger.info('[Webhook] Lead atualizado apos mensagem inbound', {
            requestId,
            leadId: lead.id,
            atualizacoes: atualizacaoLead,
        });
    }
    logger_1.logger.info('[Webhook] MESSAGES_UPSERT processado com sucesso', {
        requestId,
        leadId: lead.id,
        messageId: message.id,
    });
}
/**
 * Processa MESSAGES_UPDATE — atualização de status de mensagem enviada.
 */
async function handleMessagesUpdate(event, data) {
    const requestId = `wmu_${Date.now()}`;
    logger_1.logger.info('[Webhook] MESSAGES_UPDATE recebido', {
        requestId,
        instance: event.instance,
        messageId: data.key.id,
        status: data.update?.status,
    });
    const evolutionStatus = data.update?.status ?? data.status;
    const statusInterno = mapearStatus(evolutionStatus);
    logger_1.logger.debug('[Webhook] Status mapeado', {
        requestId,
        evolutionStatus,
        statusInterno,
    });
    // Buscar a mensagem pelo externalId
    logger_1.logger.debug('[Webhook] Buscando mensagem pelo externalId...', {
        requestId,
        externalId: data.key.id,
    });
    const mensagem = await database_1.prisma.message.findFirst({
        where: { externalId: data.key.id },
    });
    if (!mensagem) {
        logger_1.logger.warn('[Webhook] Mensagem não encontrada para atualizar status', {
            requestId,
            externalId: data.key.id,
        });
        return;
    }
    logger_1.logger.debug('[Webhook] Mensagem encontrada, atualizando status...', {
        requestId,
        messageId: mensagem.id,
        statusAntigo: mensagem.status,
        statusNovo: statusInterno,
    });
    // Preparar campos de data conforme status
    const atualizacao = { status: statusInterno };
    if (statusInterno === 'delivered' && !mensagem.deliveredAt) {
        atualizacao.deliveredAt = new Date();
    }
    if (statusInterno === 'read' && !mensagem.readAt) {
        atualizacao.readAt = new Date();
        if (!mensagem.deliveredAt)
            atualizacao.deliveredAt = new Date();
    }
    await database_1.prisma.message.update({
        where: { id: mensagem.id },
        data: atualizacao,
    });
    logger_1.logger.info('[Webhook] Status da mensagem atualizado', {
        requestId,
        messageId: mensagem.id,
        statusNovo: statusInterno,
    });
    // Notificar clientes SSE sobre atualização de status
    (0, events_controller_1.emitSSE)('message_status', {
        messageId: mensagem.id,
        leadId: mensagem.leadId,
        status: statusInterno,
        externalId: data.key.id,
        timestamp: new Date().toISOString(),
    });
    logger_1.logger.debug('[Webhook] Evento SSE message_status emitido', {
        requestId,
        messageId: mensagem.id,
        status: statusInterno,
    });
}
/**
 * Processa CONNECTION_UPDATE — mudança de estado da conexão WhatsApp.
 */
async function handleConnectionUpdate(event, data) {
    logger_1.logger.info('[Webhook] CONNECTION_UPDATE recebido', {
        instance: event.instance,
        state: data.state,
        statusReason: data.statusReason,
    });
    if (data.state === 'open') {
        logger_1.logger.info('[Webhook] WhatsApp conectado', { instance: event.instance });
    }
    else if (data.state === 'close') {
        logger_1.logger.warn('[Webhook] WhatsApp desconectado', {
            instance: event.instance,
            statusReason: data.statusReason,
        });
    }
    else {
        logger_1.logger.debug('[Webhook] WhatsApp em estado intermediário', {
            instance: event.instance,
            state: data.state,
        });
    }
}
// ---------------------------------------------------------------------------
// Router Express
// ---------------------------------------------------------------------------
exports.whatsappWebhookRouter = (0, express_1.Router)();
/**
 * POST /api/webhooks/evolution
 * Recebe eventos da Evolution API e os processa.
 */
exports.whatsappWebhookRouter.post('/', async (req, res) => {
    const requestId = `wh_${Date.now()}`;
    logger_1.logger.info('[Webhook] Evento Evolution recebido', {
        requestId,
        headers: {
            'content-type': req.headers['content-type'],
        },
    });
    logger_1.logger.debug('[Webhook] Payload completo', {
        requestId,
        body: req.body,
    });
    // Responder 200 imediatamente para a Evolution API não reenviar o evento
    res.status(200).json({ received: true });
    // Processar evento de forma assíncrona
    const event = req.body;
    if (!event || !event.event) {
        logger_1.logger.warn('[Webhook] Payload sem campo event', { requestId });
        return;
    }
    logger_1.logger.info('[Webhook] Processando evento', {
        requestId,
        eventType: event.event,
        instance: event.instance,
    });
    switch (event.event) {
        case 'MESSAGES_UPSERT':
            try {
                await handleMessagesUpsert(event, event.data);
                logger_1.logger.info('[Webhook] MESSAGES_UPSERT processado com sucesso', {
                    requestId,
                    instance: event.instance,
                });
            }
            catch (error) {
                const err = error;
                logger_1.logger.error('[Webhook] Erro ao processar MESSAGES_UPSERT', {
                    requestId,
                    instance: event.instance,
                    errorType: err.constructor.name,
                    errorMessage: err.message,
                    errorStack: err.stack,
                });
                // Não relançar — webhook já respondeu 200 à Evolution API
            }
            break;
        case 'MESSAGES_UPDATE':
            try {
                await handleMessagesUpdate(event, event.data);
                logger_1.logger.info('[Webhook] MESSAGES_UPDATE processado com sucesso', {
                    requestId,
                    instance: event.instance,
                });
            }
            catch (error) {
                const err = error;
                logger_1.logger.error('[Webhook] Erro ao processar MESSAGES_UPDATE', {
                    requestId,
                    instance: event.instance,
                    errorType: err.constructor.name,
                    errorMessage: err.message,
                    errorStack: err.stack,
                });
                // Não relançar — webhook já respondeu 200 à Evolution API
            }
            break;
        case 'CONNECTION_UPDATE':
            try {
                await handleConnectionUpdate(event, event.data);
                logger_1.logger.info('[Webhook] CONNECTION_UPDATE processado com sucesso', {
                    requestId,
                    instance: event.instance,
                });
            }
            catch (error) {
                const err = error;
                logger_1.logger.error('[Webhook] Erro ao processar CONNECTION_UPDATE', {
                    requestId,
                    instance: event.instance,
                    errorType: err.constructor.name,
                    errorMessage: err.message,
                    errorStack: err.stack,
                });
                // Não relançar — webhook já respondeu 200 à Evolution API
            }
            break;
        default:
            logger_1.logger.debug('[Webhook] Evento não processado (ignorado)', {
                requestId,
                eventType: event.event,
            });
    }
});
//# sourceMappingURL=whatsapp.webhook.js.map