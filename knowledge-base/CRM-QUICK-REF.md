# CRM Quick Reference

## AUTENTICACAO

```bash
curl -X POST http://localhost:3847/api/crm/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"USER_EMAIL","password":"USER_PASS"}'
```

## ENDPOINTS PRINCIPAIS

| Acao | Metodo | Endpoint |
|------|--------|----------|
| Listar leads | GET | `/api/crm/leads?status=X&temperature=Y&search=Z` |
| Criar lead | POST | `/api/crm/leads` |
| Atualizar lead | PUT | `/api/crm/leads/:id` |
| Adicionar nota | POST | `/api/crm/leads/:id/notes` |
| Enviar WhatsApp | POST | `/api/crm/messages/whatsapp` |
| Enviar e-mail | POST | `/api/crm/messages/email` |
| Dashboard | GET | `/api/crm/dashboard/stats` |
| Health | GET | `/api/crm/health` |

## STATUS PIPELINE

| Status | Quando |
|--------|--------|
| `new` | Novo lead |
| `contacted` | Mensagem enviada |
| `replied` | Lead respondeu |
| `interested` | Interesse real |
| `negotiating` | Proposta enviada |
| `won` | Fechou |
| `lost` | Perdeu |

## TEMPERATURA

| Temp | Criterio |
|------|----------|
| `cold` | 14+ dias sem resposta |
| `warm` | Respondeu, sem decisao |
| `hot` | Interesse claro |

## WHATSAPP

```bash
curl -X POST http://localhost:3847/api/crm/messages/whatsapp \
  -H "Authorization: Bearer local-dev-token" \
  -H "Content-Type: application/json" \
  -d '{"leadId":"ID","content":"mensagem"}'
```

## DOCUMENTACAO COMPLETA

Ver: `CRM-DOCUMENTACAO-COMPLETA.md`