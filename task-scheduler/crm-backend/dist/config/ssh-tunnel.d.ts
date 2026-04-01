/**
 * Inicializa o SSH tunnel para SMTP se necessário.
 * Chamado no bootstrap da aplicação.
 */
export declare function setupSmtpTunnel(): Promise<void>;
/**
 * Inicializa o SSH tunnel para IMAP se necessário.
 * Chamado no bootstrap da aplicação.
 */
export declare function setupImapTunnel(): Promise<void>;
/**
 * Fecha todos os tunnels SSH. Chamado no graceful shutdown.
 */
export declare function closeTunnel(): void;
/**
 * Retorna se um tunnel específico está ativo.
 */
export declare function isTunnelAlive(name?: string): Promise<boolean>;
//# sourceMappingURL=ssh-tunnel.d.ts.map