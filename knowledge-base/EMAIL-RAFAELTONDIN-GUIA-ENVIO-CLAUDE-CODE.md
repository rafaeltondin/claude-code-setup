---
title: "Email CyberPanel - Guia Completo de Envio e Configuracao"
category: "Automacao"
tags:
  - email
  - envio email
  - smtp
  - imap
  - cyberpanel
  - rafael tondin
  - rafaeltondin
  - contato email
  - sendmail
  - nodemailer
  - padrao escrita
  - email profissional
  - servidor email
  - email-setup
  - novo dominio
  - nova conta
  - dns email
  - webmail
  - roundcube
topic: "Envio de Email e Configuracao via Claude Code"
priority: high
version: "2.0.0"
last_updated: "2026-02-25"
---

# Email CyberPanel - Guia Completo de Envio e Configuracao

Guia para enviar emails e configurar novos dominios/contas no servidor CyberPanel (46.202.149.24). Substitui o antigo servidor Modoboa.

---

## Acesso Rapido

| Campo | Valor |
|-------|-------|
| **Servidor** | `46.202.149.24` (CyberPanel) |
| **Hostname** | `mail.srv410981.hstgr.cloud` |
| **SSH** | `ssh root@46.202.149.24` (chave SSH, sem senha) |
| **Webmail** | `https://webmail.rafaeltondin.com.br` (Roundcube) |
| **Script CLI** | `email-setup` (em `/usr/local/bin/`) |
| **Conta principal** | `contato@rafaeltondin.com.br` |

### SMTP (Envio)

| Campo | Valor |
|-------|-------|
| **Host** | `mail.rafaeltondin.com.br` |
| **Porta** | `465` (SSL/TLS) |
| **Seguranca** | SSL/TLS |
| **Usuario** | `contato@rafaeltondin.com.br` |

### IMAP (Recebimento)

| Campo | Valor |
|-------|-------|
| **Host** | `mail.rafaeltondin.com.br` |
| **Porta** | `993` (SSL/TLS) |
| **Seguranca** | SSL/TLS |
| **Usuario** | `contato@rafaeltondin.com.br` |

---

## Metodos de Envio

### Metodo 1: Via SSH + sendmail (RAPIDO - emails simples)

**Quando usar:** Emails rapidos, notificacoes, testes.

```bash
ssh root@46.202.149.24 'echo "Subject: ASSUNTO AQUI
From: Rafael Tondin <contato@rafaeltondin.com.br>
To: DESTINATARIO@EMAIL.COM
Content-Type: text/plain; charset=UTF-8
MIME-Version: 1.0

CORPO DO EMAIL AQUI" | sendmail -f contato@rafaeltondin.com.br DESTINATARIO@EMAIL.COM'
```

**Verificar entrega:**
```bash
ssh root@46.202.149.24 "tail -5 /var/log/mail.log | grep 'status='"
```

### Metodo 2: Via Node.js + Nodemailer (emails completos)

**Quando usar:** Emails HTML, anexos, multiplos destinatarios.

```bash
mkdir D:\temp-email-envio
```

Criar `D:\temp-email-envio\enviar.js`:

```javascript
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'mail.rafaeltondin.com.br',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function enviar() {
  try {
    const info = await transporter.sendMail({
      from: '"Rafael Tondin" <contato@rafaeltondin.com.br>',
      to: 'DESTINATARIO@EMAIL.COM',
      subject: 'ASSUNTO',
      text: 'CORPO TEXTO',
      // html: '<p>CORPO HTML</p>',
      // attachments: [{ filename: 'arquivo.pdf', path: 'D:\\caminho\\arquivo.pdf' }]
    });
    console.log(`[OK] Enviado - ID: ${info.messageId}`);
  } catch (e) {
    console.error(`[ERRO] ${e.message}`);
    process.exit(1);
  }
}

enviar();
```

Executar via credential vault:
```bash
cd D:\temp-email-envio && npm init -y && npm install nodemailer
# Usar credential-cli para nao expor senha
```

Limpar:
```bash
powershell -Command "Remove-Item 'D:\temp-email-envio' -Recurse -Force"
```

### Metodo 3: Via SSH + sendmail HTML

```bash
ssh root@46.202.149.24 'echo "Subject: ASSUNTO
From: Rafael Tondin <contato@rafaeltondin.com.br>
To: DESTINATARIO@EMAIL.COM
Content-Type: text/html; charset=UTF-8
MIME-Version: 1.0

<html><body>
<p>Corpo HTML aqui</p>
<br>
<p><strong>Rafael Tondin</strong></p>
<p>contato@rafaeltondin.com.br</p>
</body></html>" | sendmail -f contato@rafaeltondin.com.br DESTINATARIO@EMAIL.COM'
```

### Qual Metodo Escolher?

| Cenario | Metodo |
|---------|--------|
| Email de teste / notificacao | 1 (SSH + sendmail) |
| Email HTML / com anexos | 2 (Nodemailer) |
| Email HTML sem Node.js | 3 (SSH + sendmail HTML) |

---

## Configurar Novo Dominio de Email

### Passo a Passo Completo

**1. Adicionar dominio no servidor:**
```bash
ssh root@46.202.149.24 "email-setup add-domain NOVODOMINIO.COM.BR"
```
Isso gera a chave DKIM e mostra os 5 registros DNS necessarios.

**2. Configurar DNS no painel do dominio (Cloudflare, Registro.br, etc):**

| # | Tipo | Host | Valor |
|---|------|------|-------|
| 1 | A | mail | 46.202.149.24 |
| 2 | MX | @ | mail.DOMINIO (Prioridade: 10) |
| 3 | TXT | @ | v=spf1 mx a ip4:46.202.149.24 ~all |
| 4 | TXT | default._domainkey | (chave DKIM gerada - copiar do output) |
| 5 | TXT | _dmarc | v=DMARC1; p=quarantine; rua=mailto:dmarc@DOMINIO |

Para ver os registros novamente:
```bash
ssh root@46.202.149.24 "email-setup show-dns DOMINIO"
```

**3. Aguardar propagacao DNS (minutos a 48h)**

**4. Verificar propagacao:**
```bash
ssh root@46.202.149.24 "email-setup check-dns DOMINIO"
```

**5. Criar conta de email:**
```bash
ssh root@46.202.149.24 "email-setup add-account usuario@DOMINIO SENHA_SEGURA"
```

**6. Testar login no webmail:**
Acessar https://webmail.rafaeltondin.com.br com as credenciais criadas.

### Comandos do email-setup

```bash
# Gerenciamento de dominios
email-setup add-domain DOMINIO           # Adicionar dominio
email-setup list-domains                  # Listar dominios
email-setup show-dns DOMINIO             # Mostrar DNS necessario
email-setup check-dns DOMINIO            # Verificar DNS propagado

# Gerenciamento de contas
email-setup add-account EMAIL SENHA      # Criar conta
email-setup change-password EMAIL SENHA  # Alterar senha
email-setup delete-account EMAIL         # Deletar conta
email-setup list-accounts                # Listar todas
email-setup list-accounts DOMINIO        # Listar por dominio

# Status
email-setup status                       # Status de todos os servicos
```

---

## Configuracao de Cliente de Email (Outlook, Thunderbird, etc)

| Config | Valor |
|--------|-------|
| **Servidor IMAP** | mail.DOMINIO |
| **Porta IMAP** | 993 (SSL/TLS) |
| **Servidor SMTP** | mail.DOMINIO |
| **Porta SMTP** | 465 (SSL/TLS) |
| **Usuario** | email completo (ex: contato@dominio.com.br) |
| **Autenticacao** | Login/Plain |

---

## Padrao de Escrita para Email

### Nivel 1: Casual (Amigos, Colegas Proximos)

| Regra | Exemplo |
|-------|---------|
| Tudo minuscula | `e ai, tudo certo?` |
| Abreviacoes | `mt`, `q`, `pra`, `ctg`, `tbm`, `dps`, `hj` |
| Sem pontuacao (exceto ?) | `me avisa quando tu tiver pronto` |
| Usa "tu" | `tu viu o email q eu mandei?` |
| Girias gauchas | `bah, tri bom isso ai` |
| Assinatura: nome ou nada | `rafael` |

### Nivel 2: Semi-Formal (Profissional, Parceiros)

| Regra | Exemplo |
|-------|---------|
| Minuscula (maiuscula em nomes) | `boa tarde, tudo certo?` |
| Menos abreviacoes | `muito bom`, `que`, `depois` |
| Pontuacao minima | `show, vou analisar e te retorno` |
| "tu" ou "voce" | depende da relacao |
| Assinatura: Nome + contato | |

### Nivel 3: Formal (Propostas, Clientes Novos)

| Regra | Exemplo |
|-------|---------|
| Primeira maiuscula | `Boa tarde, tudo bem?` |
| Sem abreviacoes | `muito`, `para`, `tambem` |
| Pontuacao completa | `Segue a proposta conforme conversamos.` |
| "voce" sempre | nunca "tu" |
| Assinatura completa | Nome + cargo + contato + site |

### Assinaturas

**Casual:** `rafael`

**Semi-Formal:**
```
Rafael Tondin
contato@rafaeltondin.com.br
```

**Formal:**
```
Rafael Tondin
Marketing Digital & Gestao de Trafego
contato@rafaeltondin.com.br
rafaeltondin.com.br
```

---

## Regras Obrigatorias de Envio

```
ANTES de enviar qualquer email:
1. Identificar nivel de formalidade
2. Compor email com padrao correto
3. Apresentar ao usuario para confirmacao
4. AGUARDAR confirmacao explicita
5. Enviar via Metodo 1, 2 ou 3
6. Confirmar entrega ao usuario
```

| # | Regra |
|---|-------|
| 1 | NUNCA enviar sem confirmacao do usuario |
| 2 | NUNCA expor senhas em logs |
| 3 | SEMPRE usar `From: "Rafael Tondin" <contato@rafaeltondin.com.br>` |
| 4 | SEMPRE incluir charset UTF-8 |
| 5 | SEMPRE limpar scripts temporarios |
| 6 | SEMPRE verificar servidor antes de enviar |

### Verificacao Pre-Envio

```bash
ssh root@46.202.149.24 "systemctl is-active postfix && systemctl is-active dovecot && echo 'SERVIDOR OK'"
```

---

## Troubleshooting

### Email nao envia

```bash
ssh root@46.202.149.24 "postqueue -p && tail -10 /var/log/mail.log | grep 'bounced\|reject\|error'"
```

### Email cai no spam

1. Verificar PTR: `ssh root@46.202.149.24 "dig -x 46.202.149.24 +short"`
2. Verificar DNS: `ssh root@46.202.149.24 "email-setup check-dns DOMINIO"`
3. Verificar DKIM: `ssh root@46.202.149.24 "tail -20 /var/log/mail.log | grep DKIM"`
4. Reputacao IP: https://mxtoolbox.com/blacklists.aspx (IP: 46.202.149.24)

### Erro de autenticacao

```bash
ssh root@46.202.149.24 "doveadm auth test USUARIO@DOMINIO SENHA"
```

Resetar senha:
```bash
ssh root@46.202.149.24 "email-setup change-password USUARIO@DOMINIO NOVA_SENHA"
```

### Servico parou

```bash
ssh root@46.202.149.24 "email-setup status"
ssh root@46.202.149.24 "systemctl restart postfix dovecot opendkim spamassassin"
```

---

## Notas Tecnicas

- **IPv4 only**: Postfix configurado com `inet_protocols = ipv4` (IPv6 nao tem PTR)
- **PTR**: `46.202.149.24` → `mail.srv410981.hstgr.cloud` (configurado na Hostinger)
- **Senhas**: Formato `{CRYPT}` bcrypt via python3
- **DB**: MySQL `cyberpanel` (tabelas: `e_domains`, `e_users`, `e_forwardings`)
- **Maildir**: `/home/vmail/DOMINIO/USUARIO/`
- **Documentacao servidor**: `CYBERPANEL-EMAIL-SERVER-DOCUMENTACAO.md`

---

**Documento criado:** 2026-02-15
**Ultima atualizacao:** 2026-02-25
**Versao:** 2.0.0 (migrado de Modoboa para CyberPanel)
