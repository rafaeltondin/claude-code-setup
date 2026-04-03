---
title: "OLS CyberPanel - Proxy Docker + SSL: Problemas e Soluções Críticas"
category: "Infraestrutura"
tags:
  - cyberpanel
  - openlitespeed
  - proxy
  - docker
  - ssl
  - lets-encrypt
  - listener
  - vhost
  - 404
  - certbot
  - fastapi
  - acme-challenge
  - httpd_config
  - troubleshooting
topic: "Infraestrutura de Hospedagem"
priority: high
version: "1.0.0"
last_updated: "2026-03-04"
---

# OLS CyberPanel - Proxy Docker + SSL: Problemas e Soluções Críticas

Documentação de problemas críticos e soluções descobertos ao configurar o OpenLiteSpeed (CyberPanel) como proxy reverso para containers Docker com SSL via Let's Encrypt.

---

## Problema 1: listener Default vs listener HTTP (CRÍTICO)

O CyberPanel tem DOIS listeners na porta 80:
- `listener Default` — listener LEGADO (pode estar inativo)
- `listener HTTP` — listener ATIVO (criado depois)

Quando o CyberPanel cria um novo site, pode adicionar o map ao `listener Default` (legado) em vez do `listener HTTP` (ativo). Isso causa 404 para o domínio mesmo com `vhost.conf` correto.

### Diagnóstico

```bash
# Verificar qual listener tem o domínio mapeado
grep -n 'listener Default\|listener HTTP\|map.*DOMINIO' /usr/local/lsws/conf/httpd_config.conf

# Ver se há DOIS listeners na porta 80
grep -n 'address.*:80' /usr/local/lsws/conf/httpd_config.conf
```

**Sintoma:** Requests aparecem no `access.log` GLOBAL sem prefixo de domínio (`["domínio"]`). O `vhost-specific access_log` fica vazio — o vhost não está sendo matched.

### Fix

Adicionar o domínio ao listener ativo (`listener HTTP`):

```bash
sed -i '/^listener HTTP {/a\\  map                     DOMINIO DOMINIO' /usr/local/lsws/conf/httpd_config.conf
kill -TERM $(ps aux | grep 'lshttpd - main' | grep -v grep | awk '{print $2}')
sleep 3
/usr/local/lsws/bin/lswsctrl start
```

---

## Problema 2: ACME Challenge com Proxy Context

Quando o vhost tem `context /` com tipo proxy, o ACME challenge (`/.well-known/acme-challenge/`) é interceptado pelo proxy antes do contexto estático. O certbot não consegue validar o domínio.

### Solução

Adicionar rota no FastAPI/app para servir arquivos do ACME challenge via volume Docker:

```python
# app/main.py
from fastapi.responses import FileResponse
import pathlib

ACME_DIR = "/acme-challenge"

@app.get("/.well-known/acme-challenge/{token}")
async def acme_challenge(token: str):
    f = pathlib.Path(ACME_DIR) / token
    if f.exists():
        return FileResponse(f)
    return Response(status_code=404)
```

```bash
# Container com volume para o challenge dir
docker run -d \
  -v /home/DOMINIO/public_html/.well-known/acme-challenge:/acme-challenge:ro \
  ...

# Emitir SSL com certbot webroot
certbot certonly --webroot -w /home/DOMINIO/public_html -d DOMINIO \
  --non-interactive --agree-tos -m admin@DOMINIO --cert-name NOME-CERT
```

---

## Problema 3: .htaccess bloqueia proxy

Um `.htaccess` com `RewriteRule ^ - [L]` bloqueia o roteamento do proxy OLS mesmo com `context / { type proxy }`.

**Fix:** Nunca criar `.htaccess` com `RewriteRule` que intercepte todas as rotas em vhosts com proxy. Remover ou deixar o arquivo vazio.

---

## Problema 4: Cert Let's Encrypt com nome diferente

Quando `certbot --cert-name NOME` cria cert com nome diferente do domínio, o `vhost.conf` precisa apontar para o path correto:

```
/etc/letsencrypt/live/NOME/privkey.pem
# e NAO:
/etc/letsencrypt/live/DOMINIO/privkey.pem
```

Verificar o nome real do cert:
```bash
certbot certificates | grep -A3 'DOMINIO'
```

---

## Estrutura correta do vhost.conf para proxy Docker

```
extprocessor APP_NAME {
  type                    proxy
  address                 http://localhost:PORT
  maxConns                100
  pcKeepAliveTimeout      60
  initTimeout             60
  retryTimeout            0
  respBuffer              0
}

context / {
  type                    proxy
  handler                 APP_NAME
  addDefaultCharset       off
}

rewrite  {
  enable                  0
}

vhssl  {
  keyFile                 /etc/letsencrypt/live/CERT-NAME/privkey.pem
  certFile                /etc/letsencrypt/live/CERT-NAME/fullchain.pem
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

**Ordem importa:** `extprocessor` → `context /` → `rewrite` → `vhssl`

---

## Comandos Úteis

```bash
# Reload OLS (graceful — sem downtime)
/usr/local/lsws/bin/lswsctrl reload

# Restart completo OLS
kill -TERM $(ps aux | grep 'lshttpd - main' | grep -v grep | awk '{print $2}')
sleep 3
/usr/local/lsws/bin/lswsctrl start

# Verificar se vhost está sendo roteado corretamente
tail -5 /home/DOMINIO/logs/DOMINIO.access_log
# Se vazio → vhost não está sendo matched

tail -5 /usr/local/lsws/logs/access.log
# Se aparecer sem ["domínio"] → mapeado no listener errado (Problema 1)

# Ver listeners configurados
grep -n 'listener\|address\|map' /usr/local/lsws/conf/httpd_config.conf

# Listar certificados Let's Encrypt
certbot certificates
```

---

## Fluxo de Diagnóstico Completo (404 em vhost com proxy Docker)

1. Verificar se o vhost existe: `ls /usr/local/lsws/conf/vhosts/DOMINIO/`
2. Verificar se o domínio está mapeado no listener ATIVO (ver Problema 1)
3. Verificar se há `.htaccess` com RewriteRule bloqueando (ver Problema 3)
4. Verificar se o container Docker está rodando: `docker ps`
5. Verificar se a porta do container está acessível: `curl http://localhost:PORT/`
6. Verificar logs do vhost: `tail -20 /home/DOMINIO/logs/DOMINIO.access_log`
7. Verificar logs globais OLS: `tail -20 /usr/local/lsws/logs/error.log`

---

## Problema 5 — OLS ignora .htaccess completamente

**Sintoma:** Arquivo .htaccess com `FilesMatch` ou `Deny from all` não bloqueia acesso. PHP sensível retorna 200.

**Causa:** OpenLiteSpeed NÃO processa .htaccess (ao contrário do Apache). Qualquer regra de proteção via .htaccess é silenciosamente ignorada.

**Solução — Guard PHP no início do arquivo:**
```php
<?php
// Guard obrigatório em arquivos PHP sensíveis no OLS
if (basename($_SERVER['SCRIPT_FILENAME']) === 'config.php') {
    http_response_code(403);
    exit('Forbidden');
}
```

**Observação:** Se o arquivo tiver `declare(strict_types=1)`, o guard deve vir DEPOIS:
```php
<?php
declare(strict_types=1);

// Guard vem após o declare
if (basename($_SERVER['SCRIPT_FILENAME']) === 'config.php') {
    http_response_code(403);
    exit;
}
```

**Regra:** NUNCA confiar em .htaccess no OLS para proteger arquivos PHP. SEMPRE usar guard PHP inline no próprio arquivo sensível.

---

## Problema 6 — Frontend e Backend desenvolvidos em paralelo: contrato de API obrigatório

**Sintoma:** Frontend não consegue consumir o backend — nomes de rotas diferentes, formato de resposta incompatível.

**Causa:** Backend PHP wrapa respostas em `{success: true, data: ...}` mas frontend esperava dados flat. Rotas com nomes diferentes entre agentes (tasks_list vs tasks, opp_create vs opportunities POST).

**Solução:**
1. Definir CONTRATO DE API antes de implementar: formato de resposta, nomes de rotas, métodos HTTP
2. Backend deve documentar o envelope de resposta: `{ success: boolean, data: any, error?: string }`
3. Frontend deve extrair `.data` automaticamente no API client (interceptor ou wrapper)

**Template de contrato mínimo:**
```json
{
  "envelope": "{ success, data, error }",
  "routes": {
    "GET /api/tasks": "listar tarefas",
    "POST /api/tasks": "criar tarefa",
    "POST /api/opportunities": "criar oportunidade"
  }
}
```

**Regra:** Ao desenvolver frontend e backend com agentes separados (ou em paralelo), definir o contrato de API ANTES. Sem contrato, garantir que o API client do frontend extrai `.data` de respostas envelopadas.
