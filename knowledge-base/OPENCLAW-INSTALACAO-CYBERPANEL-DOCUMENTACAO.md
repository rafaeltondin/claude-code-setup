---
title: "OpenClaw - Instalação Completa em CyberPanel/OpenLiteSpeed"
category: "Infraestrutura"
tags:
  - openclaw
  - cyberpanel
  - openlitespeed
  - websocket
  - reverse-proxy
  - nodejs
  - systemd
  - ssl
  - nginx
topic: "Infraestrutura de Hospedagem"
priority: high
version: "1.0.0"
last_updated: "2026-03-21"
---

# OpenClaw — Instalação Completa em CyberPanel/OpenLiteSpeed

Documentação completa da instalação do OpenClaw v2026.3.13 no servidor rafaeltondin.com.br (CyberPanel + OpenLiteSpeed), incluindo todos os problemas encontrados e soluções aplicadas.

---

## 1. Visão Geral

| Item | Valor |
|------|-------|
| **URL** | `https://openclaw.rafaeltondin.com.br` |
| **Versão** | 2026.3.13 |
| **Instalação** | `/opt/openclaw/` |
| **Config** | `/root/.openclaw/openclaw.json` |
| **Workspace** | `/root/.openclaw/workspace/` |
| **Porta gateway** | 127.0.0.1:3200 |
| **Node.js** | v22.22.1 (via nvm, alias `openclaw`) |
| **Serviço** | `systemctl status openclaw` |
| **Modelo** | `openrouter/z-ai/glm-4.7-flash` |
| **CPUQuota** | 20% |
| **Nice** | 19 |
| **MemoryMax** | 2GB |

---

## 2. Pré-requisitos

- Ubuntu 22.04 LTS
- CyberPanel com OpenLiteSpeed
- Node.js >= 22 (instalar via nvm)
- Porta 80 e 443 abertas (datacenter)
- Conta OpenRouter com API key

---

## 3. Instalação — Passo a Passo

### 3.1 Instalar Node.js 22 via nvm

```bash
export NVM_DIR="/root/.nvm" && . "$NVM_DIR/nvm.sh"
nvm install 22
nvm alias openclaw 22
```

**IMPORTANTE:** O Node.js do sistema (v18) é insuficiente. O OpenClaw requer v22+.

### 3.2 Instalar OpenClaw

```bash
mkdir -p /opt/openclaw && cd /opt/openclaw
npm init -y
npm install openclaw
```

### 3.3 Configurar OpenClaw

```bash
export NVM_DIR="/root/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 22
cd /opt/openclaw

# Configuração inicial
npx openclaw config set gateway.mode local
npx openclaw config set gateway.bind loopback
npx openclaw config set gateway.port 3200

# Modelo via OpenRouter
npx openclaw models set openrouter/z-ai/glm-4.7-flash

# Auth profiles (OpenRouter key)
# Escrever diretamente em ~/.openclaw/agents/main/agent/auth-profiles.json
```

### 3.4 Onboarding

```bash
npx openclaw onboard --non-interactive --accept-risk \
  --auth-choice openrouter-api-key \
  --openrouter-api-key "sk-or-v1-..."
```

**GOTCHA:** O `--non-interactive` não espera o gateway. Usar `--skip-health` se o gateway não estiver rodando.

### 3.5 Criar serviço systemd

```ini
[Unit]
Description=OpenClaw AI Agent Platform
After=network.target

[Service]
EnvironmentFile=/etc/openclaw-env
Type=simple
User=root
WorkingDirectory=/opt/openclaw
Environment=NODE_ENV=production
Environment=PATH=/root/.nvm/versions/node/v22.22.1/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
ExecStart=/root/.nvm/versions/node/v22.22.1/bin/npx openclaw gateway
Restart=always
RestartSec=5
Nice=19
CPUQuota=20%
MemoryMax=2G

[Install]
WantedBy=multi-user.target
```

**CRÍTICO:** Usar `Restart=always`, NÃO `Restart=on-failure`. O gateway faz "full process restart" com exit code 0, e `on-failure` não reinicia nesse caso — o serviço fica parado.

### 3.6 Env file de credenciais

```bash
cat > /etc/openclaw-env << 'EOF'
OPENROUTER_API_KEY=sk-or-v1-...
NODE_ENV=production
EOF
chmod 600 /etc/openclaw-env
```

---

## 4. Problemas Encontrados e Soluções

### 4.1 PROBLEMA: Comando `serve` não existe

**Erro:** `openclaw serve --host 127.0.0.1 --port 3200` não funciona.
**Causa:** O comando correto é `openclaw gateway`, não `openclaw serve`.
**Fix:** `ExecStart=... npx openclaw gateway`

### 4.2 PROBLEMA: "Missing config. Run openclaw setup"

**Erro:** Gateway não inicia — exige configuração prévia.
**Causa:** `gateway.mode` não definido.
**Fix:**
```bash
npx openclaw config set gateway.mode local
npx openclaw config set gateway.bind loopback
npx openclaw config set gateway.port 3200
```

### 4.3 PROBLEMA: Child domain vs Website independente no CyberPanel

**Erro:** Subdomínio criado como child domain retorna 404 para tudo.
**Causa:** Child domains compartilham vhRoot com o domínio pai. O OLS não roteia corretamente quando o docRoot é um subdiretório.
**Fix:** Deletar child domain e criar como **website independente**:
```bash
cyberpanel deleteChild --masterDomain rafaeltondin.com.br --childDomain openclaw.rafaeltondin.com.br
cyberpanel createWebsite --package Default --owner admin --domainName openclaw.rafaeltondin.com.br --email admin@rafaeltondin.com.br --php 8.1 --ssl 0
```

### 4.4 PROBLEMA: Listeners OLS — domínio em apenas 1 listener

**Erro:** Site retorna 404 mesmo com vhost.conf correto.
**Causa:** CyberPanel adiciona o domínio apenas ao listener `Default`, mas existem 4 listeners ativos: Default, SSL, SSL IPv6 e HTTP.
**Fix:** Adicionar o domínio a TODOS os listeners:
```bash
# Verificar listeners
grep -E '^listener|map.*DOMINIO' /usr/local/lsws/conf/httpd_config.conf

# Adicionar aos que faltam
sed -i "/^listener SSL {/,/^}/ { /map.*motion/a\  map  openclaw.rafaeltondin.com.br openclaw.rafaeltondin.com.br
}" /usr/local/lsws/conf/httpd_config.conf
# Repetir para SSL IPv6 e HTTP
```

**Referência:** KB `OLS-CYBERPANEL-PROXY-DOCKER-SSL-PROBLEMAS-SOLUCOES.md` — Problema 1.

### 4.5 PROBLEMA: SSL Let's Encrypt falha com proxy context

**Erro:** ACME challenge retorna 404.
**Causa:** O context `/` proxy intercepta `/.well-known/acme-challenge/` antes do context estático.
**Fix:** Usar `acme.sh` com webroot no public_html:
```bash
/root/.acme.sh/acme.sh --issue -d openclaw.rafaeltondin.com.br -w /home/openclaw.rafaeltondin.com.br/public_html --force
```
Depois copiar os certs:
```bash
mkdir -p /etc/letsencrypt/live/openclaw.rafaeltondin.com.br
cp /root/.acme.sh/openclaw.rafaeltondin.com.br_ecc/openclaw.rafaeltondin.com.br.key /etc/letsencrypt/live/openclaw.rafaeltondin.com.br/privkey.pem
cp /root/.acme.sh/openclaw.rafaeltondin.com.br_ecc/fullchain.cer /etc/letsencrypt/live/openclaw.rafaeltondin.com.br/fullchain.pem
```

### 4.6 PROBLEMA CRÍTICO: OpenLiteSpeed NÃO suporta WebSocket proxy corretamente

**Erro:** Dashboard conecta via HTTPS mas WebSocket falha com `disconnected (1006): no reason`.
**Causa:** Bug estrutural do OpenLiteSpeed — corrompe frames WebSocket ao fazer proxy. Documentado no fórum oficial:
- https://forum.openlitespeed.org/threads/websocket-not-connecting-with-n8n-behind-openlitespeed-reverse-proxy-docker-setup.7465/
- O OLS aplica compressão aos frames WebSocket, violando RFC 6455.
- Desabilitar gzip no vhost NÃO resolve.
- O bloco `websocket` do vhost NÃO resolve.
- LiteSpeed confirmou que NÃO há planos de fix.

**Tentativas que NÃO funcionaram:**
1. Bloco `websocket` no vhost.conf — frames corrompidos
2. Remover bloco `websocket` — OLS não faz upgrade
3. Desabilitar gzip — sem efeito
4. `gateway.tls` nativo — OpenClaw v2026.3.13 ignora a config
5. Node.js WSS proxy na porta 3201/8443 — portas bloqueadas pelo datacenter
6. `gateway.controlUi.allowedOrigins` — sem efeito no WebSocket
7. `gateway.controlUi.allowInsecureAuth: true` — sem efeito
8. Cadeia OLS→Nginx→Gateway — OLS ainda corrompe o WebSocket

**SOLUÇÃO DEFINITIVA: SSH Tunnel**
```bash
ssh -L 3200:127.0.0.1:3200 root@rafaeltondin.com.br
# Depois abrir: http://localhost:3200/#token=TOKEN
```

**SOLUÇÃO ALTERNATIVA: Migrar subdomínio para Nginx**
- Nginx instalado no servidor (`apt install nginx`)
- Nginx tem suporte nativo e correto para WebSocket proxy
- Configuração Nginx funcional:
```nginx
server {
    listen 3210;
    server_name openclaw.rafaeltondin.com.br;
    location / {
        proxy_pass http://127.0.0.1:3200;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400;
    }
}
```
- Para funcionar via HTTPS: Nginx precisa escutar na porta 443 para este subdomínio (requer remover do OLS).

### 4.7 PROBLEMA: Device pairing obrigatório

**Erro:** CLI e dashboard retornam "pairing required" mesmo com `auth.mode: none`.
**Causa:** OpenClaw SEMPRE exige device pairing para novas conexões WebSocket, independente do modo de auth. É um mecanismo de segurança separado.
**Fix:**
```bash
# Listar pendentes
npx openclaw devices list

# Aprovar o mais recente
npx openclaw devices approve --latest

# Ou aprovar por ID
npx openclaw devices approve REQUEST_ID
```

**GOTCHA:** Cada nova conexão (novo browser, novo terminal) gera um novo pairing request. O auto-approve via script não funciona porque o gateway fecha a conexão antes de registrar o pairing.

### 4.8 PROBLEMA: Gateway para de rodar após config change

**Erro:** Serviço fica `inactive (dead)` após alterar configuração.
**Causa:** O gateway detecta mudança no config, faz "full process restart" (exit code 0), e `Restart=on-failure` NÃO reinicia.
**Fix:** Usar `Restart=always` no systemd service.

### 4.9 PROBLEMA: Startup lento com CPUQuota 20%

**Erro:** Gateway leva 30-45 segundos para ficar disponível.
**Causa:** CPUQuota limita a CPU durante a inicialização (carrega plugins, conecta canais).
**Fix:** Aguardar ~45s após restart antes de testar. Monitorar via:
```bash
ss -tlnp | grep 3200  # Porta aparece quando pronto
curl -s http://127.0.0.1:3200/health  # Deve retornar {"ok":true}
```

### 4.10 PROBLEMA: Portas externas bloqueadas pelo datacenter

**Erro:** Portas 3200, 3201, 8443 inacessíveis externamente.
**Causa:** Firewall do datacenter (Hostinger) só permite portas 80 e 443.
**Fix:** Usar apenas portas 80/443 para acesso externo. Gateway fica em loopback.

### 4.11 PROBLEMA: Telegram bot conflita com CRM

**Erro:** `getUpdates conflict: terminated by other getUpdates request`.
**Causa:** O mesmo bot token é usado pelo CRM local (porta 3847) e pelo OpenClaw.
**Fix:** Desabilitar Telegram no OpenClaw:
```bash
npx openclaw config set channels.telegram.enabled false
```
Alternativa: criar um segundo bot via BotFather exclusivo para o OpenClaw.

### 4.12 PROBLEMA: trusted-proxy auth requer campos específicos

**Erro:** Vários erros de validação ao configurar trusted-proxy.
**Causa:** O schema exige campos em ordem: `trustedProxy.userHeader` deve existir antes de `trustedProxy.cidrs`.
**Fix:** Configurar na ordem correta:
```bash
npx openclaw config set gateway.auth.mode trusted-proxy
npx openclaw config set gateway.auth.trustedProxy.userHeader "X-Forwarded-For"
# cidrs é opcional se trustedProxies já está configurado
```

---

## 5. Estrutura do vhost.conf funcional (HTTP proxy, sem WebSocket)

```
docRoot                   $VH_ROOT/public_html
vhDomain                  $VH_NAME
vhAliases                 www.$VH_NAME
enableGzip                0

index  {
  useServer               0
  indexFiles              index.html
}

extprocessor openclawproxy {
  type                    proxy
  address                 127.0.0.1:3200
  maxConns                100
  pcKeepAliveTimeout      60
  initTimeout             60
  retryTimeout            0
  respBuffer              0
}

context /.well-known/acme-challenge {
  location                /home/openclaw.rafaeltondin.com.br/public_html/.well-known/acme-challenge
  allowBrowse             1
  rewrite  {
    enable                0
  }
  addDefaultCharset       off
}

context / {
  type                    proxy
  handler                 openclawproxy
  addDefaultCharset       off
}

rewrite  {
  enable                  1
  autoLoadHtaccess        1
}

vhssl  {
  keyFile                 /etc/letsencrypt/live/openclaw.rafaeltondin.com.br/privkey.pem
  certFile                /etc/letsencrypt/live/openclaw.rafaeltondin.com.br/fullchain.pem
  certChain               1
  sslProtocol             24
  enableECDHE             1
  renegProtection         1
  sslSessionCache         1
  enableSpdy              15
  enableStapling          1
  ocspRespMaxAge          86400
}
```

**NOTA:** NÃO incluir bloco `websocket` — causa mais problemas que resolve no OLS.

---

## 6. Workspace e Skills

### Arquivos do workspace
| Arquivo | Função |
|---------|--------|
| BOOTSTRAP.md | System prompt do agente (PT-BR, regras, KB, servidor) |
| IDENTITY.md | Nome: Claw, vibe técnico/direto |
| USER.md | Perfil do Rafael (clientes, preferências) |
| SOUL.md | Princípios, comunicação, confirmações |
| TOOLS.md | Infra, serviços, portas, clientes, TTS, criativos |
| HEARTBEAT.md | Checklist periódico (servidor, serviços, SSL) |
| AGENTS.md | Regras de sessão, memória, red lines |

### Skills custom (em `workspace/skills/`)
| Skill | Função |
|-------|--------|
| server-health | CPU, RAM, disco, load, serviços |
| dns-check | Registros DNS (A, MX, TXT, NS) |
| ssl-check | Certificados SSL, expiração |
| web-scrape | Raspar sites, meta tags, cores |
| seo-check | SEO on-page, headings, performance |
| kb-search | Buscar na Knowledge Base (62 docs) |

### Cron jobs
| Job | Schedule | Função |
|-----|----------|--------|
| server-health-daily | 0 12 * * * (9h BRT) | Health check diário |
| ssl-check-weekly | 0 13 * * 1 (10h BRT seg) | Verificar SSL |
| disk-cleanup-monthly | 0 6 1 * * (3h BRT dia 1) | Limpeza de disco |

---

## 7. Comandos Úteis

```bash
# Usar Node 22
export NVM_DIR="/root/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 22

# Status
systemctl status openclaw
curl -s http://127.0.0.1:3200/health

# Logs
journalctl -u openclaw --no-pager --output=cat -n 20

# Config
cat /root/.openclaw/openclaw.json
npx openclaw config get gateway

# Modelo
npx openclaw models status

# Skills
npx openclaw skills list

# Cron
npx openclaw cron list  # (requer device pairing)
cat /root/.openclaw/cron/jobs.json

# Devices (pairing)
npx openclaw devices list
npx openclaw devices approve --latest

# Dashboard
npx openclaw dashboard --no-open  # Gera URL com token

# Restart
systemctl restart openclaw
# Aguardar ~45s com CPUQuota 20%

# NUNCA FAZER
# killall node
# pm2 delete all
```

---

## 8. Acesso ao Dashboard

### Via SSH Tunnel (funciona)
```bash
ssh -L 3200:127.0.0.1:3200 root@rafaeltondin.com.br
# Browser: http://localhost:3200/#token=TOKEN
```

### Via HTTPS (parcial — HTML carrega, WebSocket não)
```
https://openclaw.rafaeltondin.com.br/
# Dashboard carrega mas chat não funciona (bug OLS WebSocket)
```

### Token do gateway
```
0635d1080f9c8d1a5b1a60395394ec70ffd6f383ee2a8f06
```

---

## 9. Lições Aprendidas

1. **OpenLiteSpeed NÃO serve para WebSocket proxy** — usar Nginx ou SSH tunnel
2. **CyberPanel child domains são problemáticos** — sempre criar como website independente
3. **Listeners OLS precisam ser verificados manualmente** — CyberPanel pode mapear no listener errado
4. **`Restart=always` é obrigatório** para o systemd service do OpenClaw
5. **Device pairing é separado de auth** — mesmo com auth=none, pairing é exigido
6. **CPUQuota 20% causa startup lento** (~45s) — aguardar antes de testar

---

## 10. Claude Max API Proxy (claude-max-api-proxy)

Permite usar assinatura Claude Max/Pro como endpoint OpenAI-compatible para o OpenClaw.

### 10.1 Instalação

```bash
export PATH="/root/.nvm/versions/node/v22.22.1/bin:$PATH"
npm install -g @anthropic-ai/claude-code
npm install -g claude-max-api-proxy
```

### 10.2 Autenticação do Claude CLI no servidor

**PROBLEMA:** `claude auth login` usa Ink (React para terminal) — NÃO aceita input programático via pipe, expect, screen ou tmux send-keys.

**SOLUÇÃO:** Copiar credenciais da máquina local autenticada:
```bash
# Na máquina LOCAL (onde claude está autenticado):
cat ~/.claude/.credentials.json

# No SERVIDOR:
mkdir -p /root/.claude
cat > /root/.claude/.credentials.json << 'EOF'
{CONTEÚDO DO JSON COPIADO}
EOF
chmod 600 /root/.claude/.credentials.json

# Verificar
claude auth status
```

**NOTA:** O token OAuth expira periodicamente. Quando expirar, repetir o processo de cópia.

### 10.3 Bug no claude-max-api-proxy v1.0.0

**PROBLEMA:** `normalizeModelName()` em `cli-to-openai.js:88` crasha com `TypeError: Cannot read properties of undefined (reading 'includes')` quando `model` é `undefined`.

**FIX:**
```bash
# Patch no arquivo instalado globalmente
sed -i 's/function normalizeModelName(model) {/function normalizeModelName(model) {\n    if (!model) return "claude-sonnet-4";/' \
  /root/.nvm/versions/node/v22.22.1/lib/node_modules/claude-max-api-proxy/dist/adapter/cli-to-openai.js
```

### 10.4 Serviço systemd

```ini
[Unit]
Description=Claude Max API Proxy (OpenAI-compatible)
After=network.target
Before=openclaw.service

[Service]
Type=simple
User=root
Environment=NODE_ENV=production
Environment=PATH=/root/.nvm/versions/node/v22.22.1/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
ExecStart=/root/.nvm/versions/node/v22.22.1/bin/claude-max-api
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### 10.5 Configuração do OpenClaw para usar o proxy

**openclaw.json** — seção `env`:
```json
{
  "env": {
    "OPENAI_API_KEY": "not-needed",
    "OPENAI_BASE_URL": "http://localhost:3456/v1"
  }
}
```

**openclaw.json** — modelos:
```json
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "openai/claude-sonnet-4",
        "fallbacks": ["openai/claude-opus-4", "openai/claude-haiku-4"]
      },
      "models": {
        "openai/claude-sonnet-4": {},
        "openai/claude-opus-4": {},
        "openai/claude-haiku-4": {}
      }
    }
  }
}
```

**agents/main/agent/models.json** — SUBSTITUIR COMPLETAMENTE:
```json
{
  "providers": {
    "openai": {
      "baseUrl": "http://localhost:3456/v1",
      "api": "openai-completions",
      "models": [
        {"id": "claude-sonnet-4", "name": "Claude Sonnet 4", "reasoning": false, "input": ["text","image"], "cost": {"input":0,"output":0,"cacheRead":0,"cacheWrite":0}, "contextWindow": 200000, "maxTokens": 8192},
        {"id": "claude-opus-4", "name": "Claude Opus 4", "reasoning": true, "input": ["text","image"], "cost": {"input":0,"output":0,"cacheRead":0,"cacheWrite":0}, "contextWindow": 200000, "maxTokens": 8192},
        {"id": "claude-haiku-4", "name": "Claude Haiku 4", "reasoning": false, "input": ["text","image"], "cost": {"input":0,"output":0,"cacheRead":0,"cacheWrite":0}, "contextWindow": 200000, "maxTokens": 8192}
      ],
      "apiKey": "not-needed"
    }
  }
}
```

**CRÍTICO:** Remover TODOS os providers antigos (openrouter, ollama, zai) de `models.json`. Usar heredoc (`cat > file << 'EOF'`) para garantir substituição total — Python `json.dump` pode falhar silenciosamente se o arquivo estiver sendo lido por outro processo.

**agents/main/agent/auth-profiles.json** — limpar:
```json
{
  "version": 1,
  "profiles": {
    "openai:default": {
      "type": "api_key",
      "provider": "openai"
    }
  },
  "usageStats": {}
}
```

**ERRO COMUM:** NÃO colocar `key` ou `baseUrl` dentro de `auth.profiles` no `openclaw.json` — o schema não aceita e o gateway crasha. Usar a seção `env` para variáveis de ambiente.

### 10.6 Teste do proxy

```bash
# Health check
curl -s http://localhost:3456/health

# Modelos disponíveis
curl -s http://localhost:3456/v1/models

# Chat completion
curl -s http://localhost:3456/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-sonnet-4","messages":[{"role":"user","content":"Say OK"}],"max_tokens":10}'
```

### 10.7 Fluxo completo

```
WhatsApp/Web → OpenClaw (:3200) → claude-max-api-proxy (:3456) → Claude CLI → Anthropic (assinatura Max)
```

---

## 11. Solução WebSocket: Nginx SNI Frontend

### 11.1 O Problema

OLS corrompe frames WebSocket (RFC 6455 violada). **NÃO TEM FIX.** Confirmado pelo LiteSpeed.
Portas externas (3200, 8443, etc.) são bloqueadas pelo firewall do datacenter (Hostinger). Apenas 80/443 funcionam.

### 11.2 Solução Definitiva: Nginx Stream + SNI Routing

**Arquitetura:**
```
Internet :443 → Nginx (stream SNI) → openclaw.* → Nginx HTTP :4431 (WebSocket OK) → Gateway :3200
                                    → *.outros   → OLS :4430 (SSL passthrough)
```

**Passo 1 — Instalar módulo stream:**
```bash
apt-get install -y libnginx-mod-stream
```

**Passo 2 — Mover OLS de *:443 para 127.0.0.1:4430:**
```bash
cp /usr/local/lsws/conf/httpd_config.conf /usr/local/lsws/conf/httpd_config.conf.bak
sed -i "s|address                 \*:443|address                 127.0.0.1:4430|g" /usr/local/lsws/conf/httpd_config.conf
sed -i "s|address                 \[ANY\]:443|address                 [::1]:4430|g" /usr/local/lsws/conf/httpd_config.conf
```

**CRÍTICO:** Usar `lswsctrl stop && lswsctrl start` — graceful restart (`SIGUSR1`) NÃO aplica mudanças de listener. O OLS vai continuar na porta antiga.

**Passo 3 — Remover openclaw de TODOS os listeners OLS:**
```bash
sed -i "/map.*openclaw.rafaeltondin.com.br/d" /usr/local/lsws/conf/httpd_config.conf
```

**Passo 4 — Configurar Nginx (`/etc/nginx/nginx.conf`):**
```nginx
user www-data;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
    worker_connections 1024;
}

# Layer 4 SNI routing
stream {
    map $ssl_preread_server_name $backend {
        openclaw.rafaeltondin.com.br  openclaw_backend;
        default                       ols_backend;
    }

    upstream openclaw_backend {
        server 127.0.0.1:4431;
    }

    upstream ols_backend {
        server 127.0.0.1:4430;
    }

    server {
        listen 443;
        listen [::]:443;
        proxy_pass $backend;
        ssl_preread on;
        proxy_connect_timeout 5s;
        proxy_timeout 86400s;
    }
}

# HTTP block para openclaw (SSL terminado aqui, WebSocket funciona)
http {
    sendfile on;
    tcp_nopush on;
    types_hash_max_size 2048;
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    server {
        listen 4431 ssl;
        server_name openclaw.rafaeltondin.com.br;

        ssl_certificate /etc/letsencrypt/live/openclaw.rafaeltondin.com.br/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/openclaw.rafaeltondin.com.br/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;

        location / {
            proxy_pass http://127.0.0.1:3200;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto https;
            proxy_read_timeout 86400;
            proxy_send_timeout 86400;
        }
    }
}
```

**Passo 5 — Reiniciar:**
```bash
/usr/local/lsws/bin/lswsctrl stop
/usr/local/lsws/bin/lswsctrl start
sleep 2
nginx -t && systemctl start nginx && systemctl enable nginx
```

**Passo 6 — Verificar:**
```bash
# OLS em 4430 (interno)
ss -tlnp | grep ":4430"
# Nginx em 443 (externo) e 4431 (openclaw HTTP)
ss -tlnp | grep nginx
# WebSocket funciona
curl -sk -H "Upgrade: websocket" -H "Connection: Upgrade" -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: test" https://openclaw.rafaeltondin.com.br/ -w "%{http_code}" -o /dev/null
# Deve retornar 101
```

### 11.3 Serviços finais

| Serviço | Porta | Função |
|---------|-------|--------|
| Nginx stream | 0.0.0.0:443 | SNI routing (frontend público) |
| Nginx HTTP | 127.0.0.1:4431 | Proxy HTTP+WebSocket para OpenClaw |
| OLS | 127.0.0.1:4430 | SSL para todos os outros sites |
| OpenClaw gateway | 127.0.0.1:3200 | Gateway principal |
| claude-max-api-proxy | 127.0.0.1:3456 | Proxy OpenAI-compatible |
7. **Datacenter Hostinger bloqueia portas** — só 80/443 funcionam externamente
8. **Telegram bot token não pode ser compartilhado** — criar bot dedicado para OpenClaw
9. **O comando correto é `openclaw gateway`**, não `openclaw serve`
10. **acme.sh funciona melhor que CyberPanel** para SSL em subdomínios com proxy

---

## 12. Function Calling no claude-max-api-proxy

### 12.1 O Problema
O proxy original era TEXT-ONLY: ignorava `tools` na requisição e retornava apenas `content`. O OpenClaw envia 26 tools (browser, exec, message, etc.) e espera `tool_calls` na resposta.

### 12.2 Solução Implementada (3 arquivos)

**openai-to-cli.js** — Converte tools para bloco `<available_tools>` no prompt:
- Tools formatadas como lista com nome, descrição e parâmetros
- Instrução ao modelo para usar formato `<tool_call>{"name":"x","arguments":{}}}</tool_call>`
- Mensagens `role: "tool"` convertidas para `<tool_result>`
- Mensagens assistant com `tool_calls` convertidas para blocos `<tool_call>`

**cli-to-openai.js** — Parseia `<tool_call>` na resposta:
- `parseToolCalls(text)` detecta blocos `<tool_call>...</tool_call>` via regex
- Retorna `tool_calls` no formato OpenAI com `id`, `function.name`, `function.arguments`
- `finish_reason: "tool_calls"` quando há tool calls
- Remove blocos tool_call do texto limpo

**routes.js** — Streaming com acumulação:
- Quando `hasTools=true`, acumula texto em vez de streamar
- Ao final, parseia tool calls acumulados
- Envia chunk de texto + chunk de tool_calls + done chunk
- Sem tools: streaming direto (comportamento original preservado)

### 12.3 Bugs corrigidos no proxy
1. `normalizeModelName()` crashava com model undefined — adicionado guard
2. `messagesToPrompt()` não tratava content como array — adicionado `extractContent()`
3. ESM module usa import/export — NUNCA usar require()

### 12.4 Formato do tool_call no prompt
```
<tool_call>
{"name": "browser", "arguments": {"action": "navigate", "url": "https://example.com"}}
</tool_call>
```

---

## 13. Workspace — Instruções ao Agente

### 13.1 SOUL.md — Regras de Proatividade
- "Apenas chame a ferramenta" — NÃO narrar, NÃO pedir permissão para ações rotineiras
- "Volte com respostas, não perguntas" — resolver sozinho antes de perguntar
- Exceção: ações destrutivas (deletar, enviar mensagem) exigem confirmação

### 13.2 TOOLS.md — Browser Reference
- Fluxo padrão: navigate → snapshot → interact → snapshot → repeat
- Snapshot obrigatório após CADA navegação (refs invalidam)
- Regra dos 2 erros: parar e reportar após 2 falhas consecutivas
- Tabela "quando usar browser vs web_fetch vs web_search"
- Limitações: CAPTCHAs, anti-bot, login manual

### 13.3 Limites de bootstrap
- bootstrapMaxChars: 10000 por arquivo
- bootstrapTotalMaxChars: 100000 total
- TOOLS.md antigo tinha 10630 chars (truncado!) — reduzido para ~4400

---

## 14. Lições Aprendidas — Sessão 2026-03-22 (Function Calling no Proxy)

### 14.1 Browser do OpenClaw para ao reiniciar o serviço

**Contexto:** Ao fazer `systemctl restart openclaw`, o browser headless para de rodar.
**Erro:** Após restart, tool calls do browser falhavam com "Port 3211 already in use" ou "tab not found".
**Solução:**
```bash
npx openclaw browser start
```
**Regra:** SEMPRE verificar `npx openclaw browser status` após restart do OpenClaw. Se `running: false`, rodar `npx openclaw browser start`.

---

### 14.2 Proxy CLI não suporta tools nativas — precisa de `<tool_call>` no texto

**Contexto:** O proxy claude-max-api converte requests OpenAI para o Claude CLI (texto puro). O CLI não suporta o campo `tools` da API.
**Erro:** O OpenClaw enviava 26 tools no campo `tools`, mas o CLI ignorava. O modelo não gerava `<tool_call>` porque o system prompt do OpenClaw instruía formato OpenAI nativo.
**Solução:** Injetar instruções de formato `<tool_call>` no system message do OpenClaw. Quando o system message contém "Tool names are case-sensitive" ou "Tool availability", adicionar bloco "## Tool Call Format" instruindo o modelo a usar `<tool_call>` tags.
**Regra:** O proxy DEVE injetar instruções de formato `<tool_call>` no system message quando este já lista tools do OpenClaw.

---

### 14.3 Não duplicar bloco `<available_tools>` quando system message já lista tools

**Contexto:** O proxy injetava `<available_tools>` listando todas as tools, mas o system message do OpenClaw já listava as mesmas tools.
**Erro:** O modelo recebia duas listas de tools conflitantes — uma dizendo "use `<tool_call>`" e outra dizendo "use formato nativo". O modelo ficava confuso e não usava nenhuma.
**Solução:** Quando o system message já contém tool descriptions (detectado por "Tool availability" ou "Tool names are case-sensitive"), NÃO injetar `<available_tools>` — apenas adicionar instruções de FORMATO ao system message existente.
**Regra:** Detectar se o system message já lista tools. Se sim, injetar APENAS formato `<tool_call>`. Se não, injetar bloco `<available_tools>` completo.

```javascript
// Detecção no openai-to-cli.js
const systemAlreadyHasTools = systemContent.includes('Tool names are case-sensitive') ||
                               systemContent.includes('Tool availability');
if (systemAlreadyHasTools) {
  // Injetar apenas o bloco de formato
  sysContent += '\n\n## Tool Call Format\nUse <tool_call>{"name":"x","arguments":{}}</tool_call>';
} else {
  // Injetar lista completa <available_tools>
  sysContent += buildAvailableToolsBlock(tools);
}
```

---

### 14.4 SSL fullchain incompleto causa ERR_CERT_COMMON_NAME_INVALID

**Contexto:** O dashboard do OpenClaw (openclaw.rafaeltondin.com.br) não carregava no Chrome.
**Erro:** O `fullchain.pem` no Nginx estava com chain SSL incompleta (`ssl_verify_result: 20`).
**Solução:** Copiar `fullchain.cer` do acme.sh para `/etc/letsencrypt/live/` e recarregar Nginx:
```bash
cp /root/.acme.sh/openclaw.rafaeltondin.com.br_ecc/fullchain.cer \
   /etc/letsencrypt/live/openclaw.rafaeltondin.com.br/fullchain.pem
cp /root/.acme.sh/openclaw.rafaeltondin.com.br_ecc/openclaw.rafaeltondin.com.br.key \
   /etc/letsencrypt/live/openclaw.rafaeltondin.com.br/privkey.pem
nginx -t && systemctl reload nginx
```
**Verificação:**
```bash
curl -s https://openclaw.rafaeltondin.com.br/ -w '%{ssl_verify_result}'
# Deve retornar 0
```
**Regra:** Quando acme.sh renova certificados, copiar `fullchain.cer` E a `key` para o path do Nginx. Verificar com `ssl_verify_result` — deve ser `0`.

---

### 14.5 Device pairing necessário ao conectar novo browser ao OpenClaw

**Contexto:** Ao conectar via dashboard web, o WebSocket fechava com "code=4008 reason=connect failed".
**Erro:** O dispositivo (browser) precisava ser aprovado antes de conectar.
**Solução:**
```bash
npx openclaw devices list           # Ver pendentes
npx openclaw devices approve <request-id>  # Aprovar por ID
npx openclaw devices approve --latest      # Aprovar o mais recente
```
**Regra:** Após primeira conexão via dashboard, verificar `npx openclaw devices list` e aprovar devices pending. Cada novo browser/terminal gera um novo pairing request.

---

### 14.6 Streaming com tool_calls: não enviar texto junto

**Contexto:** O proxy enviava texto + tool_calls no mesmo streaming response.
**Erro:** O OpenClaw não processava corretamente quando recebia texto antes dos tool_calls.
**Solução:** Suprimir texto quando `tool_calls` estão presentes — enviar APENAS os tool_calls chunks:
```javascript
// routes.js — ao finalizar stream com tool_calls acumulados
if (toolCalls.length > 0) {
  // NÃO enviar chunk de texto separado — apenas tool_calls
  sendToolCallsChunk(res, toolCalls);
} else {
  sendTextChunk(res, accumulatedText);
}
```
**Regra:** Em streaming, se há tool_calls, NÃO enviar chunk de texto antes. O OpenClaw espera APENAS tool_calls OU APENAS texto em um único response.

---

### 14.7 Scripts complexos via SSH: Write local → scp → ssh exec

**Contexto:** Tentativas de enviar scripts Python/JS via heredoc SSH falhavam por conflito de aspas.
**Erro:** Bash interpretava aspas internas dos scripts, causando SyntaxError ou "command not found".
**Solução:**
```bash
# 1. Escrever script localmente
cat > /tmp/meu_script.py << 'PYEOF'
# código Python com aspas "livremente"
print(f"resultado: {'valor'}")
PYEOF

# 2. Enviar via scp
scp /tmp/meu_script.py root@servidor:/tmp/meu_script.py

# 3. Executar remotamente
ssh root@servidor "python3 /tmp/meu_script.py"
```
**Regra:** Para scripts complexos via SSH, NUNCA usar heredoc inline. SEMPRE: Write local → scp → ssh exec.
