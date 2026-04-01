import { ImapConfig, EmailMessage } from './email.types';
export declare class EmailReader {
    private readonly config;
    private client;
    private pollingTimer;
    private isConnected;
    constructor(config: ImapConfig);
    /**
     * Conecta ao servidor IMAP. Deve ser chamado antes de fetchNewEmails.
     */
    connect(): Promise<void>;
    /**
     * Desconecta do servidor IMAP e libera recursos.
     */
    disconnect(): Promise<void>;
    /**
     * Garante que o client está conectado antes de usar.
     */
    private ensureConnected;
    /**
     * Busca emails não lidos (UNSEEN) desde a data especificada.
     * Faz match com leads pelo campo email e preenche matchedLeadId.
     */
    fetchNewEmails(since?: Date): Promise<EmailMessage[]>;
    /**
     * Inicia o polling periódico de novos emails.
     *
     * @param intervalMs - Intervalo entre verificações em ms
     * @param callback - Função chamada a cada verificação com os emails encontrados
     */
    startPolling(intervalMs: number, callback: (emails: EmailMessage[]) => void): void;
    /**
     * Para o polling de novos emails.
     */
    stopPolling(): void;
}
/**
 * Cria uma nova instância do EmailReader com a configuração fornecida.
 */
export declare function createEmailReader(config: ImapConfig): EmailReader;
/**
 * Retorna o singleton do EmailReader.
 * Deve ter sido inicializado com initEmailReader() antes.
 */
export declare function getEmailReader(): EmailReader;
/**
 * Inicializa o singleton do EmailReader com a configuração fornecida.
 */
export declare function initEmailReader(config: ImapConfig): EmailReader;
//# sourceMappingURL=email.reader.d.ts.map