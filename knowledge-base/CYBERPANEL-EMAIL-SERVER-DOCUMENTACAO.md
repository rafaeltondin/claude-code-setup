---
title: "Servidor de Email CyberPanel - Documentação Completa"
category: "Infraestrutura"
tags:
  - email server
  - cyberpanel
  - postfix
  - dovecot
  - opendkim
  - opendmarc
  - spamassassin
  - roundcube
  - webmail
  - smtp
  - imap
  - dkim
  - spf
  - dmarc
  - anti-spam
  - fail2ban
  - email-setup
  - hostinger
topic: "Servidor de Email CyberPanel"
priority: high
version: "1.1.0"
last_updated: "2026-02-25"
---

# Servidor de Email CyberPanel - Documentação Completa

Servidor de email profissional configurado no CyberPanel (Hostinger VPS), com Postfix, Dovecot, OpenDKIM, OpenDMARC, SpamAssassin, Fail2Ban e Roundcube Webmail.

---

## Informações de Acesso Rápido

| Item | Valor |
|------|-------|
| **IP do Servidor** | `46.202.149.24` |
| **Hostname** | `mail.srv410981.hstgr.cloud` |
| **Sistema** | Ubuntu 22.04 LTS |
| **Painel** | CyberPanel 2.4 |
| **Webmail** | `https://webmail.rafaeltondin.com.br` |
| **Script CLI** | `email-setup` (em `/usr/local/bin/`) |
| **Provedor** | Hostinger (hstgr.cloud) |

---

## Stack Técnica

### Serviços de Email

| Serviço | Função | Porta | Status |
|---------|--------|-------|--------|
| **Postfix** | MTA (envio/recebimento) | 25, 465, 587 | Ativo (IPv4 only) |
| **Dovecot** | IMAP/POP3 + LMTP + Sieve | 143, 993, 110, 4190 | Ativo |
| **OpenDKIM** | Assinatura DKIM | 8891 (milter) | Ativo |
| **OpenDMARC** | Verificação DMARC | 8893 (milter) | Ativo |
| **SpamAssassin** | Filtro anti-spam | 783 (local) | Ativo |
| **Fail2Ban** | Proteção brute-force | - | Ativo (4 jails) |

### Webmail

| Componente | Versão/Info |
|------------|-------------|
| **Roundcube** | 1.6.9 |
| **URL** | https://webmail.rafaeltondin.com.br |
| **Skin** | Elastic (responsivo) |
| **Idioma** | PT-BR |
| **SSL** | Let's Encrypt |

---

## Script email-setup (CLI)

O script `/usr/local/bin/email-setup` automatiza toda a gestão de email.

### Comandos Disponíveis

```bash
# Adicionar domínio (cria DKIM, mostra DNS necessário)
email-setup add-domain empresa.com.br

# Criar conta de email
email-setup add-account contato@empresa.com.br MinhaSenha123

# Alterar senha
email-setup change-password contato@empresa.com.br NovaSenha456

# Deletar conta
email-setup delete-account contato@empresa.com.br

# Listar domínios
email-setup list-domains

# Listar contas (todas ou por domínio)
email-setup list-accounts
email-setup list-accounts empresa.com.br

# Mostrar DNS necessário (copiar/colar)
email-setup show-dns empresa.com.br

# Verificar se DNS está propagado
email-setup check-dns empresa.com.br

# Status de todos os serviços
email-setup status
```

### Fluxo para Novo Domínio

1. `email-setup add-domain empresa.com.br` → gera DKIM + mostra DNS
2. Configurar DNS no painel do domínio (5 registros mostrados)
3. Aguardar propagação (até 48h)
4. `email-setup check-dns empresa.com.br` → verificar
5. `email-setup add-account contato@empresa.com.br Senha123` → criar conta
6. Acessar via https://webmail.rafaeltondin.com.br

---

## Configuração DNS (Para Cada Domínio)

Ao rodar `email-setup add-domain`, o script mostra os 5 registros necessários:

| # | Tipo | Host | Valor |
|---|------|------|-------|
| 1 | A | mail | 46.202.149.24 |
| 2 | MX | @ | mail.DOMINIO (Prioridade: 10) |
| 3 | TXT | @ | v=spf1 mx a ip4:46.202.149.24 ~all |
| 4 | TXT | default._domainkey | (chave DKIM gerada automaticamente) |
| 5 | TXT | _dmarc | v=DMARC1; p=quarantine; rua=mailto:dmarc@DOMINIO |

---

## Configuração de Cliente de Email

| Configuração | Valor |
|-------------|-------|
| **Servidor IMAP** | mail.DOMINIO |
| **Porta IMAP** | 993 (SSL/TLS) |
| **Servidor SMTP** | mail.DOMINIO |
| **Porta SMTP** | 465 (SSL/TLS) |
| **Usuário** | email completo (ex: contato@empresa.com.br) |
| **Autenticação** | Login/Plain |

---

## Arquivos de Configuração

| Arquivo | Descrição |
|---------|-----------|
| `/etc/postfix/main.cf` | Config principal Postfix |
| `/etc/postfix/master.cf` | Config de serviços Postfix |
| `/etc/postfix/vmail_ssl.map` | Mapa SSL por domínio |
| `/etc/postfix/header_checks` | Limpeza de headers |
| `/etc/postfix/mysql-virtual_*.cf` | Maps MySQL (domínios, mailboxes, forwardings) |
| `/etc/dovecot/dovecot.conf` | Config principal Dovecot |
| `/etc/dovecot/sni.conf` | SSL SNI per-domain |
| `/etc/dovecot/dovecot-sql.conf.ext` | Config SQL Dovecot |
| `/etc/dovecot/sieve-before.d/` | Filtros Sieve globais |
| `/etc/opendkim.conf` | Config OpenDKIM |
| `/etc/opendkim/KeyTable` | Tabela de chaves DKIM |
| `/etc/opendkim/SigningTable` | Tabela de assinatura DKIM |
| `/etc/opendkim/keys/DOMINIO/` | Chaves DKIM por domínio |
| `/etc/opendmarc.conf` | Config OpenDMARC |
| `/etc/spamassassin/local.cf` | Config SpamAssassin |
| `/etc/fail2ban/jail.d/email.conf` | Jails Fail2Ban |
| `/usr/local/bin/email-setup` | Script de automação |

### Banco de Dados

- **Banco**: `cyberpanel`
- **Tabelas**: `e_domains`, `e_users`, `e_forwardings`
- **Webmail DB**: `roundcube_webmail`

---

## Segurança e Anti-Spam Implementados

### Postfix (Deliverability + Anti-Spam)

**Autenticação e Restrições:**
- HELO required + validação FQDN
- SASL auth apenas via TLS
- Rejeição de sender/recipient inválidos
- Verificação SPF (policyd-spf)
- disable_vrfy_command = yes

**Milters (3 camadas):**
- OpenDKIM (porta 8891) - assinatura + verificação DKIM
- OpenDMARC (porta 8893) - verificação DMARC
- spamass-milter (socket) - SpamAssassin outbound (rejeita score >= 8)

**TLS/Criptografia:**
- TLS 1.2+ obrigatório (inbound e outbound)
- DANE para TLS outbound (fallback: may)
- DNSSEC habilitado
- Ciphers modernos (TLS_AES_256_GCM_SHA384)

**Anti-Spam Outbound (protege reputação):**
- SpamAssassin filtra emails SAINDO (score >= 8 = rejeita)
- Rate limiting por destino (1s delay, max 2 conexões simultâneas)
- Max 10 recipients por mensagem
- Bounce queue lifetime: 1 dia (evita retries excessivos)
- Double bounce → /dev/null

**Postscreen (proteção inbound porta 25):**
- DNS blocklists: zen.spamhaus.org, bl.spamcop.net, b.barracudacentral.org, dnsbl.sorbs.net
- Threshold: 2 (precisa estar em 2+ listas para drop)
- Pre-greeting test (3s wait)
- Bare newline, pipelining, non-smtp command enforcement

**Outros:**
- Banner minimalista (sem revelar software)
- Header cleanup (remove X-Originating-IP, X-Mailer, User-Agent)
- Bloqueio de anexos perigosos (.exe, .bat, .js, etc.)
- Connection reuse otimizado (300s)
- IPv4 only (inet_protocols = ipv4)
- HELO name = mail.srv410981.hstgr.cloud (match PTR)

### Dovecot

- SSL/TLS 1.2+ obrigatório
- SNI per-domain (150+ domínios)
- Quota (1GB default + 100M Trash/Spam)
- Sieve filters (spam → Junk automaticamente)
- Compressão zlib (economia de disco)

### Fail2Ban

| Jail | Proteção | MaxRetry | BanTime |
|------|----------|----------|---------|
| postfix | SMTP geral | 5 | 1h |
| postfix-sasl | Auth SMTP | 3 | 2h |
| dovecot | Auth IMAP/POP3 | 5 | 1h |
| sshd | SSH | 5 | default |

### SpamAssassin

- Score threshold: 5.0 (inbound marca como spam)
- Score >= 8.0 (outbound rejeita envio)
- Bayes auto-learn habilitado
- DNS blocklists ativas
- spamass-milter integrado ao Postfix

### MTA-STS (Transport Security)

- Arquivo: `https://rafaeltondin.com.br/.well-known/mta-sts.txt`
- Modo: testing (mudar para enforce após validação)
- DNS necessário no Cloudflare:
  - TXT `_mta-sts` → `v=STSv1; id=20260225`
  - TXT `_smtp._tls` → `v=TLSRPTv1; rua=mailto:tls-reports@rafaeltondin.com.br`

### Blacklist Status (2026-02-25)

IP `46.202.149.24` **LIMPO** em todas as listas verificadas:
zen.spamhaus.org, bl.spamcop.net, b.barracudacentral.org, dnsbl.sorbs.net, bl.mailspike.net, psbl.surriel.com, dnsbl-1.uceprotect.net

### Monitoramento Recomendado

- **Google Postmaster Tools**: https://postmaster.google.com/ (adicionar rafaeltondin.com.br)
- **MXToolbox**: https://mxtoolbox.com/blacklists.aspx (verificar IP periodicamente)

---

## Domínios e Contas Atuais

### Domínios

| Domínio | Data |
|---------|------|
| crm.limemarketing.com.br | Ativo |
| diegobroch.com.br | Ativo |
| limemarketing.com.br | Ativo |
| mailer.limemarketing.com.br | Ativo |
| pedrobacchinutricionista.com.br | Ativo |
| srv410981.hstgr.cloud | Ativo |
| wp.limemarketing.com.br | Ativo |

### Contas

| Email | Domínio |
|-------|---------|
| contato@diegobroch.com.br | diegobroch.com.br |
| contato@limemarketing.com.br | limemarketing.com.br |
| contato@pedrobacchinutricionista.com.br | pedrobacchinutricionista.com.br |
| contato@rafaeltondin.com.br | rafaeltondin.com.br |

---

## Troubleshooting

### Email não enviado (bounced)

```bash
# Ver fila
postqueue -p

# Ver logs
tail -50 /var/log/mail.log | grep "bounced\|reject\|error"

# Forçar reenvio da fila
postqueue -f
```

### Erro de autenticação

```bash
# Testar auth Dovecot
doveadm auth test usuario@dominio.com.br senha

# Ver log
tail -20 /var/log/mail.log | grep "auth"
```

### DKIM não assina

```bash
# Verificar chave
ls -la /etc/opendkim/keys/DOMINIO/default.private

# Verificar KeyTable
grep DOMINIO /etc/opendkim/KeyTable

# Verificar SigningTable
grep DOMINIO /etc/opendkim/SigningTable

# Reiniciar
systemctl restart opendkim
```

### Email cai no spam

1. Verificar PTR/rDNS: `dig -x 46.202.149.24 +short`
2. Verificar SPF: `email-setup check-dns DOMINIO`
3. Verificar DKIM: headers do email (DKIM-Signature)
4. Verificar DMARC: headers do email
5. Testar reputação: https://mxtoolbox.com/blacklists.aspx

### Serviço parou

```bash
# Status geral
email-setup status

# Reiniciar tudo
systemctl restart postfix dovecot opendkim spamassassin

# Ver logs detalhados
journalctl -u postfix --no-pager -n 50
journalctl -u dovecot --no-pager -n 50
```

---

## PTR/rDNS ✅ CONFIGURADO

**PTR configurado em 2026-02-25** via painel Hostinger → VPS → Configurações → Endereço IP → Definir registro PTR.

| Item | Valor |
|------|-------|
| **IP** | `46.202.149.24` |
| **PTR** | `mail.srv410981.hstgr.cloud` |
| **Verificação** | `dig -x 46.202.149.24 +short` → `mail.srv410981.hstgr.cloud.` |

---

## AÇÃO PENDENTE: DNS dos Domínios no Registro.br

Os domínios usam nameservers do Registro.br (não o PowerDNS do CyberPanel). Para o email funcionar, os registros DNS devem ser atualizados **no painel do registrar** (Registro.br ou Hostinger DNS).

### Status Atual dos DNS

| Domínio | SPF | DKIM | DMARC | MX | Status |
|---------|-----|------|-------|----|--------|
| diegobroch.com.br | Aponta para Hostinger | Chave Hostinger | p=none | mx1/mx2.hostinger.com | DNS ERRADO |
| limemarketing.com.br | -all (bloqueia tudo) | Ausente | p=reject | Null MX (0 .) | DNS ERRADO |
| pedrobacchinutricionista.com.br | Ausente | Ausente | Ausente | Ausente | DNS AUSENTE |

### DNS Correto para Cada Domínio

Para cada domínio, configurar no Registro.br:

| # | Tipo | Host | Valor |
|---|------|------|-------|
| 1 | A | mail | 46.202.149.24 |
| 2 | MX | @ | mail.DOMINIO (Prioridade: 10) |
| 3 | TXT | @ | v=spf1 mx a ip4:46.202.149.24 ~all |
| 4 | TXT | default._domainkey | (usar `email-setup show-dns DOMINIO` para obter chave) |
| 5 | TXT | _dmarc | v=DMARC1; p=quarantine; rua=mailto:dmarc@DOMINIO |

**Comando rápido:** `email-setup show-dns DOMINIO` gera todos os registros prontos para copiar/colar.

---

## Backups

### Backup dos Emails

```bash
tar -czvf /root/backup_vmail_$(date +%Y%m%d).tar.gz /home/vmail/
```

### Backup das Configurações

```bash
tar -czvf /root/backup_email_config_$(date +%Y%m%d).tar.gz \
  /etc/postfix/ /etc/dovecot/ /etc/opendkim/ /etc/opendmarc.conf \
  /etc/spamassassin/ /etc/fail2ban/jail.d/email.conf \
  /usr/local/bin/email-setup
```

### Backup do Banco

```bash
mysqldump cyberpanel e_domains e_users e_forwardings > /root/backup_email_db_$(date +%Y%m%d).sql
```

---

## Comparação com Modoboa (75.119.144.13)

| Feature | CyberPanel (Hostinger) | Modoboa (Contabo) |
|---------|----------------------|-------------------|
| **IP** | 46.202.149.24 | 75.119.144.13 |
| **MTA** | Postfix | Postfix |
| **IMAP** | Dovecot | Dovecot |
| **DKIM** | OpenDKIM | OpenDKIM |
| **DMARC** | OpenDMARC | N/A |
| **Anti-spam** | SpamAssassin | Amavis + ClamAV |
| **Webmail** | Roundcube | Modoboa (Django) |
| **Gerenciamento** | email-setup CLI + CyberPanel | Django shell + MySQL |
| **PTR** | Configurado ✅ | Configurado |
| **Porta 25** | Aberta | Aberta |

---

## Validação do Servidor (2026-02-25)

### Resultados

| Componente | Status | Detalhes |
|-----------|--------|----------|
| Postfix | ✅ Ativo | Portas 25, 465, 587 |
| Dovecot | ✅ Ativo | Portas 143, 993, 110 |
| OpenDKIM | ✅ Ativo | Porta 8891, assina corretamente |
| OpenDMARC | ✅ Ativo | Porta 8893, PID fix aplicado |
| SpamAssassin | ✅ Ativo | Bayes auto-learn |
| Fail2Ban | ✅ Ativo | 4 jails (postfix, postfix-sasl, dovecot, sshd) |
| PTR/rDNS | ✅ Propagado | mail.srv410981.hstgr.cloud |
| Webmail | ✅ Funcionando | https://webmail.rafaeltondin.com.br |
| email-setup | ✅ Funcionando | Todos os comandos testados |
| DNS Domínios | ⚠️ Pendente | Registros precisam ser atualizados no Registro.br |
| Envio Gmail | ✅ Funcionando | rafaeltondin.com.br entregue com sucesso (dsn=2.0.0) |
| IPv4 Only | ✅ | inet_protocols=ipv4 (IPv6 sem PTR causa rejeicao) |

### Problema Atual

O servidor assina corretamente com DKIM e está 100% configurado. Porém, os registros DNS dos domínios no Registro.br apontam para o serviço de email compartilhado da Hostinger (mx1/mx2.hostinger.com), não para nosso servidor. Após atualizar os DNS, o envio para Gmail será aprovado.

---

---

## Lições Aprendidas (Auto-gerado por /aprender)

> Seção atualizada automaticamente. Consultar ANTES de executar tarefas relacionadas.

### 2026-03-24 - Webmail secundário (SnappyMail) não inicializa no CyberPanel
**Contexto:** webmail.edermatic.com.br mostrava "Falha na conexão com o servidor" no SnappyMail
**Erro:** O CyberPanel instala SnappyMail por padrão nos vhosts de webmail, mas o diretório `data/` nunca inicializou (suExec uid 65534 = nobody). Sem nenhuma configuração de domínio IMAP, o SnappyMail não consegue conectar.
**Solução:** Redirecionar webmails secundários para o Roundcube principal (webmail.rafaeltondin.com.br) via PHP redirect: `<?php header("Location: https://webmail.rafaeltondin.com.br/"); exit; ?>` no index.php
**Regra:** Webmails de domínios secundários no CyberPanel usam SnappyMail quebrado. SEMPRE redirecionar para o Roundcube principal via PHP redirect (não .htaccess).

### 2026-03-24 - .htaccess RewriteRule não funciona no OpenLiteSpeed
**Contexto:** Tentativa de redirect 301 via .htaccess com RewriteEngine/RewriteRule no webmail.edermatic.com.br
**Erro:** OLS retornou 200 (serviu o conteúdo normalmente) em vez de 301. O .htaccess com mod_rewrite não é processado pelo OLS da mesma forma que Apache.
**Solução:** Usar PHP redirect (`header("Location: URL", true, 301); exit;`) em vez de .htaccess RewriteRule.
**Regra:** NUNCA confiar em .htaccess RewriteRule no OpenLiteSpeed. Para redirects, usar PHP header() ou configurar no vhost.conf do OLS.

### 2026-03-24 - Watchdog automático para webmail multi-domínio
**Contexto:** Webmail parava de funcionar sem causa aparente (SnappyMail sem config, serviços caídos, redirect perdido)
**Solução:** Criar `/usr/local/bin/webmail-watchdog.sh` com cron a cada 5 minutos que: (1) reinicia Dovecot/Postfix se pararem, (2) verifica portas IMAP/SMTP, (3) testa se Roundcube responde, (4) recria redirect PHP em webmails secundários automaticamente.
**Regra:** Sempre instalar watchdog ao configurar webmail multi-domínio. Script em `/usr/local/bin/webmail-watchdog.sh`, log em `/var/log/webmail-watchdog.log`.

### 2026-03-24 - Senhas de email podem ser resetadas via doveadm pw + SQLite
**Contexto:** Senha fornecida pelo usuário não batia com o hash no banco do CyberPanel
**Solução:** `doveadm pw -s CRYPT -p 'NOVA_SENHA'` gera o hash → `UPDATE e_users SET password='HASH' WHERE email='X'` no SQLite `/usr/local/CyberCP/emailAccounts.db`
**Regra:** Para resetar senha de email no CyberPanel: gerar hash com `doveadm pw -s CRYPT` e atualizar via `sqlite3 /usr/local/CyberCP/emailAccounts.db`.

---

**Documento criado:** 2026-02-25
**Última atualização:** 2026-03-24
**Versão:** 1.3.0
