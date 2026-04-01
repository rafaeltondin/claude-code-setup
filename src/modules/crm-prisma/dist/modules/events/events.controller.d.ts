/**
 * Emite um evento SSE para todos os clientes conectados.
 * Clientes com conexão encerrada são removidos automaticamente do set.
 *
 * @param event - Nome do evento (ex: 'new_message', 'lead_updated')
 * @param data  - Payload serializado como JSON
 */
export declare function emitSSE(event: string, data: unknown): void;
export declare const eventsRouter: import("express-serve-static-core").Router;
//# sourceMappingURL=events.controller.d.ts.map