---
title: "Riwer Labs - Guia Completo de Envio de Email"
category: "Automacao"
tags:
  - riwer labs
  - email
  - envio email
  - smtp
  - imap
  - contato
  - sendmail
  - nodemailer
  - email profissional
  - servidor email
  - email-setup
  - webmail
  - roundcube
  - riwerlabs
topic: "Envio de Email Riwer Labs"
priority: high
version: "1.0.0"
last_updated: "2026-02-25"
---

# Riwer Labs - Guia Completo de Envio de Email

Guia para enviar emails como Riwer Labs (`contato@riwerlabs.com`) usando o servidor CyberPanel. Inclui configuracao SMTP/IMAP, metodos de envio, templates HTML e assinaturas.

---

## Acesso Rapido

| Campo | Valor |
|-------|-------|
| **Email principal** | `contato@riwerlabs.com` |
| **Senha** | `RiwerLabs2026!` |
| **Servidor** | `46.202.149.24` (CyberPanel) |
| **Webmail** | `https://webmail.rafaeltondin.com.br` (Roundcube) |
| **Script CLI** | `email-setup` (em `/usr/local/bin/`) |

### SMTP (Envio)

| Campo | Valor |
|-------|-------|
| **Host** | `mail.riwerlabs.com` |
| **Porta** | `465` (SSL/TLS) |
| **Seguranca** | SSL/TLS |
| **Autenticacao** | LOGIN |
| **Usuario** | `contato@riwerlabs.com` |

### IMAP (Recebimento)

| Campo | Valor |
|-------|-------|
| **Host** | `mail.riwerlabs.com` |
| **Porta** | `993` (SSL/TLS) |
| **Seguranca** | SSL/TLS |
| **Usuario** | `contato@riwerlabs.com` |

---

## Metodos de Envio

### Metodo 1: Via SSH + sendmail (RAPIDO - emails simples)

**Quando usar:** Emails rapidos, notificacoes, testes.

```bash
ssh root@46.202.149.24 'echo "Subject: ASSUNTO AQUI
From: Riwer Labs <contato@riwerlabs.com>
To: DESTINATARIO@EMAIL.COM
Content-Type: text/plain; charset=UTF-8
MIME-Version: 1.0

CORPO DO EMAIL AQUI" | sendmail -f contato@riwerlabs.com DESTINATARIO@EMAIL.COM'
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
  host: 'mail.riwerlabs.com',
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
      from: '"Riwer Labs" <contato@riwerlabs.com>',
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

### Metodo 3: Via SSH + sendmail HTML (email com identidade visual)

```bash
ssh root@46.202.149.24 'echo "Subject: ASSUNTO
From: Riwer Labs <contato@riwerlabs.com>
To: DESTINATARIO@EMAIL.COM
Content-Type: text/html; charset=UTF-8
MIME-Version: 1.0

<html><body style=\"font-family: Poppins, Arial, sans-serif; background-color: #0D0D0D; color: #ffffff; padding: 40px;\">
<div style=\"max-width: 600px; margin: 0 auto;\">
  <img src=\"https://riwerlabs.com/wp-content/uploads/2025/07/Logotipo-4.png\" alt=\"Riwer Labs\" width=\"180\" style=\"margin-bottom: 30px;\">
  <p>CORPO DO EMAIL AQUI</p>
  <br>
  <hr style=\"border-color: #333; margin: 30px 0;\">
  <p style=\"color: #A0A0A0; font-size: 12px;\">Riwer Labs | IA que Transforma Negocios<br>contato@riwerlabs.com | riwerlabs.com</p>
</div>
</body></html>" | sendmail -f contato@riwerlabs.com DESTINATARIO@EMAIL.COM'
```

### Qual Metodo Escolher?

| Cenario | Metodo |
|---------|--------|
| Email de teste / notificacao | 1 (SSH + sendmail) |
| Email HTML / com anexos | 2 (Nodemailer) |
| Email HTML sem Node.js | 3 (SSH + sendmail HTML) |

---

## Template HTML de Email Riwer Labs

### Template Profissional Completo

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Poppins', Arial, Helvetica, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #0D0D0D; border-radius: 12px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="padding: 30px 40px; background: linear-gradient(135deg, #0D0D0D 0%, #1A1A1A 100%);">
              <img src="https://riwerlabs.com/wp-content/uploads/2025/07/Logotipo-4.png" alt="Riwer Labs" width="160" style="display: block;">
            </td>
          </tr>

          <!-- Corpo -->
          <tr>
            <td style="padding: 40px; color: #ffffff; font-size: 15px; line-height: 1.6;">
              <p style="margin: 0 0 20px;">Ola [NOME],</p>
              <p style="margin: 0 0 20px;">[CORPO DO EMAIL]</p>

              <!-- CTA Button (opcional) -->
              <table cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td style="background-color: #D0FF59; border-radius: 9999px; padding: 14px 28px;">
                    <a href="[URL]" style="color: #000000; text-decoration: none; font-weight: 600; font-size: 14px;">[TEXTO DO BOTAO]</a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0;">Abracos,<br><strong>Rafael Tondin</strong></p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; border-top: 1px solid #333333; background-color: #0A0A0A;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color: #A0A0A0; font-size: 12px; line-height: 1.5;">
                    <strong style="color: #D0FF59;">Riwer Labs</strong> | IA que Transforma Negocios<br>
                    contato@riwerlabs.com | <a href="https://riwerlabs.com" style="color: #2D54FF; text-decoration: none;">riwerlabs.com</a><br>
                    <a href="https://wa.me/555499000753" style="color: #2D54FF; text-decoration: none;">+55 54 9900-0753</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

### Template Minimalista (texto puro com assinatura)

```
[CORPO DO EMAIL]

--
Rafael Tondin
Riwer Labs | IA que Transforma Negocios
contato@riwerlabs.com | riwerlabs.com
+55 54 9900-0753
```

---

## Assinaturas de Email

### Formal (Propostas, Clientes Novos)

```
Rafael Tondin
Fundador | Riwer Labs
contato@riwerlabs.com
riwerlabs.com
+55 54 9900-0753
```

### Semi-Formal (Parceiros, Fornecedores)

```
Rafael Tondin
Riwer Labs
contato@riwerlabs.com
```

### Casual (Comunicacao Interna)

```
rafael
riwer labs
```

---

## Padrao de Escrita por Nivel

### Nivel 1: Casual (Amigos, Colegas)

| Regra | Exemplo |
|-------|---------|
| Tudo minuscula | `e ai, tudo certo?` |
| Abreviacoes | `mt`, `q`, `pra`, `ctg`, `tbm`, `dps`, `hj` |
| "tu" | `tu viu o email q eu mandei?` |
| Girias gauchas | `bah, tri bom isso ai` |

### Nivel 2: Semi-Formal (Profissional)

| Regra | Exemplo |
|-------|---------|
| Minuscula (maiuscula em nomes) | `boa tarde, tudo certo?` |
| Menos abreviacoes | `muito bom`, `que`, `depois` |
| "tu" ou "voce" | depende da relacao |

### Nivel 3: Formal (Propostas, Clientes)

| Regra | Exemplo |
|-------|---------|
| Primeira maiuscula | `Boa tarde, tudo bem?` |
| Sem abreviacoes | `muito`, `para`, `tambem` |
| "voce" sempre | nunca "tu" |
| From: | `"Riwer Labs" <contato@riwerlabs.com>` |

---

## Contas de Email Disponiveis

| Email | Dominio | Uso |
|-------|---------|-----|
| `contato@riwerlabs.com` | riwerlabs.com | Email principal da empresa |
| `contato@rafaeltondin.com.br` | rafaeltondin.com.br | Email pessoal/profissional |
| `contato@suletiquetas.com.br` | suletiquetas.com.br | Cliente Sul Etiquetas |

Todas usam o mesmo servidor e a mesma senha: `RiwerLabs2026!`

---

## Gerenciamento de Contas

### Criar nova conta

```bash
ssh root@46.202.149.24 "email-setup add-account novo@riwerlabs.com SENHA_SEGURA"
```

### Alterar senha

```bash
ssh root@46.202.149.24 "email-setup change-password contato@riwerlabs.com NOVA_SENHA"
```

### Listar contas

```bash
ssh root@46.202.149.24 "email-setup list-accounts riwerlabs.com"
```

### Verificar DNS

```bash
ssh root@46.202.149.24 "email-setup check-dns riwerlabs.com"
```

---

## Configuracao de Cliente de Email

### Outlook, Thunderbird, Apple Mail

| Config | Valor |
|--------|-------|
| **Servidor IMAP** | `mail.riwerlabs.com` |
| **Porta IMAP** | `993` (SSL/TLS) |
| **Servidor SMTP** | `mail.riwerlabs.com` |
| **Porta SMTP** | `465` (SSL/TLS) |
| **Usuario** | `contato@riwerlabs.com` |
| **Autenticacao** | Login/Plain |

### Webmail

- URL: `https://webmail.rafaeltondin.com.br`
- Login: email completo + senha

---

## Regras Obrigatorias de Envio

```
ANTES de enviar qualquer email como Riwer Labs:
1. Identificar nivel de formalidade
2. Compor email com padrao correto
3. Usar From: "Riwer Labs" <contato@riwerlabs.com>
4. Apresentar ao usuario para confirmacao
5. AGUARDAR confirmacao explicita
6. Enviar via Metodo 1, 2 ou 3
7. Confirmar entrega ao usuario
```

| # | Regra |
|---|-------|
| 1 | NUNCA enviar sem confirmacao do usuario |
| 2 | NUNCA expor senhas em logs |
| 3 | SEMPRE usar charset UTF-8 |
| 4 | SEMPRE limpar scripts temporarios |
| 5 | SEMPRE verificar servidor antes de enviar |
| 6 | Logo oficial: `https://riwerlabs.com/wp-content/uploads/2025/07/Logotipo-4.png` |

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

1. Verificar DNS: `ssh root@46.202.149.24 "email-setup check-dns riwerlabs.com"`
2. Verificar DKIM: `ssh root@46.202.149.24 "tail -20 /var/log/mail.log | grep DKIM"`
3. Reputacao IP: https://mxtoolbox.com/blacklists.aspx (IP: 46.202.149.24)

### Erro de autenticacao

```bash
ssh root@46.202.149.24 "doveadm auth test contato@riwerlabs.com RiwerLabs2026!"
```

Resetar senha:
```bash
ssh root@46.202.149.24 "email-setup change-password contato@riwerlabs.com NOVA_SENHA"
```

---

## Notas Tecnicas

- **IPv4 only**: Postfix com `inet_protocols = ipv4`
- **PTR**: `46.202.149.24` → `mail.srv410981.hstgr.cloud`
- **Senhas**: Hash `{CRYPT}` bcrypt via `doveadm pw -s CRYPT`
- **DB**: MySQL `cyberpanel` (tabelas: `e_domains`, `e_users`)
- **Maildir**: `maildir:/home/vmail/riwerlabs.com/contato/Maildir`
- **Roundcube config**: STARTTLS `tls://localhost:143` (IMAP) e `tls://localhost:587` (SMTP)
- **Guia geral de email**: `EMAIL-RAFAELTONDIN-GUIA-ENVIO-CLAUDE-CODE.md`

---

**Documento criado:** 2026-02-25
**Ultima atualizacao:** 2026-02-25
**Versao:** 1.0.0
