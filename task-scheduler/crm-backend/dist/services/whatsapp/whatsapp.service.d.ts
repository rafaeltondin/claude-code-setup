import { EvolutionConfig, SendMessageResponse, WhatsAppNumberCheckResult, ConnectionState } from './whatsapp.types';
export declare class WhatsAppService {
    private readonly config;
    private readonly baseUrl;
    private readonly headers;
    private readonly rateLimit;
    constructor(config: EvolutionConfig);
    /**
     * Realiza uma requisição HTTP para a Evolution API.
     */
    private request;
    /**
     * Verifica se o horário atual está dentro da janela de envio permitida.
     */
    private isWithinSendingHours;
    /**
     * Remove timestamps de envio mais antigos que 1 hora.
     */
    private pruneOldTimestamps;
    /**
     * Aplica rate limiting antes de cada envio de mensagem.
     * - Bloqueia fora do horário 08:00-20:00
     * - Máximo de 30 envios por hora
     * - Intervalo mínimo de 30 segundos entre envios
     */
    private applyRateLimit;
    /**
     * Registra um envio bem-sucedido no controle de rate limiting.
     */
    private registerSend;
    /**
     * Envia mensagem de texto para um número WhatsApp.
     */
    sendText(number: string, text: string): Promise<SendMessageResponse>;
    /**
     * Envia mídia (imagem, vídeo, áudio, documento) para um número WhatsApp.
     */
    sendMedia(number: string, media: {
        mediatype: 'image' | 'video' | 'audio' | 'document';
        media: string;
        fileName?: string;
        mimetype?: string;
    }, caption?: string): Promise<SendMessageResponse>;
    /**
     * Busca mensagens de um chat pelo remoteJid.
     */
    findMessages(remoteJid: string): Promise<unknown[]>;
    /**
     * Verifica se uma lista de números possui conta WhatsApp ativa.
     */
    checkNumbers(numbers: string[]): Promise<WhatsAppNumberCheckResult[]>;
    /**
     * Retorna o estado atual da conexão da instância.
     */
    getConnectionState(): Promise<ConnectionState>;
    /**
     * Configura o webhook da instância para receber eventos.
     */
    setWebhook(webhookUrl: string): Promise<unknown>;
}
/**
 * Cria uma nova instância do WhatsAppService com a configuração fornecida.
 */
export declare function createWhatsAppService(config: EvolutionConfig): WhatsAppService;
/**
 * Retorna o singleton do WhatsAppService.
 * Deve ter sido inicializado com initWhatsAppService() antes de ser chamado.
 */
export declare function getWhatsAppService(): WhatsAppService;
/**
 * Inicializa o singleton do WhatsAppService com a configuração fornecida.
 */
export declare function initWhatsAppService(config: EvolutionConfig): WhatsAppService;
//# sourceMappingURL=whatsapp.service.d.ts.map