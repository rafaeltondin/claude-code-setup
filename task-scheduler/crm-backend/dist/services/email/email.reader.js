"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailReader = void 0;
exports.createEmailReader = createEmailReader;
exports.getEmailReader = getEmailReader;
exports.initEmailReader = initEmailReader;
const imapflow_1 = require("imapflow");
const database_1 = require("../../config/database");
const logger_1 = require("../../utils/logger");
const errors_1 = require("../../utils/errors");
// ---------------------------------------------------------------------------
// Helper de parsing de endereços
// ---------------------------------------------------------------------------
/**
 * Converte objeto de endereço do ImapFlow para nosso tipo EmailAddress.
 */
function parseAddress(raw) {
    if (!raw)
        return undefined;
    return {
        name: raw.name,
        address: raw.address ?? '',
    };
}
/**
 * Converte lista de endereços do ImapFlow para array de EmailAddress.
 */
function parseAddressList(raw) {
    if (!Array.isArray(raw))
        return [];
    return raw.map((a) => ({ name: a.name, address: a.address ?? '' }));
}
// ---------------------------------------------------------------------------
// Classe principal
// ---------------------------------------------------------------------------
class EmailReader {
    config;
    client = null;
    pollingTimer = null;
    isConnected = false;
    constructor(config) {
        this.config = config;
        logger_1.logger.info('[EmailReader] Reader inicializado', {
            host: config.host,
            port: config.port,
            user: config.user,
            mailbox: config.mailbox ?? 'INBOX',
        });
    }
    // -------------------------------------------------------------------------
    // Conexão
    // -------------------------------------------------------------------------
    /**
     * Conecta ao servidor IMAP. Deve ser chamado antes de fetchNewEmails.
     */
    async connect() {
        if (this.isConnected) {
            logger_1.logger.debug('[EmailReader.connect] Já conectado, ignorando chamada dupla');
            return;
        }
        logger_1.logger.info('[EmailReader.connect] Conectando ao servidor IMAP...', {
            host: this.config.host,
            port: this.config.port,
            user: this.config.user,
        });
        // Quando conectando via SSH tunnel (localhost), o certificado do servidor
        // remoto não bate com "localhost" — seguro ignorar porque o tunnel SSH já criptografa
        const isLocalTunnel = this.config.host === 'localhost' || this.config.host === '127.0.0.1';
        this.client = new imapflow_1.ImapFlow({
            host: this.config.host,
            port: this.config.port,
            secure: this.config.secure,
            auth: {
                user: this.config.user,
                pass: this.config.pass,
            },
            logger: false,
            ...(isLocalTunnel && { tls: { rejectUnauthorized: false } }),
        });
        // Capturar erros de conexão
        this.client.on('error', (error) => {
            logger_1.logger.error('[EmailReader] Erro de conexão IMAP', {
                host: this.config.host,
                errorType: error.constructor.name,
                errorMessage: error.message,
            });
            this.isConnected = false;
        });
        try {
            await this.client.connect();
            this.isConnected = true;
            logger_1.logger.info('[EmailReader.connect] Conectado ao IMAP com sucesso', {
                host: this.config.host,
                user: this.config.user,
            });
        }
        catch (error) {
            const err = error;
            this.client = null;
            this.isConnected = false;
            logger_1.logger.error('[EmailReader.connect] Falha ao conectar ao IMAP', {
                host: this.config.host,
                errorType: err.constructor.name,
                errorMessage: err.message,
                errorStack: err.stack,
            });
            throw new errors_1.AppError(500, `Falha ao conectar ao IMAP: ${err.message}`, 'IMAP_CONNECT_FAILED');
        }
    }
    /**
     * Desconecta do servidor IMAP e libera recursos.
     */
    async disconnect() {
        logger_1.logger.info('[EmailReader.disconnect] Desconectando do IMAP...', {
            host: this.config.host,
        });
        this.stopPolling();
        if (this.client && this.isConnected) {
            try {
                await this.client.logout();
                logger_1.logger.info('[EmailReader.disconnect] Desconectado com sucesso');
            }
            catch (error) {
                const err = error;
                logger_1.logger.warn('[EmailReader.disconnect] Erro ao desconectar (ignorado)', {
                    errorMessage: err.message,
                });
            }
        }
        this.client = null;
        this.isConnected = false;
    }
    /**
     * Garante que o client está conectado antes de usar.
     */
    ensureConnected() {
        if (!this.client || !this.isConnected) {
            throw new errors_1.AppError(500, 'EmailReader não está conectado. Chame connect() primeiro.', 'IMAP_NOT_CONNECTED');
        }
        return this.client;
    }
    // -------------------------------------------------------------------------
    // Fetch de emails
    // -------------------------------------------------------------------------
    /**
     * Busca emails não lidos (UNSEEN) desde a data especificada.
     * Faz match com leads pelo campo email e preenche matchedLeadId.
     */
    async fetchNewEmails(since) {
        const requestId = `imap_${Date.now()}`;
        const mailbox = this.config.mailbox ?? 'INBOX';
        const sinceDate = since ?? new Date(Date.now() - 24 * 60 * 60 * 1000); // padrão: últimas 24h
        logger_1.logger.info('[EmailReader.fetchNewEmails] INÍCIO', {
            requestId,
            mailbox,
            since: sinceDate.toISOString(),
        });
        const client = this.ensureConnected();
        // Abrir mailbox
        logger_1.logger.debug('[EmailReader.fetchNewEmails] Abrindo mailbox...', {
            requestId,
            mailbox,
        });
        const lock = await client.getMailboxLock(mailbox);
        const emails = [];
        try {
            // Buscar UIDs de mensagens não lidas
            logger_1.logger.debug('[EmailReader.fetchNewEmails] Buscando UIDs UNSEEN...', {
                requestId,
                since: sinceDate.toISOString(),
            });
            // ImapFlow usa `seen: false` para filtrar não lidos (UNSEEN)
            const searchResult = await client.search({
                seen: false,
                since: sinceDate,
            });
            // search() retorna false se não há mensagens ou number[] se há resultados
            const uids = searchResult === false ? [] : searchResult;
            logger_1.logger.info('[EmailReader.fetchNewEmails] UIDs encontrados', {
                requestId,
                total: uids.length,
            });
            if (uids.length === 0) {
                logger_1.logger.info('[EmailReader.fetchNewEmails] Nenhum email novo encontrado', {
                    requestId,
                });
                return [];
            }
            // Buscar conteúdo das mensagens
            logger_1.logger.debug('[EmailReader.fetchNewEmails] Buscando conteúdo das mensagens...', {
                requestId,
                uids,
            });
            for await (const msg of client.fetch(uids, {
                envelope: true,
                bodyStructure: true,
                flags: true,
                source: true,
            })) {
                logger_1.logger.debug('[EmailReader.fetchNewEmails] Processando mensagem', {
                    requestId,
                    uid: msg.uid,
                    subject: msg.envelope?.subject,
                });
                // Extrair texto e HTML do source da mensagem
                let textContent;
                let htmlContent;
                if (msg.source) {
                    const sourceStr = msg.source.toString('utf8');
                    // Extração simples de texto da mensagem (source completo)
                    // Para parsing mais robusto, o ideal é usar mailparser com stream
                    const plainMatch = sourceStr.match(/Content-Type: text\/plain[\s\S]*?\r\n\r\n([\s\S]*?)(?:\r\n--|\r\n\r\n--)/i);
                    const htmlMatch = sourceStr.match(/Content-Type: text\/html[\s\S]*?\r\n\r\n([\s\S]*?)(?:\r\n--|\r\n\r\n--)/i);
                    textContent = plainMatch?.[1]?.trim();
                    htmlContent = htmlMatch?.[1]?.trim();
                    // Fallback: se não encontrou partes, tentar o body completo
                    if (!textContent && !htmlContent) {
                        const bodyMatch = sourceStr.match(/\r\n\r\n([\s\S]+)$/);
                        textContent = bodyMatch?.[1]?.trim();
                    }
                }
                const email = {
                    uid: msg.uid,
                    messageId: msg.envelope?.messageId,
                    from: parseAddress(msg.envelope?.from?.[0]),
                    to: parseAddressList(msg.envelope?.to),
                    cc: parseAddressList(msg.envelope?.cc),
                    subject: msg.envelope?.subject,
                    date: msg.envelope?.date,
                    text: textContent,
                    html: htmlContent,
                    flags: Array.from(msg.flags ?? []),
                };
                // Match com lead pelo endereço do remetente
                if (email.from?.address) {
                    logger_1.logger.debug('[EmailReader.fetchNewEmails] Buscando lead pelo email...', {
                        requestId,
                        fromEmail: email.from.address,
                    });
                    // SQLite não suporta mode: 'insensitive' — normalizar para lowercase antes da busca
                    const emailLower = email.from.address.toLowerCase();
                    const lead = await database_1.prisma.lead.findFirst({
                        where: {
                            email: emailLower,
                        },
                        select: { id: true },
                    });
                    if (lead) {
                        email.matchedLeadId = lead.id;
                        logger_1.logger.debug('[EmailReader.fetchNewEmails] Lead encontrado para email', {
                            requestId,
                            fromEmail: email.from.address,
                            leadId: lead.id,
                        });
                    }
                    else {
                        logger_1.logger.debug('[EmailReader.fetchNewEmails] Nenhum lead encontrado para email', {
                            requestId,
                            fromEmail: email.from.address,
                        });
                    }
                }
                emails.push(email);
                logger_1.logger.debug('[EmailReader.fetchNewEmails] Mensagem processada', {
                    requestId,
                    uid: email.uid,
                    subject: email.subject,
                    matchedLeadId: email.matchedLeadId,
                });
            }
        }
        finally {
            lock.release();
        }
        logger_1.logger.info('[EmailReader.fetchNewEmails] FIM', {
            requestId,
            total: emails.length,
            comLead: emails.filter((e) => e.matchedLeadId).length,
        });
        return emails;
    }
    // -------------------------------------------------------------------------
    // Polling
    // -------------------------------------------------------------------------
    /**
     * Inicia o polling periódico de novos emails.
     *
     * @param intervalMs - Intervalo entre verificações em ms
     * @param callback - Função chamada a cada verificação com os emails encontrados
     */
    startPolling(intervalMs, callback) {
        if (this.pollingTimer) {
            logger_1.logger.warn('[EmailReader.startPolling] Polling já está ativo. Ignorando chamada dupla.');
            return;
        }
        logger_1.logger.info('[EmailReader.startPolling] Iniciando polling de emails', {
            intervalMs,
            intervalMinutes: Math.round(intervalMs / 60_000),
        });
        let ultimaVerificacao = new Date(Date.now() - intervalMs);
        const executar = async () => {
            const agora = new Date();
            logger_1.logger.debug('[EmailReader.polling] Executando verificação...', {
                since: ultimaVerificacao.toISOString(),
            });
            try {
                // Reconectar se necessário
                if (!this.isConnected) {
                    logger_1.logger.info('[EmailReader.polling] Reconectando ao IMAP...');
                    await this.connect();
                }
                const emails = await this.fetchNewEmails(ultimaVerificacao);
                ultimaVerificacao = agora;
                logger_1.logger.info('[EmailReader.polling] Verificação concluída', {
                    novosEmails: emails.length,
                    proximaVerificacaoEm: new Date(Date.now() + intervalMs).toISOString(),
                });
                if (emails.length > 0) {
                    callback(emails);
                }
            }
            catch (error) {
                const err = error;
                logger_1.logger.error('[EmailReader.polling] Erro durante verificação', {
                    errorType: err.constructor.name,
                    errorMessage: err.message,
                });
                // Marcar como desconectado para reconectar na próxima iteração
                this.isConnected = false;
            }
        };
        // Executar imediatamente e depois no intervalo
        executar();
        this.pollingTimer = setInterval(executar, intervalMs);
        logger_1.logger.info('[EmailReader.startPolling] Polling iniciado com sucesso', {
            intervalMs,
        });
    }
    /**
     * Para o polling de novos emails.
     */
    stopPolling() {
        if (this.pollingTimer) {
            clearInterval(this.pollingTimer);
            this.pollingTimer = null;
            logger_1.logger.info('[EmailReader.stopPolling] Polling interrompido');
        }
        else {
            logger_1.logger.debug('[EmailReader.stopPolling] Polling não estava ativo');
        }
    }
}
exports.EmailReader = EmailReader;
// ---------------------------------------------------------------------------
// Factory e singleton
// ---------------------------------------------------------------------------
let _instance = null;
/**
 * Cria uma nova instância do EmailReader com a configuração fornecida.
 */
function createEmailReader(config) {
    logger_1.logger.debug('[createEmailReader] Criando novo EmailReader', {
        host: config.host,
        user: config.user,
    });
    return new EmailReader(config);
}
/**
 * Retorna o singleton do EmailReader.
 * Deve ter sido inicializado com initEmailReader() antes.
 */
function getEmailReader() {
    if (!_instance) {
        throw new errors_1.AppError(500, 'EmailReader não foi inicializado. Chame initEmailReader() primeiro.', 'EMAIL_READER_NOT_INITIALIZED');
    }
    return _instance;
}
/**
 * Inicializa o singleton do EmailReader com a configuração fornecida.
 */
function initEmailReader(config) {
    logger_1.logger.info('[initEmailReader] Inicializando singleton EmailReader', {
        host: config.host,
        user: config.user,
    });
    _instance = new EmailReader(config);
    return _instance;
}
//# sourceMappingURL=email.reader.js.map