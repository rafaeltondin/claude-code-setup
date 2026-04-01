"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppService = void 0;
exports.createWhatsAppService = createWhatsAppService;
exports.getWhatsAppService = getWhatsAppService;
exports.initWhatsAppService = initWhatsAppService;
const logger_1 = require("../../utils/logger");
const errors_1 = require("../../utils/errors");
// ---------------------------------------------------------------------------
// Constantes de rate limiting
// ---------------------------------------------------------------------------
/** Intervalo mínimo entre envios consecutivos (ms) */
const MIN_INTERVAL_MS = 30_000; // 30 segundos
/** Máximo de mensagens por hora */
const MAX_PER_HOUR = 30;
/** Horário de início de envios (hora local, 24h) */
const SEND_HOUR_START = 8;
/** Horário de encerramento de envios (hora local, 24h) */
const SEND_HOUR_END = 20;
// ---------------------------------------------------------------------------
// Classe principal
// ---------------------------------------------------------------------------
class WhatsAppService {
    config;
    baseUrl;
    headers;
    rateLimit;
    constructor(config) {
        this.config = config;
        this.baseUrl = config.url.replace(/\/$/, '');
        this.headers = {
            'Content-Type': 'application/json',
            'apikey': config.apiKey,
        };
        this.rateLimit = {
            sentTimestamps: [],
            lastSentAt: 0,
        };
        logger_1.logger.info('[WhatsAppService] Service inicializado', {
            instance: config.instance,
            baseUrl: this.baseUrl,
        });
    }
    // -------------------------------------------------------------------------
    // Helpers internos
    // -------------------------------------------------------------------------
    /**
     * Realiza uma requisição HTTP para a Evolution API.
     */
    async request(method, path, body) {
        const url = `${this.baseUrl}${path}`;
        logger_1.logger.debug('[WhatsAppService] Requisição HTTP', { method, url });
        const response = await fetch(url, {
            method,
            headers: this.headers,
            body: body !== undefined ? JSON.stringify(body) : undefined,
        });
        const text = await response.text();
        let data;
        try {
            data = JSON.parse(text);
        }
        catch {
            data = text;
        }
        if (!response.ok) {
            logger_1.logger.error('[WhatsAppService] Erro na resposta da API', {
                method,
                url,
                status: response.status,
                body: data,
            });
            throw new errors_1.AppError(response.status, `Evolution API erro: ${response.status} — ${JSON.stringify(data)}`, 'EVOLUTION_API_ERROR');
        }
        logger_1.logger.debug('[WhatsAppService] Resposta recebida', {
            method,
            url,
            status: response.status,
        });
        return data;
    }
    /**
     * Verifica se o horário atual está dentro da janela de envio permitida.
     */
    isWithinSendingHours() {
        const hour = new Date().getHours();
        return hour >= SEND_HOUR_START && hour < SEND_HOUR_END;
    }
    /**
     * Remove timestamps de envio mais antigos que 1 hora.
     */
    pruneOldTimestamps() {
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        this.rateLimit.sentTimestamps = this.rateLimit.sentTimestamps.filter((ts) => ts > oneHourAgo);
    }
    /**
     * Aplica rate limiting antes de cada envio de mensagem.
     * - Bloqueia fora do horário 08:00-20:00
     * - Máximo de 30 envios por hora
     * - Intervalo mínimo de 30 segundos entre envios
     */
    async applyRateLimit() {
        logger_1.logger.debug('[WhatsAppService] Verificando rate limit...');
        // Verificar horário
        if (!this.isWithinSendingHours()) {
            const hora = new Date().getHours();
            logger_1.logger.warn('[WhatsAppService] Envio bloqueado fora do horário permitido', {
                hora,
                horarioPermitido: `${SEND_HOUR_START}:00 - ${SEND_HOUR_END}:00`,
            });
            throw new errors_1.AppError(429, `Envios de WhatsApp permitidos apenas entre ${SEND_HOUR_START}h e ${SEND_HOUR_END}h`, 'OUTSIDE_SENDING_HOURS');
        }
        // Remover timestamps antigos
        this.pruneOldTimestamps();
        // Verificar limite por hora
        if (this.rateLimit.sentTimestamps.length >= MAX_PER_HOUR) {
            logger_1.logger.warn('[WhatsAppService] Limite de mensagens por hora atingido', {
                enviadas: this.rateLimit.sentTimestamps.length,
                limite: MAX_PER_HOUR,
            });
            throw new errors_1.AppError(429, `Limite de ${MAX_PER_HOUR} mensagens por hora atingido`, 'HOURLY_RATE_LIMIT');
        }
        // Verificar intervalo mínimo entre envios
        const agora = Date.now();
        const tempoDesdeUltimoEnvio = agora - this.rateLimit.lastSentAt;
        if (this.rateLimit.lastSentAt > 0 && tempoDesdeUltimoEnvio < MIN_INTERVAL_MS) {
            const aguardar = MIN_INTERVAL_MS - tempoDesdeUltimoEnvio;
            logger_1.logger.info('[WhatsAppService] Aguardando intervalo mínimo entre envios', {
                aguardarMs: aguardar,
                aguardarSegundos: Math.ceil(aguardar / 1000),
            });
            await new Promise((resolve) => setTimeout(resolve, aguardar));
        }
        logger_1.logger.debug('[WhatsAppService] Rate limit OK', {
            enviadosNaHora: this.rateLimit.sentTimestamps.length,
            limiteHora: MAX_PER_HOUR,
        });
    }
    /**
     * Registra um envio bem-sucedido no controle de rate limiting.
     */
    registerSend() {
        const agora = Date.now();
        this.rateLimit.sentTimestamps.push(agora);
        this.rateLimit.lastSentAt = agora;
        logger_1.logger.debug('[WhatsAppService] Envio registrado no rate limit', {
            totalNaHora: this.rateLimit.sentTimestamps.length,
        });
    }
    // -------------------------------------------------------------------------
    // Métodos públicos
    // -------------------------------------------------------------------------
    /**
     * Envia mensagem de texto para um número WhatsApp.
     */
    async sendText(number, text) {
        logger_1.logger.info('[WhatsAppService.sendText] INÍCIO', {
            number,
            textPreview: text.substring(0, 50),
        });
        await this.applyRateLimit();
        const payload = {
            number,
            text,
            options: {
                presence: 'composing',
                linkPreview: false,
            },
        };
        logger_1.logger.debug('[WhatsAppService.sendText] Enviando payload', { number });
        const result = await this.request('POST', `/message/sendText/${this.config.instance}`, payload);
        this.registerSend();
        logger_1.logger.info('[WhatsAppService.sendText] FIM - Mensagem enviada', {
            number,
            messageId: result.key?.id,
            status: result.status,
        });
        return result;
    }
    /**
     * Envia mídia (imagem, vídeo, áudio, documento) para um número WhatsApp.
     */
    async sendMedia(number, media, caption) {
        logger_1.logger.info('[WhatsAppService.sendMedia] INÍCIO', {
            number,
            mediatype: media.mediatype,
            caption: caption?.substring(0, 50),
        });
        await this.applyRateLimit();
        const payload = {
            number,
            mediaMessage: {
                ...media,
                caption,
            },
            options: { presence: 'composing' },
        };
        logger_1.logger.debug('[WhatsAppService.sendMedia] Enviando payload', {
            number,
            mediatype: media.mediatype,
        });
        const result = await this.request('POST', `/message/sendMedia/${this.config.instance}`, payload);
        this.registerSend();
        logger_1.logger.info('[WhatsAppService.sendMedia] FIM - Mídia enviada', {
            number,
            messageId: result.key?.id,
            status: result.status,
        });
        return result;
    }
    /**
     * Busca mensagens de um chat pelo remoteJid.
     */
    async findMessages(remoteJid) {
        logger_1.logger.info('[WhatsAppService.findMessages] INÍCIO', { remoteJid });
        const result = await this.request('GET', `/chat/findMessages/${this.config.instance}?remoteJid=${encodeURIComponent(remoteJid)}`);
        const messages = result?.messages?.records ?? [];
        logger_1.logger.info('[WhatsAppService.findMessages] FIM', {
            remoteJid,
            total: messages.length,
        });
        return messages;
    }
    /**
     * Verifica se uma lista de números possui conta WhatsApp ativa.
     */
    async checkNumbers(numbers) {
        logger_1.logger.info('[WhatsAppService.checkNumbers] INÍCIO', {
            quantidade: numbers.length,
        });
        const result = await this.request('POST', `/chat/whatsappNumbers/${this.config.instance}`, { numbers });
        logger_1.logger.info('[WhatsAppService.checkNumbers] FIM', {
            quantidade: numbers.length,
            existentes: result.filter((r) => r.exists).length,
        });
        return result;
    }
    /**
     * Retorna o estado atual da conexão da instância.
     */
    async getConnectionState() {
        logger_1.logger.info('[WhatsAppService.getConnectionState] Consultando estado...', {
            instance: this.config.instance,
        });
        const result = await this.request('GET', `/instance/connectionState/${this.config.instance}`);
        logger_1.logger.info('[WhatsAppService.getConnectionState] Estado obtido', {
            instance: this.config.instance,
            state: result.state,
        });
        return result;
    }
    /**
     * Configura o webhook da instância para receber eventos.
     */
    async setWebhook(webhookUrl) {
        logger_1.logger.info('[WhatsAppService.setWebhook] Configurando webhook...', {
            instance: this.config.instance,
            webhookUrl,
        });
        const payload = {
            url: webhookUrl,
            byEvents: false,
            base64: false,
            events: [
                'MESSAGES_UPSERT',
                'MESSAGES_UPDATE',
                'CONNECTION_UPDATE',
                'SEND_MESSAGE',
            ],
        };
        const result = await this.request('POST', `/webhook/set/${this.config.instance}`, payload);
        logger_1.logger.info('[WhatsAppService.setWebhook] Webhook configurado com sucesso', {
            instance: this.config.instance,
            webhookUrl,
        });
        return result;
    }
}
exports.WhatsAppService = WhatsAppService;
// ---------------------------------------------------------------------------
// Factory e singleton
// ---------------------------------------------------------------------------
let _instance = null;
/**
 * Cria uma nova instância do WhatsAppService com a configuração fornecida.
 */
function createWhatsAppService(config) {
    logger_1.logger.debug('[createWhatsAppService] Criando novo WhatsAppService', {
        instance: config.instance,
    });
    return new WhatsAppService(config);
}
/**
 * Retorna o singleton do WhatsAppService.
 * Deve ter sido inicializado com initWhatsAppService() antes de ser chamado.
 */
function getWhatsAppService() {
    if (!_instance) {
        throw new errors_1.AppError(500, 'WhatsAppService não foi inicializado. Chame initWhatsAppService() primeiro.', 'WHATSAPP_NOT_INITIALIZED');
    }
    return _instance;
}
/**
 * Inicializa o singleton do WhatsAppService com a configuração fornecida.
 */
function initWhatsAppService(config) {
    logger_1.logger.info('[initWhatsAppService] Inicializando singleton WhatsAppService', {
        instance: config.instance,
    });
    _instance = new WhatsAppService(config);
    return _instance;
}
//# sourceMappingURL=whatsapp.service.js.map