import { spawn, ChildProcess } from 'child_process';
import { createConnection } from 'net';
import { logger } from '../utils/logger';
import * as settingsService from '../modules/settings/settings.service';

// ---------------------------------------------------------------------------
// SSH Tunnel Manager — cria e mantém tunnels SSH para SMTP e IMAP
// ---------------------------------------------------------------------------

interface TunnelConfig {
  localPort: number;
  remoteHost: string;
  remotePort: number;
  sshHost: string;
  sshUser: string;
}

interface TunnelInstance {
  name: string;
  config: TunnelConfig;
  process: ChildProcess | null;
  reconnectTimer: NodeJS.Timeout | null;
  healthCheckTimer: NodeJS.Timeout | null;
}

const _tunnels: Map<string, TunnelInstance> = new Map();
let _isShuttingDown = false;

const RECONNECT_INTERVAL_MS = 30_000; // 30 segundos
const HEALTH_CHECK_INTERVAL_MS = 60_000; // 1 minuto

/**
 * Verifica se a porta local do tunnel está respondendo.
 */
function checkTunnelAlive(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const conn = createConnection({ host: '127.0.0.1', port, timeout: 3000 });
    conn.on('connect', () => {
      conn.end();
      resolve(true);
    });
    conn.on('timeout', () => {
      conn.destroy();
      resolve(false);
    });
    conn.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * Cria um SSH tunnel usando o comando ssh nativo.
 */
function createTunnel(name: string, config: TunnelConfig): ChildProcess {
  const args = [
    '-o', 'StrictHostKeyChecking=no',
    '-o', 'ServerAliveInterval=30',
    '-o', 'ServerAliveCountMax=3',
    '-o', 'ExitOnForwardFailure=yes',
    '-N', // Sem shell remoto
    '-L', `${config.localPort}:${config.remoteHost}:${config.remotePort}`,
    `${config.sshUser}@${config.sshHost}`,
  ];

  logger.info(`[ssh-tunnel:${name}] Criando tunnel SSH`, {
    local: `localhost:${config.localPort}`,
    remote: `${config.remoteHost}:${config.remotePort}`,
    ssh: `${config.sshUser}@${config.sshHost}`,
  });

  const proc = spawn('ssh', args, {
    stdio: 'pipe',
    detached: false,
    windowsHide: true,
  });

  proc.on('error', (err) => {
    logger.error(`[ssh-tunnel:${name}] Erro ao criar processo SSH`, {
      error: err.message,
    });
  });

  proc.on('exit', (code, signal) => {
    logger.warn(`[ssh-tunnel:${name}] Processo SSH encerrado`, { code, signal });
    const instance = _tunnels.get(name);
    if (instance) {
      instance.process = null;
    }

    if (!_isShuttingDown && instance) {
      logger.info(`[ssh-tunnel:${name}] Agendando reconexão em 30s...`);
      instance.reconnectTimer = setTimeout(() => {
        if (!_isShuttingDown && instance) {
          reconnectTunnel(name);
        }
      }, RECONNECT_INTERVAL_MS);
    }
  });

  proc.stderr?.on('data', (data: Buffer) => {
    const msg = data.toString().trim();
    if (msg) {
      logger.debug(`[ssh-tunnel:${name}] stderr: ${msg}`);
    }
  });

  return proc;
}

/**
 * Tenta reconectar um tunnel específico.
 */
async function reconnectTunnel(name: string): Promise<void> {
  const instance = _tunnels.get(name);
  if (!instance || _isShuttingDown) return;

  // Matar processo antigo se existir
  if (instance.process && !instance.process.killed) {
    try { instance.process.kill(); } catch { /* ignore */ }
  }

  // Verificar se a porta já está em uso (outro tunnel já ativo)
  const alive = await checkTunnelAlive(instance.config.localPort);
  if (alive) {
    logger.info(`[ssh-tunnel:${name}] Porta já está respondendo, tunnel ativo`);
    return;
  }

  instance.process = createTunnel(name, instance.config);
}

/**
 * Inicia o monitoramento de saúde de um tunnel.
 */
function startHealthCheck(name: string): void {
  const instance = _tunnels.get(name);
  if (!instance) return;

  instance.healthCheckTimer = setInterval(async () => {
    if (_isShuttingDown) return;

    const alive = await checkTunnelAlive(instance.config.localPort);
    if (!alive) {
      logger.warn(`[ssh-tunnel:${name}] Health check falhou — reconectando`);
      reconnectTunnel(name);
    }
  }, HEALTH_CHECK_INTERVAL_MS);
  instance.healthCheckTimer.unref();
}

/**
 * Cria e gerencia um tunnel genérico.
 */
async function setupTunnel(name: string, config: TunnelConfig): Promise<void> {
  logger.info(`[ssh-tunnel:${name}] Verificando necessidade de tunnel...`);

  const instance: TunnelInstance = {
    name,
    config,
    process: null,
    reconnectTimer: null,
    healthCheckTimer: null,
  };
  _tunnels.set(name, instance);

  // Verificar se já existe um tunnel ativo nessa porta
  const alive = await checkTunnelAlive(config.localPort);
  if (alive) {
    logger.info(`[ssh-tunnel:${name}] Tunnel já está ativo`, {
      port: config.localPort,
    });
    startHealthCheck(name);
    return;
  }

  // Criar tunnel
  instance.process = createTunnel(name, config);

  // Esperar um pouco para o tunnel estabelecer
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Verificar se funcionou
  const ok = await checkTunnelAlive(config.localPort);
  if (ok) {
    logger.info(`[ssh-tunnel:${name}] Tunnel estabelecido com sucesso`, {
      local: `localhost:${config.localPort}`,
    });
  } else {
    logger.warn(`[ssh-tunnel:${name}] Tunnel pode não estar pronto ainda — health check vai monitorar`);
  }

  startHealthCheck(name);
}

// ---------------------------------------------------------------------------
// Loaders de configuração
// ---------------------------------------------------------------------------

async function loadSmtpTunnelConfig(): Promise<TunnelConfig | null> {
  try {
    const host = await settingsService.getSetting('smtp_host');
    if (!host) return null;

    if (host !== 'localhost' && host !== '127.0.0.1') {
      return null;
    }

    const localPort = parseInt(
      (await settingsService.getSetting('smtp_port')) || '11465',
      10
    );
    const sshHost = (await settingsService.getSetting('smtp_tunnel_ssh_host')) || '46.202.149.24';
    const sshUser = (await settingsService.getSetting('smtp_tunnel_ssh_user')) || 'root';
    const remotePort = parseInt(
      (await settingsService.getSetting('smtp_tunnel_remote_port')) || '465',
      10
    );

    return { localPort, remoteHost: 'localhost', remotePort, sshHost, sshUser };
  } catch (err) {
    logger.error('[ssh-tunnel] Erro ao carregar config SMTP tunnel', {
      error: (err as Error).message,
    });
    return null;
  }
}

async function loadImapTunnelConfig(): Promise<TunnelConfig | null> {
  try {
    const host = await settingsService.getSetting('imap_host');
    if (!host) return null;

    // Se o host é local, o tunnel precisa estar ativo
    if (host !== 'localhost' && host !== '127.0.0.1') {
      return null;
    }

    const localPort = parseInt(
      (await settingsService.getSetting('imap_port')) || '11993',
      10
    );
    const sshHost = (await settingsService.getSetting('imap_tunnel_ssh_host')) || '46.202.149.24';
    const sshUser = (await settingsService.getSetting('imap_tunnel_ssh_user')) || 'root';
    const remotePort = parseInt(
      (await settingsService.getSetting('imap_tunnel_remote_port')) || '993',
      10
    );

    return { localPort, remoteHost: 'localhost', remotePort, sshHost, sshUser };
  } catch (err) {
    logger.error('[ssh-tunnel] Erro ao carregar config IMAP tunnel', {
      error: (err as Error).message,
    });
    return null;
  }
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

/**
 * Inicializa o SSH tunnel para SMTP se necessário.
 * Chamado no bootstrap da aplicação.
 */
export async function setupSmtpTunnel(): Promise<void> {
  const config = await loadSmtpTunnelConfig();
  if (!config) {
    logger.info('[ssh-tunnel] Tunnel SMTP não necessário (host remoto direto ou não configurado)');
    return;
  }
  await setupTunnel('smtp', config);
}

/**
 * Inicializa o SSH tunnel para IMAP se necessário.
 * Chamado no bootstrap da aplicação.
 */
export async function setupImapTunnel(): Promise<void> {
  const config = await loadImapTunnelConfig();
  if (!config) {
    logger.info('[ssh-tunnel] Tunnel IMAP não necessário (host remoto direto ou não configurado)');
    return;
  }
  await setupTunnel('imap', config);
}

/**
 * Fecha todos os tunnels SSH. Chamado no graceful shutdown.
 */
export function closeTunnel(): void {
  _isShuttingDown = true;

  for (const [name, instance] of _tunnels) {
    if (instance.reconnectTimer) {
      clearTimeout(instance.reconnectTimer);
      instance.reconnectTimer = null;
    }

    if (instance.healthCheckTimer) {
      clearInterval(instance.healthCheckTimer);
      instance.healthCheckTimer = null;
    }

    if (instance.process && !instance.process.killed) {
      logger.info(`[ssh-tunnel:${name}] Encerrando tunnel SSH...`);
      instance.process.kill();
      instance.process = null;
    }
  }

  _tunnels.clear();
  logger.info('[ssh-tunnel] Todos os tunnels SSH encerrados');
}

/**
 * Retorna se um tunnel específico está ativo.
 */
export async function isTunnelAlive(name?: string): Promise<boolean> {
  if (name) {
    const instance = _tunnels.get(name);
    if (!instance) return false;
    return checkTunnelAlive(instance.config.localPort);
  }
  // Sem nome: verifica o SMTP (retrocompatibilidade)
  const smtp = _tunnels.get('smtp');
  if (!smtp) return false;
  return checkTunnelAlive(smtp.config.localPort);
}
