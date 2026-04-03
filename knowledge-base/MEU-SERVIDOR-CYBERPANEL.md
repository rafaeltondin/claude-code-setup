---
title: "Meu Servidor CyberPanel - Documentação de Acesso e Configuração"
category: "Infraestrutura"
tags:
  - cyberpanel
  - servidor
  - ssh
  - ftp
  - hospedagem
  - deploy
  - openlitespeed
  - ssl
  - credenciais
  - acesso
  - litespeed
  - hosting
  - vps
  - hostinger
  - painel controle
  - web server
topic: "Servidor e Hospedagem"
priority: high
version: "1.2.0"
last_updated: "2026-02-18"
---

# Meu Servidor CyberPanel - Documentação de Acesso e Configuração

## Informações de Acesso Rápido

| Item | Valor |
|------|-------|
| **IP do Servidor** | `46.202.149.24` |
| **IPv6** | `2a02:4780:14:6dd9::1` |
| **Hostname** | `srv410981` |
| **Acesso SSH** | `ssh root@46.202.149.24` (chave ed25519 auto-detectada) |
| **Painel CyberPanel** | `https://46.202.149.24:8090` |
| **Provedor** | Hostinger (hstgr.cloud) |

---

## Especificações do Servidor

### Hardware (VPS)

| Recurso | Especificação |
|---------|---------------|
| **CPU** | AMD EPYC 9354P 32-Core Processor (8 vCPUs) |
| **RAM** | 32 GB DDR4 |
| **Disco** | 388 GB SSD (163 GB usado / 225 GB livre = 42% uso) |
| **Swap** | 2 GB |
| **Virtualização** | KVM (QEMU) |

### Sistema Operacional

| Item | Versão |
|------|--------|
| **OS** | Ubuntu 22.04.5 LTS (Jammy Jellyfish) |
| **Kernel** | Linux 5.15.0-1085-kvm |
| **Arquitetura** | x86-64 |

---

## Software Instalado

### Painel de Controle

| Software | Versão |
|----------|--------|
| **CyberPanel** | 2.4 (Build 2) |
| **OpenLiteSpeed** | 1.8.4 |

### Versões de PHP Disponíveis

```
/usr/local/lsws/lsphp74/bin/lsphp  → PHP 7.4
/usr/local/lsws/lsphp80/bin/lsphp  → PHP 8.0
/usr/local/lsws/lsphp81/bin/lsphp  → PHP 8.1
/usr/local/lsws/lsphp82/bin/lsphp  → PHP 8.2 (padrão CLI)
/usr/local/lsws/lsphp83/bin/lsphp  → PHP 8.3
```

### Banco de Dados

| Software | Versão |
|----------|--------|
| **MariaDB** | 10.6.22 |
| **Redis** | Instalado (porta 6379) |
| **Memcached (LSMCD)** | Instalado (porta 11211) |

### Servidor de Email

| Serviço | Status |
|---------|--------|
| **Postfix** | Ativo (SMTP - portas 25, 465) |
| **Dovecot** | Ativo (IMAP 143, POP3 110) |

### Outros Serviços

| Serviço | Status | Porta |
|---------|--------|-------|
| **Docker** | Ativo | - |
| **Pure-FTPd** | Ativo | 21 |
| **PowerDNS** | Ativo | 53 |
| **SSH** | Ativo | 22 |

---

## Portas em Uso

### Portas Públicas (Acessíveis Externamente)

| Porta | Serviço | Descrição |
|-------|---------|-----------|
| 22 | SSH | Acesso remoto seguro |
| 21 | FTP | Transferência de arquivos |
| 25 | SMTP | Envio de emails |
| 53 | DNS | PowerDNS Server |
| 80 | HTTP | OpenLiteSpeed |
| 110 | POP3 | Recebimento de email |
| 143 | IMAP | Recebimento de email |
| 443 | HTTPS | OpenLiteSpeed (SSL) |
| 465 | SMTPS | Envio seguro de email |
| 8090 | CyberPanel | Painel de administração |
| 8888 | Python App | Aplicação Python |

### Portas Locais (127.0.0.1)

| Porta | Serviço | Descrição |
|-------|---------|-----------|
| 3000 | nghttpx | Proxy HTTP/2 |
| 3306 | MariaDB | Banco de dados |
| 6379 | Redis | Cache/Session |
| 11211 | LSMCD | LiteSpeed Memcached |
| 783 | SpamAssassin | Filtro anti-spam |

---

## Listeners do OpenLiteSpeed

| Listener | Porta | Descrição |
|----------|-------|-----------|
| Default | 80 | HTTP principal |
| HTTP | 80 | HTTP secundário |
| SSL | 443 | HTTPS principal |
| SSL IPv6 | 443 | HTTPS IPv6 |
| flowise | - | Aplicação Flowise |

---

## Sites Hospedados (60+ sites)

### Sites Ativos Principais

| Domínio | Usuário | Categoria |
|---------|---------|-----------|
| belisc.ai | belis3823 | SaaS/AI |
| app.belisc.ai | appbe2808 | Aplicação |
| app.majoryachts.com.br | appma9079 | Aplicação |
| limemarketing.com.br | limem6164 | Marketing |
| innovafluxo.com.br | innov2490 | Automação |
| formaeestilo.com | forma6082 | E-commerce |
| clicaagora.com.br | clica1524 | Marketing |
| cadastrodje.com.br | cadas9969 | Cadastro |
| diegobroch.com.br | diego2493 | Pessoal |
| fractaltrading.com.br | fract7611 | Trading |

### Sites de Aposta/Gaming

| Domínio | Usuário |
|---------|---------|
| realbet.app | realb1842 |
| realbet.live | realb4141 |
| realbet.store | realb2416 |
| fortunebet.live | fortu7198 |
| vizzionbet.app | vizzi6859 |

### Subdomínios beliscai.click

| Domínio | Usuário |
|---------|---------|
| dropkite.beliscai.click | dropk8393 |
| laura.beliscai.click | laura7389 |
| seudebona.beliscai.click | seude3244 |
| teste.beliscai.click | teste4175 |
| pentest.beliscai.click | pente6190 |

---

## Certificados SSL Let's Encrypt

**Total de Certificados**: 226 certificados ativos

Os certificados são gerenciados automaticamente pelo CyberPanel e renovados via:
- **certbot** (renovação diária às 2h)
- **acme.sh** (renovação via cron às 13:28)

---

## Tarefas Agendadas (Cron)

### Backup Incremental

| Intervalo | Comando |
|-----------|---------|
| 30 minutos | IncScheduler.py '30 Minutes' |
| 1 hora | IncScheduler.py '1 Hour' |
| 6 horas | IncScheduler.py '6 Hours' |
| 12 horas | IncScheduler.py '12 Hours' |
| Diário | IncScheduler.py Daily |
| Semanal | IncScheduler.py Weekly |

### Manutenção CyberPanel

| Horário | Tarefa |
|---------|--------|
| Toda hora | findBWUsage.py (monitoramento de banda) |
| Toda hora | postfixSenderPolicy hourlyCleanup |
| 02:00 | upgradeCritical.py (atualizações críticas) |
| 02:00 | renew.py (renovação SSL) |
| 09,39 min | cleansessions (limpeza de sessões) |

### Renovação SSL

```bash
# Certbot (via CyberPanel)
0 2 * * * /usr/local/CyberCP/bin/python /usr/local/CyberCP/plogical/renew.py

# acme.sh
28 13 * * * "/root/.acme.sh"/acme.sh --cron --home "/root/.acme.sh"
```

### Auto-restart LiteSpeed

```bash
# Reinicia LiteSpeed se .htaccess foi modificado
*/3 * * * * if ! find /home/*/public_html/ -maxdepth 2 -type f -newer /usr/local/lsws/cgid -name '.htaccess' -exec false {} +; then systemctl restart lsws; fi
```

---

## Acesso ao CyberPanel (Painel Web)

### Dados de Login

| Item | Valor |
|------|-------|
| **URL** | `https://46.202.149.24:8090` |
| **Usuario** | `admin` |
| **Senha** | `cyberpanel` |
| **Servico** | lscpd (porta 8090, escutando em 0.0.0.0) |

### Como Acessar

1. Abra o navegador e acesse: `https://46.202.149.24:8090`
2. O navegador mostrara aviso de certificado (auto-assinado) — clique em **"Avancado"** > **"Continuar mesmo assim"**
3. Faca login com usuario `admin` e senha `cyberpanel`

### Funcionalidades Principais do Painel

| Menu | Funcao |
|------|--------|
| **Websites** | Criar/gerenciar sites, DNS, SSL |
| **Databases** | phpMyAdmin, criar/gerenciar bancos MariaDB |
| **Email** | Criar contas de email, webmail |
| **FTP** | Criar contas FTP |
| **DNS** | Gerenciar zonas DNS (PowerDNS) |
| **SSL** | Emitir/renovar certificados Let's Encrypt |
| **File Manager** | Gerenciar arquivos dos sites via browser |
| **Docker** | Gerenciar containers Docker |
| **Firewall** | Regras de firewall (CSF/UFW) |
| **Server Status** | Monitorar CPU, RAM, disco, processos |
| **Packages** | Limites de recursos por pacote |
| **Users** | Gerenciar usuarios e permissoes |

### Troubleshooting CyberPanel

```bash
# Verificar se o painel esta rodando
systemctl status lscpd

# Reiniciar o painel
systemctl restart lscpd

# Ver logs do painel
tail -f /usr/local/CyberCP/logs/access.log
tail -f /usr/local/CyberCP/logs/error.log

# Resetar senha do admin (se necessario)
/usr/local/CyberCP/bin/python /usr/local/CyberCP/plogical/adminPass.py --password NOVA_SENHA

# Verificar porta 8090
ss -tlnp | grep 8090
```

### Se o Painel Nao Abre

1. **Verificar se lscpd esta ativo**: `systemctl is-active lscpd` (deve retornar `active`)
2. **Verificar firewall**: porta 8090 deve estar liberada (Accept TCP 8090 no firewall Hostinger)
3. **Verificar se a porta responde**: `ss -tlnp | grep 8090`
4. **Reiniciar**: `systemctl restart lscpd`
5. **Se nada funcionar**: `systemctl stop lscpd && sleep 5 && systemctl start lscpd`

---

## Acesso SSH (REGRA OBRIGATORIA!)

### Autenticacao Pre-Configurada

A maquina local do usuario **JA POSSUI chave SSH ed25519 configurada** para acesso ao servidor. A chave esta em `C:\Users\sabola\.ssh\id_ed25519` e e **auto-detectada** pelo cliente SSH — nao precisa de flag `-i`.

**Chave publica cadastrada no servidor:**
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIDboEpnrmA8cU4txx6VAk1cJ5AP41uDjM7zWpkHdAa8y tondinrafael@gmail.com
```

**Chave tambem cadastrada no painel Hostinger** (Configuracoes > Chaves SSH > nome: `tondinrafael`).

**Comando unico de acesso:**
```bash
ssh root@46.202.149.24
```

**Para executar comandos remotos (sem sessao interativa):**
```bash
ssh root@46.202.149.24 "COMANDO_AQUI"
```

**Para copiar arquivos:**
```bash
# Local → Servidor
scp ARQUIVO root@46.202.149.24:/CAMINHO/DESTINO/

# Servidor → Local
scp root@46.202.149.24:/CAMINHO/ARQUIVO ./
```

**Acesso via PowerShell (quando bash nao funcionar):**
```powershell
& ssh -o ConnectTimeout=15 -i 'C:\Users\sabola\.ssh\id_ed25519' root@46.202.149.24 'COMANDO'
```

### Regras de Acesso

| Regra | Detalhe |
|-------|---------|
| **Usuario** | SEMPRE `root` — nunca usar outro usuario (ubuntu, admin, etc.) |
| **IP** | SEMPRE `46.202.149.24` — nunca usar hostname ou outro IP |
| **Porta** | SEMPRE `22` (padrao) — nunca usar `-p` com outra porta |
| **Autenticacao** | Chave SSH ed25519 auto-detectada — NUNCA pedir senha ao usuario |
| **Chave local** | `C:\Users\sabola\.ssh\id_ed25519` (ed25519, gerada em 2026-02-18) |
| **Fallback PowerShell** | Se bash falhar, usar `powershell "& ssh -i 'C:\Users\sabola\.ssh\id_ed25519' root@46.202.149.24 'CMD'"` |

### Gerenciar OpenLiteSpeed

```bash
# Status
/usr/local/lsws/bin/lswsctrl status

# Reiniciar (graceful)
/usr/local/lsws/bin/lswsctrl restart

# Parar
/usr/local/lsws/bin/lswsctrl stop

# Iniciar
/usr/local/lsws/bin/lswsctrl start
```

### Gerenciar Serviços

```bash
# MariaDB
systemctl status mariadb
systemctl restart mariadb

# Redis
systemctl status redis-server
systemctl restart redis-server

# Postfix (Email)
systemctl status postfix
systemctl restart postfix

# Dovecot (Email)
systemctl status dovecot
systemctl restart dovecot
```

### Verificar Logs

```bash
# Log do LiteSpeed (global)
tail -f /usr/local/lsws/logs/error.log

# Log de um site específico
tail -f /home/DOMINIO/logs/DOMINIO.error_log
tail -f /home/DOMINIO/logs/DOMINIO.access_log

# Log do CyberPanel
tail -f /usr/local/CyberCP/logs/access.log
```

### Verificar Recursos

```bash
# Uso de memória
free -h

# Uso de disco
df -h

# Processos
htop

# Uptime
uptime
```

---

## Estrutura de Diretórios Importante

```
/home/
├── DOMINIO/                        # Cada site tem seu diretório
│   ├── public_html/                # Document Root
│   └── logs/                       # Logs do site

/usr/local/lsws/                    # OpenLiteSpeed
├── conf/
│   ├── httpd_config.conf           # Config principal (listeners)
│   └── vhosts/DOMINIO/vhost.conf   # Config do vhost
├── bin/lswsctrl                    # Controle do LiteSpeed
└── logs/                           # Logs globais

/usr/local/CyberCP/                 # CyberPanel
├── bin/python                      # Python do CyberPanel
├── plogical/                       # Scripts lógicos
└── logs/                           # Logs do painel

/etc/letsencrypt/live/              # Certificados SSL
└── DOMINIO/
    ├── fullchain.pem
    └── privkey.pem

/root/.acme.sh/                     # acme.sh para SSL alternativo
```

---

## Firewall

**Status**: UFW está **INATIVO**

> **Nota**: O firewall UFW não está habilitado. A proteção pode estar sendo feita a nível de infraestrutura (Hostinger) ou via outras ferramentas.

Para habilitar UFW (se necessário):

```bash
# Permitir portas essenciais primeiro
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 8090/tcp  # CyberPanel

# Habilitar
ufw enable
```

---

## Docker

**Status**: Docker + docker-compose v2.24.5 (standalone, instalado via pip — NÃO é plugin `docker compose`).

**ATENÇÃO:** Usar `docker-compose` (com hífen), NÃO `docker compose` (sem hífen).

```bash
# Ver containers
docker ps

# Ver todos (incluindo parados)
docker ps -a

# Ver imagens
docker images

# Compose (SEMPRE com hífen)
docker-compose up -d
docker-compose build
docker-compose logs -f
```

### Serviços Docker Ativos

| Serviço | Container | Porta | Diretório | Descrição |
|---------|-----------|-------|-----------|-----------|
| **Motion API** | motion-api | 3100→3000 | /opt/motion-api | API de geração de vídeo HTML→MP4 com narração ElevenLabs |

### Motion API (motion.rafaeltondin.com.br)

**Função:** API REST para gerar vídeos MP4 a partir de HTML animado com narração via ElevenLabs.

**Acesso:**
- **URL pública:** `https://motion.rafaeltondin.com.br`
- **Porta Docker:** 3100 (host) → 3000 (container)
- **Autenticação:** Header `X-API-Key` (valor no `.env` em `/opt/motion-api/.env`)
- **Reverse Proxy:** OLS vhost com `extprocessor` proxy para `127.0.0.1:3100`

**Endpoints:**

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/health` | Status do servidor + jobs ativos |
| POST | `/api/generate` | Upload HTML multipart → gerar vídeo |
| POST | `/api/generate-inline` | Enviar HTML como string JSON |
| GET | `/api/jobs/:id` | Status de um job |
| GET | `/api/jobs/:id/download` | Download do MP4 gerado |
| GET | `/api/jobs` | Listar últimos 20 jobs |
| DELETE | `/api/jobs/:id` | Deletar job |

**Recursos do container:** 4GB RAM, 3 CPUs, 1GB shm_size, 2GB tmpfs.

**Gerenciar:**
```bash
cd /opt/motion-api
docker-compose up -d        # Iniciar
docker-compose down          # Parar
docker-compose logs -f       # Ver logs
docker-compose build         # Rebuild
```

---

## Acessos Web

| Serviço | URL | Porta |
|---------|-----|-------|
| CyberPanel | https://46.202.149.24:8090 | 8090 | admin / cyberpanel |
| phpMyAdmin | Via CyberPanel > Databases | - | - |
| Webmail | Via dominio especifico | - | - |

---

## Informações de Uptime

**Uptime atual**: 24 dias, 8 horas

**Load Average**: 0.07, 0.05, 0.00 (muito baixo - servidor bem dimensionado)

---

## Troubleshooting Rápido

### Site não carrega (404)

```bash
# Verificar listeners
grep -n '^listener' /usr/local/lsws/conf/httpd_config.conf

# Verificar mapeamento no listener HTTP
awk '/^listener HTTP/,/^listener [^H]/' /usr/local/lsws/conf/httpd_config.conf | grep DOMINIO
```

### SSL não funciona

```bash
# Verificar certificado
echo | openssl s_client -connect DOMINIO:443 -servername DOMINIO 2>/dev/null | openssl x509 -noout -issuer -dates

# Reemitir via CyberPanel ou certbot
certbot certonly --standalone -d DOMINIO --force-renewal
```

### Servidor lento

```bash
# Verificar memória
free -h

# Verificar CPU
top -bn1 | head -20

# Verificar disco
df -h
iostat -x 1 5
```

### Reiniciar tudo

```bash
# Reiniciar LiteSpeed
/usr/local/lsws/bin/lswsctrl restart

# Reiniciar MariaDB
systemctl restart mariadb

# Reiniciar Redis
systemctl restart redis-server
```

---

## Contatos e Suporte

| Item | Informação |
|------|------------|
| **Provedor** | Hostinger |
| **Tipo** | VPS Cloud |
| **Datacenter** | Europa (baseado no IPv6) |
| **Suporte Hostinger** | https://www.hostinger.com.br/suporte |
| **Docs CyberPanel** | https://docs.cyberpanel.net/ |

---

**Documento Criado**: 2025-12-22
**Última Atualização**: 2025-12-22
**Versão**: 1.0.0

---

## Notas de Segurança

1. **SSH esta configurado** com chave ed25519 (`C:\Users\sabola\.ssh\id_ed25519`) — acesso automatico, sem senha
2. **UFW esta desativado** - considere habilitar para maior seguranca
3. **MariaDB** escuta apenas em localhost (127.0.0.1) - seguro
4. **Redis** escuta apenas em localhost - seguro
5. **226 certificados SSL** gerenciados automaticamente

---

**Documento Criado**: 2025-12-22
**Ultima Atualizacao**: 2026-03-12
**Versao**: 1.3.0

---

## Lições Aprendidas (Auto-gerado por /aprender)

> Seção atualizada automaticamente. Consultar ANTES de executar tarefas no servidor.

### 2026-03-12 - acme.sh disponível no servidor como alternativa ao certbot
**Contexto:** Necessidade de emitir SSL quando Let's Encrypt estava com rate limit.
**Erro:** certbot esgotou o rate limit de validações falhas. `cyberpanel issueSSL` também falhava.
**Solução:** `~/.acme.sh/acme.sh` já está instalado no servidor. Usar com `--server zerossl` para CA alternativa. Certs ECC ficam em `~/.acme.sh/DOMINIO_ecc/`.
**Regra:** Antes de usar certbot em loop, verificar se `~/.acme.sh/acme.sh` está disponível. ZeroSSL é confiável em todos os browsers e não tem rate limit agressivo.

---

### 2026-03-12 - Ferramenta cyberpanel_site no tools-cli para criar sites automaticamente
**Contexto:** Necessidade de criar sites + SSL via CLI sem acessar painel web.
**Solução:** `node tools-cli.js cyberpanel_site action=create domain=DOMINIO` — cria site via `cyberpanel createWebsite`, fixa listener HTTP, cria `.well-known`, emite SSL com fallback (cyberpanel → acme.sh → certbot).
**Ações:** create (site+SSL), list (listar 107 sites), delete (remover), ssl (emitir/reemitir).
**Regra:** Sempre usar `cyberpanel_site` ao invés de SSH manual. A ferramenta já aplica todos os workarounds (listener HTTP, .htaccess fix, ACME dir, permissões).

---

### 2026-03-13 - docker compose vs docker-compose no servidor
**Contexto:** Deploy de container Docker (Motion API) no servidor.
**Erro:** `docker compose build` falhou com "docker: 'compose' is not a docker command" — o servidor tem docker-compose standalone (v2.24.5 via pip), não o plugin Docker Compose V2.
**Solução:** Usar `docker-compose` (com hífen) em vez de `docker compose` (subcomando plugin).
**Regra:** No servidor CyberPanel, SEMPRE usar `docker-compose` (com hífen). Verificar com `which docker-compose` antes de assumir sintaxe.

---

### 2026-03-12 - Novo site criado via cyberpanel cria usuário específico (betpr9297, apost3046, etc.)
**Contexto:** Cada site criado no CyberPanel recebe um usuário de sistema único (truncado para 8 chars + 4 dígitos).
**Erro:** Arquivos copiados de outro site ficaram com owner do site de origem, quebrando permissões do OLS.
**Solução:** Identificar o usuário do novo site com `ls -la /home/DOMINIO/` e usar `chown -R USUARIO:USUARIO /home/DOMINIO/public_html` após qualquer cópia de arquivos.
**Regra:** Padrão de usuário CyberPanel = primeiros chars do domínio + 4 dígitos (ex: `betpr9297`). Sempre verificar com `stat -c '%U' /home/DOMINIO/public_html` após rsync/cp.

### 2026-03-14 - Motion API roda via PM2, não systemd — NUNCA usar pm2 delete all
**Contexto:** Tentativa de limpar processos motion-api no servidor
**Erro:** `pm2 delete all` deletou TODOS os apps (alphasup, betpredict, jdm, whatsapp), não só o motion-api
**Solução:** Usar `pm2 stop motion-api && pm2 delete motion-api` (nome específico). Para restaurar: `pm2 start /path/server.js --name NOME && pm2 save`
**Regra:** NUNCA usar `pm2 stop all` ou `pm2 delete all`. Sempre especificar o nome do app. Apps PM2 no servidor: alphasup-backend, jdm-autocontent, betpredict, motion-api.

### 2026-03-14 - Express body-parser e multer: aumentar limites para HTML com imagens base64
**Contexto:** Motion API recebendo HTML de 24MB com imagens base64 inline
**Erro:** `PayloadTooLargeError` (json limit 10MB) e `MulterError: File too large` (multer 5MB)
**Solução:** `express.json({ limit: '50mb' })` e `multer({ limits: { fileSize: 50 * 1024 * 1024 } })`
**Regra:** Para APIs que recebem HTML com imagens base64, configurar limites de pelo menos 50MB tanto no body-parser quanto no multer.

---

### 2026-03-20 - mbstring indisponível no servidor (PHP 8.2)
**Contexto:** PHP 8.2 no servidor tem mbstring quebrado (`undefined symbol: pcre2_code_free_8`)
**Erro:** `mb_internal_encoding('UTF-8')` causava warning/fatal no config.php ao carregar
**Solução:** Remover qualquer chamada a `mb_internal_encoding()` e evitar funções `mb_*` no servidor
**Regra:** Servidor riwerlabs NÃO tem mbstring funcional em PHP 8.2. NUNCA usar funções `mb_*` (mb_strlen, mb_substr, mb_strtolower, mb_internal_encoding, etc.). Usar equivalentes nativos: strlen, substr, strtolower.

---

### 2026-03-20 - sed no SSH perde variáveis PHP ($) — corrompe arquivos
**Contexto:** Tentativa de injetar código PHP com `$_SERVER`, `$body`, `$phone` via sed no SSH
**Erro:** O `$` é interpretado pelo bash antes de chegar ao sed, resultando em variáveis vazias ou strings corrompidas. config.php ficou com `APP_ENV", "development"'` após múltiplas tentativas
**Solução:** Para editar PHP no servidor: 1) criar o script localmente, 2) enviar via `scp_transfer`, 3) executar com `/usr/local/lsws/lsphp82/bin/php /tmp/script.php`
**Regra:** NUNCA usar sed para editar código PHP com variáveis ($) via SSH. Usar `scp_transfer` + `ssh_exec` para executar scripts PHP no servidor.

---

### 2026-03-20 - Logs PHP no OLS devem ter nome não previsível e ficar na pasta da app
**Contexto:** Arquivo de log em `/home/riwerlabs.com/logs/` não era gravado pelo PHP web
**Erro:** lsphp roda como o usuário do site mas o diretório logs/ pode ter permissões restritivas. Além disso, OLS NÃO bloqueia arquivos .log por padrão
**Solução:** Colocar o log dentro do diretório da aplicação (`__DIR__ . '/wa_9f3k2x.log'`) com chmod 666. Usar nome não adivinhável (hash ou sufixo aleatório)
**Regra:** Logs de aplicação PHP no OLS: pasta da app + nome não previsível + chmod 666. NUNCA usar `/home/DOMINIO/logs/` para logs de app (permissões do sistema, não da app).

---

### 2026-03-20 - declare(strict_types=1) DEVE ser a primeira instrução PHP
**Contexto:** Guard PHP adicionado antes do `declare(strict_types=1)` em whatsapp.php
**Erro:** PHP exige que `declare()` seja a primeira instrução real do arquivo (após `<?php` e comentários). Guard antes quebrava o parse
**Solução:** Colocar o guard DEPOIS do declare, ou remover o guard deixando o arquivo seguro por design (apenas define funções)
**Regra:** `declare(strict_types=1)` DEVE ser a primeira instrução em arquivos PHP. Qualquer guard, verificação ou código deve vir APÓS o declare.

---

### 2026-03-22 - NUNCA rodar iptables -F se INPUT policy é DROP
**Contexto:** SSH bloqueado por fail2ban, tentativa de limpar firewall para desbloquear
**Erro:** `iptables -F` remove TODAS as regras, mas a política padrão da chain INPUT era DROP. Resultado: servidor dropou TODO tráfego de entrada (SSH, HTTP, tudo).
**Solução:** Antes de flush, SEMPRE definir política ACCEPT: `iptables -P INPUT ACCEPT && iptables -P FORWARD ACCEPT && iptables -P OUTPUT ACCEPT` e SÓ DEPOIS `iptables -F`.
**Regra:** NUNCA `iptables -F` sem antes verificar/definir `iptables -P INPUT ACCEPT`. Sequência segura: `iptables -P INPUT ACCEPT && iptables -F && firewall-cmd --reload`.

---

### 2026-03-22 - fail2ban bane IP após muitas conexões SSH seguidas
**Contexto:** Sessão com ~30 conexões SSH em sequência (uploads, validações) acionou fail2ban e baniu o IP
**Erro:** Tentativas de reconexão agravaram o ban. Ping também bloqueado (firewall total).
**Solução:** Via terminal browser Hostinger: `fail2ban-client unban --all`. Preventivo: espaçar conexões SSH ou usar sessão persistente.
**Regra:** Em sessões com muitos SSH (>15 em 5min), espaçar conexões. Se banido: terminal Hostinger → `fail2ban-client unban --all`.

---

### 2026-03-22 - Terminal browser Hostinger (VNC canvas) não aceita automação CDP
**Contexto:** Tentativa de digitar no terminal browser via Chrome DevTools MCP
**Erro:** Terminal é canvas noVNC/SPICE — `type_text` e `press_key` do CDP não funcionam. Renderiza via Canvas2D, não DOM.
**Solução:** Fornecer comandos ao usuário para executar manualmente. Não é possível automatizar.
**Regra:** Terminal Hostinger = canvas VNC, NÃO automatizável via CDP. Fornecer comandos prontos ao usuário.

---

### 2026-03-22 - Senha root Hostinger: símbolos permitidos limitados
**Contexto:** Reset de senha root via painel Hostinger
**Erro:** Senha com `$` e `!` rejeitada. Hostinger permite apenas: `-().&@?'#./;+`
**Solução:** Usar apenas símbolos da lista. Ex: `RwLabs.Srv2026#Pro`
**Regra:** Senhas root Hostinger VPS: apenas `-().&@?'#./;+`, 12-50 chars, maiúsc+minúsc+número.

---

### 2026-03-22 - eth0 pode não estar em nenhuma zona do firewalld
**Contexto:** SSH escutando, porta 22 liberada, mas tráfego não chegava
**Erro:** `firewall-cmd --get-active-zones` mostrava apenas bridges Docker, eth0 sem zona.
**Solução:** `firewall-cmd --zone=docker --add-interface=eth0 --permanent && firewall-cmd --reload`
**Regra:** SSH inacessível com sshd escutando: verificar `firewall-cmd --get-zone-of-interface=eth0`. Se "no zone", adicionar à zona ativa.

---

### 2026-03-22 - Docker-proxy quebra silenciosamente — containers "Up" mas portas inacessíveis
**Contexto:** Evolution API com `network_mode: host` conectava ao PostgreSQL via `localhost:5433` (docker-proxy). Container postgres mostrava "Up 11 hours" mas a porta 5433 não respondia (timeout).
**Erro:** `docker-proxy` intermediava a porta 5433→5432 mas travou. `ss -tlnp` mostrava docker-proxy escutando, porém `echo > /dev/tcp/localhost/5433` dava timeout. Conexão direta ao IP interno do container (`172.18.0.2:5432`) funcionava normalmente.
**Solução:** Remover `network_mode: host` do serviço dependente e colocá-lo na mesma rede bridge. Usar nomes de container (`postgres:5432`) em vez de `localhost:PORTA_MAPEADA`.
**Regra:** NUNCA misturar `network_mode: host` com containers em bridge network. Se um container precisa acessar outro, ambos devem estar na mesma rede bridge usando nomes de serviço. Docker-proxy é um ponto único de falha silencioso.

---

### 2026-03-22 - Evolution API v2.3.7: configuração correta de rede Docker
**Contexto:** Evolution API não iniciava — loop de restart 721x tentando conectar ao PostgreSQL.
**Erro:** Configuração original usava `network_mode: host` + `DATABASE_CONNECTION_URI=postgresql://...@localhost:5433/evolution`. O docker-proxy da porta 5433 estava quebrado.
**Solução:** Arquivo: `/opt/evolution-api/docker-compose.yml`. Mudanças: (1) Remover `network_mode: host`, (2) Adicionar `networks: [evolution-network]` e `ports: ["8080:8080"]`, (3) `DATABASE_CONNECTION_URI` → `postgres:5432` (nome do serviço), (4) `CACHE_REDIS_URI` → `redis:6379/6` (nome do serviço).
**Regra:** Evolution API DEVE estar na mesma bridge network que postgres e redis. Usar nomes de serviço Docker (postgres, redis) em vez de localhost com portas mapeadas. Proxy reverso OLS aponta para `127.0.0.1:8080`.

---

### 2026-03-23 - SSH batch obrigatório: nunca fazer múltiplas conexões rápidas
**Contexto:** Sessão de edição de página OpenClaw com ~20 conexões SSH em 10 minutos (grep, sed, scp, verificações)
**Erro:** fail2ban baniu o IP após ~15 conexões. Todas as tentativas de reconexão falharam (connection reset/timeout). Perda de ~10min esperando unban.
**Solução:** (1) Planejar TODOS os comandos antes de conectar. (2) Encadear com `&&` numa única SSH. (3) Para edições complexas: criar script Python local → scp + ssh python3 (2 conexões). (4) Máximo ~10 conexões por sessão.
**Regra:** NUNCA fazer múltiplas conexões SSH em sequência rápida. Agrupar comandos. Se banido: terminal VNC Hostinger → `fail2ban-client unban --all`. Regra adicionada ao CLAUDE.md.

### 2026-03-24 - .htaccess RewriteRule ignorado pelo OpenLiteSpeed
**Contexto:** Redirect 301 via .htaccess no webmail.edermatic.com.br
**Erro:** OLS serviu a página normalmente (200) ignorando o RewriteEngine/RewriteRule. O mod_rewrite do Apache não é compatível com OLS.
**Solução:** Usar PHP redirect (`header("Location: URL", true, 301); exit;`) ou configurar rewrite no vhost.conf do OLS.
**Regra:** Para redirects no OLS: NUNCA .htaccess com RewriteRule. Usar PHP header() ou rewrite rules nativas do OLS no vhost.conf.

### 2026-03-24 - Webmail multi-domínio: SnappyMail quebrado, redirecionar para Roundcube
**Contexto:** CyberPanel cria vhosts de webmail com SnappyMail para cada domínio, mas sem configuração
**Erro:** SnappyMail nunca inicializa (suExec uid 65534, diretório data/ vazio). Usuário vê "Falha na conexão com o servidor".
**Solução:** (1) Substituir index.php do SnappyMail por redirect PHP para Roundcube principal. (2) Instalar watchdog cron que recria redirects automaticamente.
**Regra:** Webmails de domínios secundários → redirect PHP para webmail.rafaeltondin.com.br. Watchdog em `/usr/local/bin/webmail-watchdog.sh` garante auto-recuperação.
