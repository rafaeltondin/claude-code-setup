/**
 * Tipos e interfaces para integração com a Evolution API (WhatsApp)
 */
export interface EvolutionConfig {
    /** URL base da Evolution API, ex: https://evolution.YOUR-DOMAIN.com */
    url: string;
    /** API Key global da Evolution API */
    apiKey: string;
    /** Nome da instância WhatsApp, ex: cenora */
    instance: string;
}
export interface SendTextPayload {
    number: string;
    text: string;
    options?: {
        delay?: number;
        presence?: 'composing' | 'recording' | 'available' | 'unavailable';
        linkPreview?: boolean;
    };
}
export interface SendMediaPayload {
    number: string;
    mediaMessage: {
        mediatype: 'image' | 'video' | 'audio' | 'document';
        media: string;
        caption?: string;
        fileName?: string;
        mimetype?: string;
    };
    options?: {
        delay?: number;
        presence?: 'composing' | 'recording' | 'available' | 'unavailable';
    };
}
export interface MessageKey {
    remoteJid: string;
    fromMe: boolean;
    id: string;
}
export interface SendMessageResponse {
    key: MessageKey;
    message: Record<string, unknown>;
    messageTimestamp: string;
    status: string;
}
export interface WhatsAppNumberCheckResult {
    exists: boolean;
    jid: string;
    number: string;
}
export type ConnectionStateValue = 'open' | 'close' | 'connecting';
export interface ConnectionState {
    instance: string;
    state: ConnectionStateValue;
}
export type WebhookEventType = 'MESSAGES_UPSERT' | 'MESSAGES_UPDATE' | 'CONNECTION_UPDATE' | 'QRCODE_UPDATED' | 'SEND_MESSAGE';
export interface WebhookMessageKey {
    remoteJid: string;
    fromMe: boolean;
    id: string;
}
export interface WebhookMessageContent {
    conversation?: string;
    extendedTextMessage?: {
        text: string;
    };
    imageMessage?: {
        caption?: string;
        url?: string;
        mimetype?: string;
    };
    videoMessage?: {
        caption?: string;
        url?: string;
        mimetype?: string;
    };
    audioMessage?: {
        url?: string;
        mimetype?: string;
    };
    documentMessage?: {
        title?: string;
        url?: string;
        mimetype?: string;
    };
}
export interface WebhookMessageData {
    key: WebhookMessageKey;
    pushName?: string;
    message?: WebhookMessageContent;
    messageTimestamp?: number;
    status?: string;
}
export interface WebhookMessageUpdateData {
    key: WebhookMessageKey;
    status: 'PENDING' | 'SERVER_ACK' | 'DELIVERY_ACK' | 'READ' | 'PLAYED' | 'ERROR';
    update: {
        status: string;
    };
}
export interface WebhookConnectionUpdateData {
    instance: string;
    state: ConnectionStateValue;
    statusReason?: number;
}
export interface WebhookEvent {
    event: WebhookEventType;
    instance: string;
    data: WebhookMessageData | WebhookMessageUpdateData | WebhookConnectionUpdateData | unknown;
    destination?: string;
    date_time?: string;
    sender?: string;
    server_url?: string;
    apikey?: string;
}
export interface RateLimitState {
    /** Timestamps dos envios na última hora (ms) */
    sentTimestamps: number[];
    /** Timestamp do último envio (ms) */
    lastSentAt: number;
}
//# sourceMappingURL=whatsapp.types.d.ts.map