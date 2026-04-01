import type { PaginatedResult } from '../leads/leads.service';
export declare function sendWhatsApp(leadId: string, content: string): Promise<unknown>;
export declare function sendEmail(leadId: string, subject: string, content: string, html?: string): Promise<unknown>;
export declare function getMessagesByLead(leadId: string, params: {
    page?: number;
    limit?: number;
}): Promise<PaginatedResult<unknown>>;
export declare function scheduleMessage(leadId: string, content: string, channel: string, scheduledFor: Date, subject?: string): Promise<unknown>;
/**
 * Busca todas as mensagens com status='scheduled' e scheduledFor <= agora,
 * e enfileira cada uma no job adequado (send-whatsapp ou send-email).
 * Deve ser chamado periodicamente (ex: a cada 1 minuto).
 */
export declare function processScheduledMessages(): Promise<{
    enfileiradas: number;
    erros: number;
}>;
//# sourceMappingURL=messages.service.d.ts.map