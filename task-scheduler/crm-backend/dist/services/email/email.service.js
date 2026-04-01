"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
exports.createEmailService = createEmailService;
exports.getEmailService = getEmailService;
exports.initEmailService = initEmailService;
const nodemailer_1 = __importDefault(require("nodemailer"));
const logger_1 = require("../../utils/logger");
const errors_1 = require("../../utils/errors");
// ---------------------------------------------------------------------------
// Classe principal
// ---------------------------------------------------------------------------
class EmailService {
    config;
    transporter = null;
    constructor(config) {
        this.config = config;
        logger_1.logger.info('[EmailService] Service inicializado', {
            host: config.host,
            port: config.port,
            secure: config.secure,
            user: config.user,
        });
    }
    // -------------------------------------------------------------------------
    // Inicialização lazy do transporter
    // -------------------------------------------------------------------------
    /**
     * Retorna o transporter Nodemailer, criando-o na primeira chamada (lazy init).
     */
    getTransporter() {
        if (!this.transporter) {
            logger_1.logger.debug('[EmailService] Criando transporter Nodemailer...', {
                host: this.config.host,
                port: this.config.port,
                secure: this.config.secure,
            });
            this.transporter = nodemailer_1.default.createTransport({
                host: this.config.host,
                port: this.config.port,
                secure: this.config.secure,
                auth: {
                    user: this.config.user,
                    pass: this.config.pass,
                },
                tls: {
                    rejectUnauthorized: false,
                },
            });
            logger_1.logger.debug('[EmailService] Transporter criado com sucesso');
        }
        return this.transporter;
    }
    /**
     * Retorna o endereço do remetente formatado.
     * Usa fromName e fromEmail se definidos, caso contrário usa o user da config.
     */
    getFromAddress() {
        const email = this.config.fromEmail ?? this.config.user;
        const name = this.config.fromName;
        return name ? `"${name}" <${email}>` : email;
    }
    // -------------------------------------------------------------------------
    // Métodos públicos
    // -------------------------------------------------------------------------
    /**
     * Envia um e-mail via SMTP.
     */
    async sendEmail(payload) {
        const requestId = `em_${Date.now()}`;
        const toArray = Array.isArray(payload.to) ? payload.to : [payload.to];
        logger_1.logger.info('[EmailService.sendEmail] INÍCIO', {
            requestId,
            to: toArray,
            subject: payload.subject,
            hasHtml: !!payload.html,
            attachments: payload.attachments?.length ?? 0,
        });
        const transporter = this.getTransporter();
        const from = this.getFromAddress();
        const mailOptions = {
            from,
            to: payload.to,
            cc: payload.cc,
            bcc: payload.bcc,
            replyTo: payload.replyTo,
            subject: payload.subject,
            text: payload.text,
            html: payload.html,
            attachments: payload.attachments,
        };
        logger_1.logger.debug('[EmailService.sendEmail] Opções de envio preparadas', {
            requestId,
            from,
            to: payload.to,
            subject: payload.subject,
        });
        logger_1.logger.info('[EmailService.sendEmail] Enviando email via SMTP...', {
            requestId,
            host: this.config.host,
        });
        const startTime = Date.now();
        let info;
        try {
            info = await transporter.sendMail(mailOptions);
        }
        catch (error) {
            const err = error;
            logger_1.logger.error('[EmailService.sendEmail] Erro ao enviar email', {
                requestId,
                errorType: err.constructor.name,
                errorMessage: err.message,
                errorStack: err.stack,
                to: payload.to,
                subject: payload.subject,
            });
            throw new errors_1.AppError(500, `Falha ao enviar e-mail: ${err.message}`, 'EMAIL_SEND_FAILED');
        }
        const responseTime = Date.now() - startTime;
        logger_1.logger.info('[EmailService.sendEmail] Email enviado com sucesso', {
            requestId,
            messageId: info.messageId,
            response: info.response,
            accepted: info.accepted,
            rejected: info.rejected,
            responseTimeMs: responseTime,
        });
        logger_1.logger.debug('[EmailService.sendEmail] Informações completas do envio', {
            requestId,
            info,
        });
        const result = {
            messageId: info.messageId,
            response: info.response,
            accepted: info.accepted ?? [],
            rejected: info.rejected ?? [],
        };
        logger_1.logger.info('[EmailService.sendEmail] FIM - Sucesso', {
            requestId,
            messageId: result.messageId,
            rejected: result.rejected.length,
        });
        return result;
    }
    /**
     * Verifica se a conexão SMTP está funcionando.
     * Retorna true em caso de sucesso, false em caso de falha.
     */
    async verifyConnection() {
        logger_1.logger.info('[EmailService.verifyConnection] Verificando conexão SMTP...', {
            host: this.config.host,
            port: this.config.port,
            secure: this.config.secure,
            user: this.config.user,
        });
        const transporter = this.getTransporter();
        try {
            await transporter.verify();
            logger_1.logger.info('[EmailService.verifyConnection] Conexão SMTP OK', {
                host: this.config.host,
                port: this.config.port,
            });
            return true;
        }
        catch (error) {
            const err = error;
            logger_1.logger.error('[EmailService.verifyConnection] Falha na conexão SMTP', {
                host: this.config.host,
                port: this.config.port,
                secure: this.config.secure,
                errorType: err.constructor.name,
                errorMessage: err.message,
                errorCode: err.code,
            });
            throw err;
        }
    }
    /**
     * Fecha o transporter e libera recursos.
     */
    close() {
        if (this.transporter) {
            logger_1.logger.debug('[EmailService] Fechando transporter...');
            this.transporter.close();
            this.transporter = null;
            logger_1.logger.info('[EmailService] Transporter fechado');
        }
    }
}
exports.EmailService = EmailService;
// ---------------------------------------------------------------------------
// Factory e singleton
// ---------------------------------------------------------------------------
let _instance = null;
/**
 * Cria uma nova instância do EmailService com a configuração fornecida.
 */
function createEmailService(config) {
    logger_1.logger.debug('[createEmailService] Criando novo EmailService', {
        host: config.host,
        user: config.user,
    });
    return new EmailService(config);
}
/**
 * Retorna o singleton do EmailService.
 * Deve ter sido inicializado com initEmailService() antes.
 */
function getEmailService() {
    if (!_instance) {
        throw new errors_1.AppError(500, 'EmailService não foi inicializado. Chame initEmailService() primeiro.', 'EMAIL_NOT_INITIALIZED');
    }
    return _instance;
}
/**
 * Inicializa o singleton do EmailService com a configuração fornecida.
 */
function initEmailService(config) {
    logger_1.logger.info('[initEmailService] Inicializando singleton EmailService', {
        host: config.host,
        user: config.user,
    });
    _instance = new EmailService(config);
    return _instance;
}
//# sourceMappingURL=email.service.js.map