import { Router, Request, Response } from 'express';
import { logger } from '../../utils/logger';

const router = Router();

// ---------------------------------------------------------------------------
// Store de clientes SSE conectados
// ---------------------------------------------------------------------------

const sseClients: Set<Response> = new Set();

// ---------------------------------------------------------------------------
// emitSSE — envia evento para todos os clientes conectados
// ---------------------------------------------------------------------------

/**
 * Emite um evento SSE para todos os clientes conectados.
 * Clientes com conexão encerrada são removidos automaticamente do set.
 *
 * @param event - Nome do evento (ex: 'new_message', 'lead_updated')
 * @param data  - Payload serializado como JSON
 */
export function emitSSE(event: string, data: unknown): void {
  // BUG 9 FIX: Sanitizar nome do evento para prevenir injeção de newline no protocolo SSE
  const safeEvent = event.replace(/[\r\n]/g, '');
  const payload = `event: ${safeEvent}\ndata: ${JSON.stringify(data)}\n\n`;
  const clientsBefore = sseClients.size;
  let removed = 0;

  for (const client of sseClients) {
    try {
      // BUG 7 FIX: Verificar se a conexão ainda está aberta antes de escrever
      if (!client.writableEnded && !client.destroyed) {
        client.write(payload);
      } else {
        // Conexão já encerrada — remover silenciosamente
        sseClients.delete(client);
        removed++;
      }
    } catch (err) {
      // Conexão já encerrada — remover do set
      sseClients.delete(client);
      removed++;
      logger.warn('[SSE] Cliente removido por erro de escrita', {
        event: safeEvent,
        errorMessage: (err as Error).message,
      });
    }
  }

  logger.debug('[SSE] Evento emitido', {
    event,
    clientesBefore: clientsBefore,
    clientesAtivos: sseClients.size,
    removidos: removed,
  });
}

// ---------------------------------------------------------------------------
// GET /stream — endpoint SSE
// ---------------------------------------------------------------------------

/**
 * Rota SSE pública (sem authMiddleware) — o frontend se conecta aqui para
 * receber eventos em tempo real do CRM.
 *
 * Eventos emitidos:
 *   - connected       → confirmação de conexão bem-sucedida
 *   - new_message     → nova mensagem enviada ou recebida (qualquer canal)
 *   - lead_updated    → lead criado ou com status/dados alterados
 *   - lead_created    → novo lead adicionado ao CRM
 *   - message_status  → atualização de status de mensagem (delivered, read)
 *
 * Heartbeat a cada 30s mantém a conexão viva através de proxies/load balancers.
 */
router.get('/stream', (req: Request, res: Response) => {
  // Cabeçalhos obrigatórios para SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'X-Accel-Buffering': 'no', // desabilita buffer do nginx/litespeed
  });

  // Heartbeat periódico para manter a conexão viva (15s evita timeouts de proxies)
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      // Conexão já fechada — o evento 'close' vai limpar
    }
  }, 15000);

  // Registrar cliente
  sseClients.add(res);

  logger.info('[SSE] Novo cliente conectado', {
    ip: req.ip,
    totalClientes: sseClients.size,
  });

  // Confirmação de conexão
  res.write(
    `event: connected\ndata: ${JSON.stringify({
      message: 'Connected to CRM events',
      timestamp: new Date().toISOString(),
    })}\n\n`
  );

  // Limpeza ao desconectar
  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);

    logger.info('[SSE] Cliente desconectado', {
      ip: req.ip,
      totalClientes: sseClients.size,
    });
  });
});

export const eventsRouter = router;
