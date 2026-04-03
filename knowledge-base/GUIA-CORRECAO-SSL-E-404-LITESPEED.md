---
title: "Guia Completo: Correção de SSL e Erro 404 no OpenLiteSpeed (CyberPanel)"
category: "Infraestrutura"
tags:
  - ssl
  - ssl certificate
  - litespeed
  - openlitespeed
  - cyberpanel
  - lets encrypt
  - certbot
  - erro 404
  - http
  - https
  - servidor web
  - troubleshooting
topic: "Infraestrutura de Hospedagem"
priority: high
version: "1.0.0"
last_updated: "2025-12-23"
---

# Guia Completo: Correção de SSL e Erro 404 no OpenLiteSpeed (CyberPanel)

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Sobre o CyberPanel](#sobre-o-cyberpanel)
3. [Problema 1: Certificado SSL Auto-Assinado](#problema-1-certificado-ssl-auto-assinado)
4. [Problema 2: Erro 404 no HTTP](#problema-2-erro-404-no-http)
5. [Checklist para Outros Sites](#checklist-para-outros-sites)
6. [Troubleshooting Comum](#troubleshooting-comum)
7. [Comandos Úteis](#comandos-úteis)

---

## Visão Geral

Este documento descreve o processo completo de correção de dois problemas comuns em sites hospedados no **OpenLiteSpeed gerenciado pelo CyberPanel**:

1. **Certificado SSL auto-assinado** causando aviso de "conexão não segura"
2. **Erro 404** ao acessar o site via HTTP

**Caso de Exemplo**: app.majoryachts.com.br
**Servidor**: Ubuntu 22.04.5 LTS com OpenLiteSpeed + CyberPanel
**IP**: 46.202.149.24
**Painel de Controle**: CyberPanel (https://IP:8090)

---

## Sobre o CyberPanel

### O que é CyberPanel?

**CyberPanel** é um painel de controle web gratuito e de código aberto, desenvolvido especialmente para o **OpenLiteSpeed** (versão gratuita) e **LiteSpeed Enterprise**. É uma alternativa moderna ao cPanel/WHM, Plesk e outros painéis tradicionais.

### Características Principais

- **Web Server**: OpenLiteSpeed (gratuito) ou LiteSpeed Enterprise (pago)
- **Gerenciamento**: Interface web em https://IP:8090
- **SSL Automático**: Integração nativa com Let's Encrypt
- **DNS**: Servidor DNS integrado (PowerDNS)
- **Email**: Servidor de email completo (Postfix + Dovecot)
- **Backups**: Sistema de backup incremental
- **Git**: Deploy automático via Git
- **Docker**: Suporte nativo a containers

### Estrutura de Diretórios no CyberPanel

```
/home/
├── DOMINIO/                        # Diretório do site
│   ├── public_html/                # Document Root
│   │   ├── .well-known/            # Verificação Let's Encrypt
│   │   └── .htaccess               # Configurações Apache-style
│   └── logs/                       # Logs do site
│       ├── DOMINIO.access_log
│       └── DOMINIO.error_log

/usr/local/lsws/                    # Instalação do OpenLiteSpeed
├── conf/
│   ├── httpd_config.conf           # Configuração principal (listeners)
│   └── vhosts/
│       └── DOMINIO/
│           └── vhost.conf          # Configuração do virtual host
├── bin/
│   └── lswsctrl                    # Controle do LiteSpeed
└── logs/
    └── error.log                   # Log global do LiteSpeed

/etc/letsencrypt/live/              # Certificados Let's Encrypt
└── DOMINIO/
    ├── fullchain.pem               # Certificado + cadeia
    └── privkey.pem                 # Chave privada
```

### Acesso ao Painel CyberPanel

- **URL**: `https://IP_DO_SERVIDOR:8090`
- **Usuário padrão**: admin
- **Porta**: 8090 (HTTPS)

### Quando Usar SSH vs Painel

| Tarefa | SSH (Este Guia) | Painel CyberPanel |
|--------|-----------------|-------------------|
| Emitir SSL Let's Encrypt | ✅ Recomendado para problemas | ✅ Interface gráfica simples |
| Editar vhost.conf | ✅ Necessário | ❌ Pode ser sobrescrito |
| Adicionar listeners | ✅ Necessário | ❌ Não disponível |
| Debug avançado | ✅ Obrigatório | ❌ Limitado |
| Criar sites | ✅ Possível | ✅ Recomendado |
| Gerenciar DNS | ✅ Possível | ✅ Recomendado |

> **Nota**: As configurações feitas via SSH podem ser sobrescritas pelo CyberPanel ao fazer alterações pelo painel. Para correções avançadas como as deste guia, o SSH é necessário.

### SSL via Interface CyberPanel (Método Simples)

Antes de usar os comandos SSH deste guia, tente pelo painel:

1. Acesse: `https://IP:8090`
2. Vá em: **SSL** → **Manage SSL** ou **SSL** → **Issue SSL**
3. Selecione o site e clique em **Issue SSL**
4. Se funcionar, o certificado Let's Encrypt será emitido automaticamente

**Quando usar SSH (este guia)?**
- Quando o painel falha ao emitir SSL
- Quando há erro 404 no HTTP
- Quando o certificado auto-assinado persiste
- Para debug avançado de problemas de SSL

---

## Problema 1: Certificado SSL Auto-Assinado

### 🔍 Diagnóstico

#### Sintoma
- Navegador exibe: "Sua conexão não é particular" / "Conexão não segura"
- Site funciona via HTTPS mas com aviso de segurança

#### Verificação do Problema

```bash
# Conectar via SSH
ssh root@46.202.149.24

# Verificar certificado atual
echo | openssl s_client -connect app.majoryachts.com.br:443 -servername app.majoryachts.com.br 2>/dev/null | openssl x509 -noout -issuer -subject -dates
```

**Resultado Esperado (Certificado Problemático)**:
```
issuer=C = US, ST = Denial, L = Springfield, O = Dis
subject=CN = app.majoryachts.com.br
```

Se o `issuer` não for "Let's Encrypt", o certificado é auto-assinado.

---

### ✅ Solução Passo a Passo

#### Passo 1: Verificar Estrutura de Diretórios

```bash
# Verificar se o diretório public_html existe
ls -la /home/app.majoryachts.com.br/public_html/

# Verificar arquivos do site
ls -la /home/app.majoryachts.com.br/public_html/ | grep index
```

#### Passo 2: Criar Diretório para Let's Encrypt

```bash
# Criar diretório .well-known/acme-challenge
mkdir -p /home/app.majoryachts.com.br/public_html/.well-known/acme-challenge

# Verificar usuário do site
ls -la /home/app.majoryachts.com.br/

# Ajustar permissões (substitua appma9079 pelo usuário correto)
chown -R appma9079:appma9079 /home/app.majoryachts.com.br/public_html/.well-known/
chmod -R 755 /home/app.majoryachts.com.br/public_html/.well-known/
```

#### Passo 3: Verificar e Ajustar Context no vhost.conf

```bash
# Visualizar configuração do vhost
cat /usr/local/lsws/conf/vhosts/app.majoryachts.com.br/vhost.conf | grep -A 10 "context /.well-known"
```

**Problema Comum**: O context aponta para diretório errado:
```
context /.well-known/acme-challenge {
  location                /usr/local/lsws/Example/html/.well-known/acme-challenge
  allowBrowse             1
}
```

**Correção Necessária**: Apontar para o diretório correto do site:

```bash
# Corrigir o caminho do context
sed -i 's|location                /usr/local/lsws/Example/html/.well-known/acme-challenge|location                /home/app.majoryachts.com.br/public_html/.well-known/acme-challenge|g' /usr/local/lsws/conf/vhosts/app.majoryachts.com.br/vhost.conf

# Verificar a correção
grep -A 3 'context /.well-known' /usr/local/lsws/conf/vhosts/app.majoryachts.com.br/vhost.conf
```

#### Passo 4: Ajustar .htaccess (se existir)

```bash
# Verificar se existe .htaccess
cat /home/app.majoryachts.com.br/public_html/.htaccess
```

**Se o .htaccess redireciona tudo para HTTPS**, adicione exceção para .well-known:

```bash
# Editar .htaccess para adicionar exceção
nano /home/app.majoryachts.com.br/public_html/.htaccess
```

Adicione esta regra **ANTES** do redirect HTTPS:

```apache
<IfModule mod_rewrite.c>
    RewriteEngine On

    # Exceção para Let's Encrypt (ACME Challenge)
    RewriteCond %{REQUEST_URI} !^/\.well-known/acme-challenge/

    # Forçar HTTPS em todos os acessos (exceto .well-known)
    RewriteCond %{HTTPS} off
    RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
</IfModule>
```

#### Passo 5: Reiniciar LiteSpeed

```bash
/usr/local/lsws/bin/lswsctrl restart
```

#### Passo 6: Testar Acesso ao .well-known

```bash
# Criar arquivo de teste
echo 'test123' > /home/app.majoryachts.com.br/public_html/.well-known/acme-challenge/test.txt

# Testar via curl
curl -s http://app.majoryachts.com.br/.well-known/acme-challenge/test.txt
```

**Resultado Esperado**: `test123`
**Se retornar 404**: Volte ao Passo 3 e verifique o context.

#### Passo 7: Parar LiteSpeed e Gerar Certificado

```bash
# Parar LiteSpeed (certbot standalone precisa da porta 80 livre)
/usr/local/lsws/bin/lswsctrl stop

# Gerar certificado Let's Encrypt
certbot certonly --standalone -d app.majoryachts.com.br --non-interactive --agree-tos --email contato@app.majoryachts.com.br --force-renewal
```

**Resultado Esperado**:
```
Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/app.majoryachts.com.br-0001/fullchain.pem
Key is saved at:         /etc/letsencrypt/live/app.majoryachts.com.br-0001/privkey.pem
This certificate expires on 2026-01-22.
```

**Observação**: Note o sufixo `-0001` no caminho. Se for a primeira vez, não terá sufixo.

#### Passo 8: Atualizar vhost.conf com Novos Certificados

```bash
# Se o certificado tem sufixo -0001, atualize o vhost.conf
sed -i 's|/etc/letsencrypt/live/app.majoryachts.com.br/|/etc/letsencrypt/live/app.majoryachts.com.br-0001/|g' /usr/local/lsws/conf/vhosts/app.majoryachts.com.br/vhost.conf

# Verificar a alteração
grep -A 5 'vhssl' /usr/local/lsws/conf/vhosts/app.majoryachts.com.br/vhost.conf
```

**Deve mostrar**:
```
vhssl  {
  keyFile                 /etc/letsencrypt/live/app.majoryachts.com.br-0001/privkey.pem
  certFile                /etc/letsencrypt/live/app.majoryachts.com.br-0001/fullchain.pem
  certChain               1
  sslProtocol             24
  enableECDHE             1
```

#### Passo 9: Iniciar LiteSpeed e Verificar

```bash
# Iniciar LiteSpeed
/usr/local/lsws/bin/lswsctrl start

# Verificar certificado SSL
echo | openssl s_client -connect app.majoryachts.com.br:443 -servername app.majoryachts.com.br 2>/dev/null | openssl x509 -noout -issuer -subject -dates
```

**Resultado Esperado**:
```
issuer=C = US, O = Let's Encrypt, CN = R13
subject=CN = app.majoryachts.com.br
notBefore=Oct 24 13:22:02 2025 GMT
notAfter=Jan 22 13:22:01 2026 GMT
```

#### Passo 10: Testar no Navegador

```bash
# Testar via curl
curl -I https://app.majoryachts.com.br
```

**Resultado Esperado**: `HTTP/1.1 200 OK`

Acesse o site no navegador: https://app.majoryachts.com.br
**Deve exibir o cadeado verde sem avisos de segurança.**

---

## Problema 2: Erro 404 no HTTP

### 🔍 Diagnóstico

#### Sintoma
- HTTPS funciona perfeitamente (HTTP 200 OK)
- HTTP retorna 404 Not Found
- LiteSpeed está rodando normalmente

#### Verificação do Problema

```bash
# Testar HTTP
curl -I http://app.majoryachts.com.br

# Resultado problemático: HTTP/1.1 404 Not Found

# Testar HTTPS
curl -I https://app.majoryachts.com.br

# Resultado OK: HTTP/1.1 200 OK
```

#### Verificar Listeners

```bash
# Verificar configuração de listeners
grep -B 3 'address.*:80' /usr/local/lsws/conf/httpd_config.conf | grep -E '(listener|address)'
```

**Causa Raiz**: OpenLiteSpeed pode ter múltiplos listeners na porta 80:
- `listener Default`
- `listener HTTP`

O site pode estar mapeado apenas em um deles.

---

### ✅ Solução Passo a Passo

#### Passo 1: Identificar Todos os Listeners na Porta 80

```bash
# Listar todos os listeners
grep -n '^listener' /usr/local/lsws/conf/httpd_config.conf
```

**Resultado Típico**:
```
345:listener Default {
1428:listener HTTP {
1650:listener SSL {
```

#### Passo 2: Verificar Mapeamentos no Listener Default

```bash
# Ver mapeamentos do listener Default
awk '/^listener Default/,/^}/' /usr/local/lsws/conf/httpd_config.conf | grep 'map' | head -20
```

**Exemplo de Resultado**:
```
  map                     app.majoryachts.com.br app.majoryachts.com.br
  map                     b2b.fiberoficial.com.br b2b.fiberoficial.com.br
  map                     octo.fiberoficial.com.br octo.fiberoficial.com.br
```

#### Passo 3: Verificar Mapeamentos no Listener HTTP

```bash
# Ver mapeamentos do listener HTTP
awk '/^listener HTTP/,/^listener [^H]/' /usr/local/lsws/conf/httpd_config.conf | grep 'map' | head -20
```

**Se o seu domínio NÃO aparecer aqui, este é o problema!**

#### Passo 4: Adicionar Mapeamento no Listener HTTP

```bash
# Encontrar número da linha do listener HTTP
grep -n '^listener HTTP' /usr/local/lsws/conf/httpd_config.conf

# Resultado: 1428:listener HTTP {

# Adicionar mapeamento logo após a linha do listener (1428+1 = 1429)
sed -i '1429a\  map                     app.majoryachts.com.br app.majoryachts.com.br' /usr/local/lsws/conf/httpd_config.conf
```

**Sintaxe do Comando**:
- `1429a\` = Adiciona APÓS a linha 1429
- Dois espaços antes de `map` (indentação)
- `domínio domínio` (mesmo domínio repetido)

#### Passo 5: Verificar a Adição

```bash
# Confirmar que o mapeamento foi adicionado
grep -A 5 '^listener HTTP' /usr/local/lsws/conf/httpd_config.conf | head -10
```

**Deve mostrar**:
```
listener HTTP {
  map                     cadastrodje.com.br cadastrodje.com.br
  map                     app.majoryachts.com.br app.majoryachts.com.br
  map                     www.cadastrodje.com.br cadastrodje.com.br
```

#### Passo 6: (Opcional) Corrigir Regra de Reescrita no Listener Default

Se o listener Default tiver regra de reescrita incorreta:

```bash
# Verificar regra de reescrita no Default
awk '/listener Default/,/^}/' /usr/local/lsws/conf/httpd_config.conf | grep -A 5 'rewrite'
```

**Problema Comum**:
```
rewrite  {
    enable                  1
    RewriteCond %{HTTPS} !=on
    RewriteRule ^/?(.*) https://%{SERVER_NAME}/ [R=301,L]  # <-- Falta $1
}
```

Esta regra redireciona TUDO para a raiz do HTTPS, causando 404 em subpáginas.

**Solução A: Corrigir a Regra** (se você souber editar manualmente):
```
RewriteRule ^/?(.*) https://%{SERVER_NAME}/$1 [R=301,L]
```

**Solução B: Desabilitar Reescrita no Default** (recomendado se já há .htaccess):
```bash
# Desabilitar reescrita no listener Default
sed -i '/listener Default/,/^}/{ s/enable                  1/enable                  0/ }' /usr/local/lsws/conf/httpd_config.conf

# Verificar
awk '/listener Default/,/^}/' /usr/local/lsws/conf/httpd_config.conf | grep -A 5 'rewrite'
```

**Deve mostrar**:
```
rewrite  {
    enable                  0
    RewriteCond %{HTTPS} !=on
    RewriteRule ^/?(.*) https://%{SERVER_NAME}/ [R=301,L]
}
```

#### Passo 7: Reiniciar LiteSpeed

```bash
/usr/local/lsws/bin/lswsctrl restart
```

#### Passo 8: Testar HTTP

```bash
# Testar acesso HTTP
curl -I http://app.majoryachts.com.br
```

**Resultado Esperado**:
```
HTTP/1.1 301 Moved Permanently
location: https://app.majoryachts.com.br/
```

```bash
# Testar seguindo o redirect
curl -L -I http://app.majoryachts.com.br
```

**Resultado Esperado**:
```
HTTP/1.1 301 Moved Permanently
location: https://app.majoryachts.com.br/

HTTP/1.1 200 OK
content-type: text/html
content-length: 77328
```

#### Passo 9: Verificar no Navegador

Acesse: http://app.majoryachts.com.br

**Comportamento Esperado**:
1. Navegador acessa HTTP
2. Servidor responde com 301 redirect para HTTPS
3. Navegador acessa HTTPS automaticamente
4. Site carrega normalmente com certificado válido

---

## Checklist para Outros Sites

Use este checklist ao configurar SSL e corrigir 404 em outros sites no **CyberPanel/OpenLiteSpeed**:

### 📋 Checklist de SSL Let's Encrypt

- [ ] **1. Conectar ao servidor via SSH**
  ```bash
  ssh root@IP_DO_SERVIDOR
  ```

- [ ] **2. Verificar certificado atual**
  ```bash
  echo | openssl s_client -connect DOMINIO:443 -servername DOMINIO 2>/dev/null | openssl x509 -noout -issuer
  ```

- [ ] **3. Criar diretório .well-known**
  ```bash
  mkdir -p /home/DOMINIO/public_html/.well-known/acme-challenge
  ```

- [ ] **4. Verificar e anotar usuário do site**
  ```bash
  ls -la /home/DOMINIO/ | grep public_html
  # Anote o usuário (ex: appma9079)
  ```

- [ ] **5. Ajustar permissões do .well-known**
  ```bash
  chown -R USUARIO:USUARIO /home/DOMINIO/public_html/.well-known/
  chmod -R 755 /home/DOMINIO/public_html/.well-known/
  ```

- [ ] **6. Verificar context no vhost.conf**
  ```bash
  grep -A 3 'context /.well-known' /usr/local/lsws/conf/vhosts/DOMINIO/vhost.conf
  ```

- [ ] **7. Corrigir caminho do context se necessário**
  ```bash
  sed -i 's|location                /usr/local/lsws/Example/html/.well-known/acme-challenge|location                /home/DOMINIO/public_html/.well-known/acme-challenge|g' /usr/local/lsws/conf/vhosts/DOMINIO/vhost.conf
  ```

- [ ] **8. Verificar .htaccess e adicionar exceção para .well-known**
  ```bash
  nano /home/DOMINIO/public_html/.htaccess
  # Adicionar: RewriteCond %{REQUEST_URI} !^/\.well-known/acme-challenge/
  ```

- [ ] **9. Reiniciar LiteSpeed**
  ```bash
  /usr/local/lsws/bin/lswsctrl restart
  ```

- [ ] **10. Testar acesso ao .well-known**
  ```bash
  echo 'test' > /home/DOMINIO/public_html/.well-known/acme-challenge/test.txt
  curl http://DOMINIO/.well-known/acme-challenge/test.txt
  # Deve retornar: test
  ```

- [ ] **11. Parar LiteSpeed**
  ```bash
  /usr/local/lsws/bin/lswsctrl stop
  ```

- [ ] **12. Gerar certificado Let's Encrypt**
  ```bash
  certbot certonly --standalone -d DOMINIO --non-interactive --agree-tos --email EMAIL --force-renewal
  ```

- [ ] **13. Anotar caminho do certificado gerado**
  ```
  # Procure por: Certificate is saved at: /etc/letsencrypt/live/DOMINIO-XXXX/fullchain.pem
  ```

- [ ] **14. Atualizar vhost.conf com caminho correto dos certificados**
  ```bash
  nano /usr/local/lsws/conf/vhosts/DOMINIO/vhost.conf
  # Ajustar seção vhssl com o caminho correto
  ```

- [ ] **15. Iniciar LiteSpeed**
  ```bash
  /usr/local/lsws/bin/lswsctrl start
  ```

- [ ] **16. Verificar certificado no servidor**
  ```bash
  echo | openssl s_client -connect DOMINIO:443 -servername DOMINIO 2>/dev/null | openssl x509 -noout -issuer -dates
  # Issuer deve ser: O = Let's Encrypt
  ```

- [ ] **17. Testar no navegador**
  - Acessar: https://DOMINIO
  - Verificar cadeado verde
  - Não deve haver avisos de segurança

---

### 📋 Checklist de Correção 404 HTTP

- [ ] **1. Verificar se HTTPS funciona**
  ```bash
  curl -I https://DOMINIO
  # Deve retornar: HTTP/1.1 200 OK
  ```

- [ ] **2. Verificar se HTTP retorna 404**
  ```bash
  curl -I http://DOMINIO
  # Problema se retornar: HTTP/1.1 404 Not Found
  ```

- [ ] **3. Listar todos os listeners**
  ```bash
  grep -n '^listener' /usr/local/lsws/conf/httpd_config.conf
  ```

- [ ] **4. Verificar mapeamentos no listener Default**
  ```bash
  awk '/^listener Default/,/^}/' /usr/local/lsws/conf/httpd_config.conf | grep "map.*DOMINIO"
  ```

- [ ] **5. Verificar mapeamentos no listener HTTP**
  ```bash
  grep -A 200 '^listener HTTP' /usr/local/lsws/conf/httpd_config.conf | grep "map.*DOMINIO"
  ```

- [ ] **6. Se não encontrar no HTTP, adicionar mapeamento**
  ```bash
  # Encontrar linha do listener HTTP
  grep -n '^listener HTTP' /usr/local/lsws/conf/httpd_config.conf
  # Resultado: XXXX:listener HTTP {

  # Adicionar mapeamento (XXXX+1)
  sed -i 'XXXXa\  map                     DOMINIO DOMINIO' /usr/local/lsws/conf/httpd_config.conf
  ```

- [ ] **7. Verificar se foi adicionado**
  ```bash
  grep -A 5 '^listener HTTP' /usr/local/lsws/conf/httpd_config.conf | grep DOMINIO
  ```

- [ ] **8. (Opcional) Desabilitar reescrita no Default**
  ```bash
  sed -i '/listener Default/,/^}/{ s/enable                  1/enable                  0/ }' /usr/local/lsws/conf/httpd_config.conf
  ```

- [ ] **9. Reiniciar LiteSpeed**
  ```bash
  /usr/local/lsws/bin/lswsctrl restart
  ```

- [ ] **10. Testar HTTP**
  ```bash
  curl -I http://DOMINIO
  # Deve retornar: HTTP/1.1 301 Moved Permanently
  # location: https://DOMINIO/
  ```

- [ ] **11. Testar seguindo redirect**
  ```bash
  curl -L -I http://DOMINIO
  # Deve retornar 301 e depois 200 OK
  ```

- [ ] **12. Testar no navegador**
  - Acessar: http://DOMINIO
  - Deve redirecionar automaticamente para HTTPS
  - Site deve carregar normalmente

---

## Troubleshooting Comum

### Problema: Certbot Falha com "Failed to authenticate"

**Erro**:
```
Certbot failed to authenticate some domains (authenticator: webroot).
The Certificate Authority reported these problems:
  Domain: app.majoryachts.com.br
  Type: unauthorized
  Detail: 46.202.149.24: Invalid response from http://app.majoryachts.com.br/.well-known/acme-challenge/...: 404
```

**Causa**: Let's Encrypt não consegue acessar `.well-known/acme-challenge` via HTTP

**Solução**:
1. Verificar context no vhost.conf (Passo 3 do SSL)
2. Verificar permissões do diretório .well-known
3. Testar acesso manual ao .well-known
4. Se falhar, usar `certbot --standalone` parando o LiteSpeed

---

### Problema: Após Gerar Certificado, Site Ainda Mostra Certificado Antigo

**Causa**: vhost.conf aponta para caminho antigo dos certificados

**Solução**:
```bash
# Verificar caminho no vhost.conf
grep -A 5 'vhssl' /usr/local/lsws/conf/vhosts/DOMINIO/vhost.conf

# Verificar certificados disponíveis
ls -la /etc/letsencrypt/live/

# Atualizar vhost.conf com caminho correto
nano /usr/local/lsws/conf/vhosts/DOMINIO/vhost.conf

# Reiniciar
/usr/local/lsws/bin/lswsctrl restart
```

---

### Problema: HTTP 404 Persiste Após Adicionar Mapeamento

**Causa 1**: Regra de reescrita incorreta no listener Default

**Solução**:
```bash
# Desabilitar reescrita no Default
sed -i '/listener Default/,/^}/{ s/enable                  1/enable                  0/ }' /usr/local/lsws/conf/httpd_config.conf

/usr/local/lsws/bin/lswsctrl restart
```

**Causa 2**: Mapeamento foi adicionado no listener errado

**Solução**:
```bash
# Verificar QUAL listener está na porta 80
awk '/address.*\*:80/,/^listener/ {print}' /usr/local/lsws/conf/httpd_config.conf | grep -B 50 'address.*\*:80' | grep 'listener'

# Adicionar mapeamento no listener correto
```

**Causa 3**: .htaccess com regras problemáticas

**Solução**:
```bash
# Desabilitar temporariamente .htaccess
mv /home/DOMINIO/public_html/.htaccess /home/DOMINIO/public_html/.htaccess.disabled

# Reiniciar e testar
/usr/local/lsws/bin/lswsctrl restart
curl -I http://DOMINIO

# Se funcionar, o problema está no .htaccess
# Revisar e corrigir o .htaccess
```

---

### Problema: Site Funciona em HTTP mas Não em HTTPS

**Causa**: Certificados não configurados corretamente no vhost.conf

**Solução**:
```bash
# Verificar seção vhssl no vhost.conf
cat /usr/local/lsws/conf/vhosts/DOMINIO/vhost.conf | grep -A 10 'vhssl'

# Deve ter:
vhssl  {
  keyFile                 /etc/letsencrypt/live/DOMINIO/privkey.pem
  certFile                /etc/letsencrypt/live/DOMINIO/fullchain.pem
  certChain               1
}

# Verificar se os arquivos existem
ls -la /etc/letsencrypt/live/DOMINIO/

# Corrigir caminhos se necessário
nano /usr/local/lsws/conf/vhosts/DOMINIO/vhost.conf

# Reiniciar
/usr/local/lsws/bin/lswsctrl restart
```

---

### Problema: Permissões Negadas ao Acessar .well-known

**Sintoma**: curl retorna 403 Forbidden

**Solução**:
```bash
# Verificar permissões
ls -la /home/DOMINIO/public_html/.well-known/
ls -la /home/DOMINIO/public_html/.well-known/acme-challenge/

# Corrigir ownership (substitua USUARIO)
chown -R USUARIO:USUARIO /home/DOMINIO/public_html/.well-known/

# Corrigir permissões
chmod 755 /home/DOMINIO/public_html/.well-known/
chmod 755 /home/DOMINIO/public_html/.well-known/acme-challenge/
chmod 644 /home/DOMINIO/public_html/.well-known/acme-challenge/*

# Testar
curl http://DOMINIO/.well-known/acme-challenge/test.txt
```

---

## Comandos Úteis

### Gerenciamento do LiteSpeed

```bash
# Status do LiteSpeed
/usr/local/lsws/bin/lswsctrl status

# Iniciar LiteSpeed
/usr/local/lsws/bin/lswsctrl start

# Parar LiteSpeed
/usr/local/lsws/bin/lswsctrl stop

# Reiniciar LiteSpeed (graceful restart)
/usr/local/lsws/bin/lswsctrl restart

# Reiniciar forçado
/usr/local/lsws/bin/lswsctrl stop
/usr/local/lsws/bin/lswsctrl start

# Ver processos do LiteSpeed
ps aux | grep litespeed

# Ver portas em uso
netstat -tlnp | grep ':80\|:443'
```

---

### Verificação de SSL/Certificados

```bash
# Verificar certificado de um site
echo | openssl s_client -connect DOMINIO:443 -servername DOMINIO 2>/dev/null | openssl x509 -noout -issuer -subject -dates

# Verificar apenas o issuer
echo | openssl s_client -connect DOMINIO:443 -servername DOMINIO 2>/dev/null | openssl x509 -noout -issuer

# Verificar certificados Let's Encrypt disponíveis
ls -la /etc/letsencrypt/live/

# Ver detalhes de um certificado
openssl x509 -in /etc/letsencrypt/live/DOMINIO/fullchain.pem -text -noout

# Verificar validade do certificado
openssl x509 -in /etc/letsencrypt/live/DOMINIO/fullchain.pem -noout -dates
```

---

### Testes HTTP/HTTPS

```bash
# Testar HTTP (sem seguir redirects)
curl -I http://DOMINIO

# Testar HTTP seguindo redirects
curl -L -I http://DOMINIO

# Testar HTTPS
curl -I https://DOMINIO

# Testar ignorando certificado SSL (para debug)
curl -k -I https://DOMINIO

# Testar com verbose (mostra toda a comunicação)
curl -v http://DOMINIO

# Testar acesso local com Host header
curl -H "Host: DOMINIO" http://localhost/

# Testar velocidade de resposta
time curl -I https://DOMINIO
```

---

### Gerenciamento Certbot/Let's Encrypt

```bash
# Listar certificados instalados
certbot certificates

# Gerar novo certificado (standalone)
certbot certonly --standalone -d DOMINIO --email EMAIL --agree-tos --non-interactive

# Gerar certificado (webroot)
certbot certonly --webroot -w /home/DOMINIO/public_html -d DOMINIO --email EMAIL --agree-tos --non-interactive

# Renovar certificado específico
certbot renew --cert-name DOMINIO

# Renovar todos os certificados
certbot renew

# Renovar com force (mesmo que não esteja expirando)
certbot renew --force-renewal

# Deletar certificado
certbot delete --cert-name DOMINIO

# Ver logs do certbot
tail -f /var/log/letsencrypt/letsencrypt.log

# Testar renovação (dry-run)
certbot renew --dry-run
```

---

### Análise de Configuração LiteSpeed

```bash
# Listar todos os virtual hosts
grep -r 'vhDomain' /usr/local/lsws/conf/vhosts/*/vhost.conf

# Listar todos os listeners
grep -n '^listener' /usr/local/lsws/conf/httpd_config.conf

# Ver mapeamentos de um listener específico
awk '/^listener NOME/,/^}/' /usr/local/lsws/conf/httpd_config.conf | grep 'map'

# Encontrar configuração de um domínio específico
grep -r 'DOMINIO' /usr/local/lsws/conf/

# Ver docRoot de um vhost
grep 'docRoot' /usr/local/lsws/conf/vhosts/DOMINIO/vhost.conf

# Ver configuração SSL de um vhost
grep -A 10 'vhssl' /usr/local/lsws/conf/vhosts/DOMINIO/vhost.conf

# Backup da configuração principal
cp /usr/local/lsws/conf/httpd_config.conf /usr/local/lsws/conf/httpd_config.conf.backup.$(date +%Y%m%d_%H%M%S)

# Backup de um vhost
cp /usr/local/lsws/conf/vhosts/DOMINIO/vhost.conf /usr/local/lsws/conf/vhosts/DOMINIO/vhost.conf.backup.$(date +%Y%m%d_%H%M%S)
```

---

### Logs do LiteSpeed

```bash
# Ver logs de erro de um site
tail -f /home/DOMINIO/logs/DOMINIO.error_log

# Ver logs de acesso de um site
tail -f /home/DOMINIO/logs/DOMINIO.access_log

# Ver últimas 100 linhas do log de erro
tail -100 /home/DOMINIO/logs/DOMINIO.error_log

# Buscar erros específicos
grep '404' /home/DOMINIO/logs/DOMINIO.access_log | tail -20
grep 'error' /home/DOMINIO/logs/DOMINIO.error_log | tail -20

# Logs do LiteSpeed global
tail -f /usr/local/lsws/logs/error.log
```

---

## Resumo Rápido

### SSL Let's Encrypt em 5 Comandos

```bash
# 1. Criar e configurar .well-known
mkdir -p /home/DOMINIO/public_html/.well-known/acme-challenge
chown -R USUARIO:USUARIO /home/DOMINIO/public_html/.well-known/
chmod -R 755 /home/DOMINIO/public_html/.well-known/

# 2. Corrigir context no vhost.conf
sed -i 's|location                /usr/local/lsws/Example/html/.well-known/acme-challenge|location                /home/DOMINIO/public_html/.well-known/acme-challenge|g' /usr/local/lsws/conf/vhosts/DOMINIO/vhost.conf

# 3. Parar LiteSpeed
/usr/local/lsws/bin/lswsctrl stop

# 4. Gerar certificado
certbot certonly --standalone -d DOMINIO --email EMAIL --agree-tos --non-interactive --force-renewal

# 5. Atualizar vhost.conf (se necessário) e iniciar
# Editar manualmente: nano /usr/local/lsws/conf/vhosts/DOMINIO/vhost.conf
# Ajustar caminhos dos certificados na seção vhssl
/usr/local/lsws/bin/lswsctrl start
```

---

### Correção 404 HTTP em 3 Comandos

```bash
# 1. Adicionar mapeamento no listener HTTP
# Primeiro encontre a linha: grep -n '^listener HTTP' /usr/local/lsws/conf/httpd_config.conf
# Resultado exemplo: 1428:listener HTTP {
# Adicione após a linha (1428+1=1429):
sed -i '1429a\  map                     DOMINIO DOMINIO' /usr/local/lsws/conf/httpd_config.conf

# 2. (Opcional) Desabilitar reescrita no Default
sed -i '/listener Default/,/^}/{ s/enable                  1/enable                  0/ }' /usr/local/lsws/conf/httpd_config.conf

# 3. Reiniciar LiteSpeed
/usr/local/lsws/bin/lswsctrl restart
```

---

## Notas Importantes

### Renovação Automática

- Let's Encrypt gera certificados válidos por **90 dias**
- Certbot configura automaticamente renovação via **cron** ou **systemd timer**
- Certificados são renovados automaticamente **30 dias antes** de expirar
- Verificar renovação automática: `systemctl status certbot.timer` ou `crontab -l`

### Segurança

- **NUNCA** exponha `/etc/letsencrypt/` publicamente
- Mantenha permissões restritas nos arquivos de configuração do LiteSpeed
- Use sempre HTTPS em produção
- Configure HSTS (HTTP Strict Transport Security) no .htaccess:
  ```apache
  Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
  ```

### Backup

Antes de fazer alterações importantes:

```bash
# Backup da configuração principal
cp /usr/local/lsws/conf/httpd_config.conf /usr/local/lsws/conf/httpd_config.conf.backup

# Backup de vhost
cp /usr/local/lsws/conf/vhosts/DOMINIO/vhost.conf /usr/local/lsws/conf/vhosts/DOMINIO/vhost.conf.backup

# Backup de .htaccess
cp /home/DOMINIO/public_html/.htaccess /home/DOMINIO/public_html/.htaccess.backup
```

---

## Referências

- **CyberPanel**: https://cyberpanel.net/
- **CyberPanel Documentation**: https://docs.cyberpanel.net/
- **CyberPanel Community**: https://community.cyberpanel.net/
- **Let's Encrypt**: https://letsencrypt.org/
- **Certbot**: https://certbot.eff.org/
- **OpenLiteSpeed Documentation**: https://openlitespeed.org/kb/
- **SSL Labs (Teste SSL)**: https://www.ssllabs.com/ssltest/
- **HTTP Status Codes**: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status

---

**Documento Criado**: 2025-10-24
**Última Atualização**: 2025-12-22
**Versão**: 1.1.0
**Autor**: Claude Code - Agente Autônomo
**Plataforma**: CyberPanel + OpenLiteSpeed

---

## Suporte

Em caso de dúvidas ou problemas não cobertos neste guia:

1. Verifique os logs do LiteSpeed: `/home/DOMINIO/logs/DOMINIO.error_log`
2. Verifique os logs do Certbot: `/var/log/letsencrypt/letsencrypt.log`
3. Teste o certificado: https://www.ssllabs.com/ssltest/
4. Consulte a documentação oficial do OpenLiteSpeed

---

---

## Lições Aprendidas (Auto-gerado por /aprender)

> Seção atualizada automaticamente. Consultar ANTES de executar tarefas relacionadas.

### 2026-03-12 - .htaccess com regex `^\.` bloqueia .well-known e quebra ACME challenge
**Contexto:** Site copiado de outro projeto tinha .htaccess com regra `<FilesMatch "^\.">`que bloqueava TODOS os arquivos/diretórios ocultos.
**Erro:** O challenge ACME retornava 404 mesmo com o context do OLS configurado corretamente, pois o .htaccess bloqueava o acesso ao `.well-known`.
**Solução:** Usar regex negativa no .htaccess para excluir `.well-known`: `<FilesMatch "^\.(?!well-known)">`.
**Regra:** SEMPRE verificar se o .htaccess tem regra `^\.` e adicionar a exceção `(?!well-known)` ANTES de tentar emitir SSL.

---

### 2026-03-12 - Let's Encrypt rate limit de validações falhas — usar acme.sh com ZeroSSL
**Contexto:** Múltiplas tentativas falhas esgotaram o limite de 5 validações/hora do Let's Encrypt.
**Erro:** `certbot` retornava "You've hit your limit" após várias tentativas com configuração incorreta.
**Solução:** Usar `acme.sh` com ZeroSSL: `~/.acme.sh/acme.sh --issue -d DOMINIO -d www.DOMINIO --standalone --server zerossl --email EMAIL --force`. Depois copiar certs: `cp fullchain.cer → /etc/letsencrypt/live/DOMINIO/fullchain.pem` e `cp DOMINIO.key → privkey.pem`.
**Regra:** Quando Let's Encrypt der rate limit, IMEDIATAMENTE trocar para `acme.sh --server zerossl`. Não insistir no certbot.

---

### 2026-03-12 - LiteSpeed watchdog reinicia automaticamente e impede certbot --standalone
**Contexto:** Tentativa de usar `certbot --standalone` que precisa da porta 80 livre.
**Erro:** Mesmo após `lswsctrl stop`, `fuser -k 80/tcp` e `killall -9 litespeed`, o processo reiniciava via watchdog em segundos.
**Solução:** `systemctl disable lsws && systemctl stop lsws && killall -9 litespeed lshttpd && sleep 3`. Reabilitar depois: `systemctl enable lsws && lswsctrl start`.
**Regra:** Para liberar porta 80 permanentemente no CyberPanel, usar `systemctl disable/stop lsws` + `killall -9`. Nunca apenas `lswsctrl stop` — o watchdog reinicia.

---

### 2026-03-12 - rsync sem chown deixa arquivos com owner errado impedindo OLS de servir
**Contexto:** Cópia de site com `rsync -av` entre domínios sem especificar o owner correto.
**Erro:** Arquivos ficaram com owner do site de origem, mas OLS do novo site roda como usuário diferente — retornava 404 para arquivos estáticos.
**Solução:** Após rsync: `chown -R USUARIO_NOVO:USUARIO_NOVO /home/DOMINIO/public_html`. O usuário do site pode ser obtido com `ls -la /home/DOMINIO/ | grep public_html`.
**Regra:** SEMPRE rodar `chown -R` no public_html após copiar arquivos entre domínios no CyberPanel.

---

### 2026-03-12 - cyberpanel issueSSL emite certificado autoassinado se DNS não propagou
**Contexto:** `cyberpanel issueSSL` chamado logo após criar o site, antes do DNS apontar para o servidor.
**Erro:** Retornou `success: 1` mas criou certificado autoassinado (issuer = próprio domínio), causando `ERR_CERT_AUTHORITY_INVALID`.
**Solução:** Verificar DNS antes: `dig +short DOMINIO A`. Se retornar o IP correto, só então emitir SSL.
**Regra:** NUNCA chamar `issueSSL` antes de confirmar que `dig +short DOMINIO A` = IP do servidor.

**FIM DO DOCUMENTO**
