/**
 * Tipos e interfaces para integração de Email (SMTP / IMAP)
 */
export interface SmtpConfig {
    /** Host do servidor SMTP, ex: smtp.gmail.com */
    host: string;
    /** Porta SMTP, ex: 587 (STARTTLS) ou 465 (SSL) */
    port: number;
    /** Usar TLS/SSL */
    secure: boolean;
    /** Usuário de autenticação (geralmente o e-mail) */
    user: string;
    /** Senha ou app password */
    pass: string;
    /** Nome exibido como remetente */
    fromName?: string;
    /** E-mail exibido como remetente (se diferente de user) */
    fromEmail?: string;
}
export interface ImapConfig {
    /** Host do servidor IMAP, ex: imap.gmail.com */
    host: string;
    /** Porta IMAP, ex: 993 (SSL) ou 143 (STARTTLS) */
    port: number;
    /** Usar TLS/SSL */
    secure: boolean;
    /** Usuário de autenticação */
    user: string;
    /** Senha ou app password */
    pass: string;
    /** Mailbox para monitorar, padrão: INBOX */
    mailbox?: string;
}
export interface EmailAttachment {
    /** Nome do arquivo como aparecerá no email */
    filename: string;
    /** Conteúdo do arquivo: Buffer, string base64 ou URL pública */
    content?: Buffer | string;
    /** URL do arquivo para download */
    path?: string;
    /** MIME type, ex: application/pdf */
    contentType?: string;
}
export interface SendEmailPayload {
    /** Destinatário(s): string ou array de strings */
    to: string | string[];
    /** Assunto do e-mail */
    subject: string;
    /** Corpo em texto puro */
    text: string;
    /** Corpo em HTML (opcional) */
    html?: string;
    /** Lista de anexos (opcional) */
    attachments?: EmailAttachment[];
    /** CC opcional */
    cc?: string | string[];
    /** BCC opcional */
    bcc?: string | string[];
    /** Reply-To opcional */
    replyTo?: string;
}
export interface EmailAddress {
    name?: string;
    address: string;
}
export interface EmailMessage {
    /** UID único no servidor IMAP */
    uid: number;
    /** Message-ID do cabeçalho */
    messageId?: string;
    /** Remetente */
    from?: EmailAddress;
    /** Destinatários */
    to?: EmailAddress[];
    /** CC */
    cc?: EmailAddress[];
    /** Assunto */
    subject?: string;
    /** Data de envio */
    date?: Date;
    /** Corpo em texto puro */
    text?: string;
    /** Corpo em HTML */
    html?: string;
    /** Flags IMAP: \Seen, \Answered, etc. */
    flags: string[];
    /** Lead associado (preenchido pelo EmailReader após match) */
    matchedLeadId?: string;
}
export interface SendEmailResult {
    /** Message-ID gerado pelo servidor SMTP */
    messageId: string;
    /** Resposta do servidor */
    response: string;
    /** Lista de destinatários aceitos */
    accepted: string[];
    /** Lista de destinatários rejeitados */
    rejected: string[];
}
//# sourceMappingURL=email.types.d.ts.map