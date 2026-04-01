import { SmtpConfig, SendEmailPayload, SendEmailResult } from './email.types';
export declare class EmailService {
    private readonly config;
    private transporter;
    constructor(config: SmtpConfig);
    /**
     * Retorna o transporter Nodemailer, criando-o na primeira chamada (lazy init).
     */
    private getTransporter;
    /**
     * Retorna o endereço do remetente formatado.
     * Usa fromName e fromEmail se definidos, caso contrário usa o user da config.
     */
    private getFromAddress;
    /**
     * Envia um e-mail via SMTP.
     */
    sendEmail(payload: SendEmailPayload): Promise<SendEmailResult>;
    /**
     * Verifica se a conexão SMTP está funcionando.
     * Retorna true em caso de sucesso, false em caso de falha.
     */
    verifyConnection(): Promise<boolean>;
    /**
     * Fecha o transporter e libera recursos.
     */
    close(): void;
}
/**
 * Cria uma nova instância do EmailService com a configuração fornecida.
 */
export declare function createEmailService(config: SmtpConfig): EmailService;
/**
 * Retorna o singleton do EmailService.
 * Deve ter sido inicializado com initEmailService() antes.
 */
export declare function getEmailService(): EmailService;
/**
 * Inicializa o singleton do EmailService com a configuração fornecida.
 */
export declare function initEmailService(config: SmtpConfig): EmailService;
//# sourceMappingURL=email.service.d.ts.map