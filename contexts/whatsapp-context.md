# WhatsApp — Protocolo de Envio

## Regras fundamentais

- **Instância:** `cenora`
- **Evolution API:** `https://evolution.rafaeltondin.com.br` (servidor CyberPanel remoto)
- **API Key vault:** `EVOLUTION_API_KEY`
- **Confirmar** com usuário ANTES de enviar qualquer mensagem
- **Intervalo:** 30s entre mensagens
- **NUNCA** criar lead sem verificar WhatsApp primeiro
- **Número do dono:** `555499000753`

## Envio via Tools CLI (método preferencial)

```bash
# Texto simples
node tools-cli.js send_whatsapp number="555499000753" text="mensagem aqui"

# Com mídia
node tools-cli.js send_whatsapp number="555499000753" text="legenda" mediaUrl="https://..." mediaType="image"
```

**Obs:** O número é normalizado automaticamente (adiciona `@s.whatsapp.net`). Aceita com ou sem DDI, com ou sem formatação.

## Envio direto via Evolution API (fallback)

```bash
# Via servidor SSH
ssh root@SERVIDOR "curl -s -X POST 'http://localhost:8080/message/sendText/cenora' \
  -H 'apikey: API_KEY_AQUI' \
  -H 'Content-Type: application/json' \
  -d '{\"number\":\"555499000753@s.whatsapp.net\",\"text\":\"mensagem\"}'"
```

**Importante:** A Evolution API roda no servidor CyberPanel (porta 8080 interna). NÃO roda localmente no Windows.

## Tom e estilo

Carregar do perfil do agente no CRM (`GET /api/crm/settings`):
- `agentToneOfVoice`: casual | amigavel | profissional | formal
- `agentToneDescription`: descrição detalhada

## Verificar WhatsApp antes de salvar lead

**NUNCA criar lead se o número não tiver WhatsApp ativo.**

1. Normalizar para E.164: `(11) 99999-8888` → `5511999998888`
2. Verificar: `POST /api/crm/leads/check-whatsapp` com `{ "numbers": ["5511..."] }`
3. `exists: true` → criar lead | `exists: false` → não criar | Sem telefone → pode criar

O backend também valida automaticamente — retorna 400 `WHATSAPP_NOT_VERIFIED` se o número não tiver WhatsApp.

## Contatos e grupos

```bash
node tools-cli.js whatsapp_contacts action=contacts search="João"
node tools-cli.js whatsapp_contacts action=groups search="vendas"
node tools-cli.js whatsapp_contacts action=chats search="fiber" limit=20
node tools-cli.js whatsapp_contacts action=group_info group_jid="123456789@g.us"
```
