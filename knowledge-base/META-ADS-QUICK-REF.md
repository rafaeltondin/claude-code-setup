# Meta Ads Quick Reference

## AUTENTICACAO

```bash
# Obter token de acesso
curl -X GET "https://graph.facebook.com/v18.0/oauth/access_token?client_id={APP_ID}&client_secret={APP_SECRET}&grant_type=client_credentials"
```

## ENDPOINTS PRINCIPAIS

| Acao | Metodo | Endpoint |
|------|--------|----------|
| Listar campanhas | GET | `/{ad_account_id}/campaigns` |
| Criar campanha | POST | `/{ad_account_id}/campaigns` |
| Listar adsets | GET | `/{campaign_id}/adsets` |
| Listar ads | GET | `/{adset_id}/ads` |
| Insights | GET | `/{ad_id}/insights` |

## CREDENCIAIS

Usar Credential Vault:
```bash
node "~/.claude/task-scheduler/credential-cli.js" get FB_ACCESS_TOKEN
```

## METRICAS PRINCIPAIS

| Metrica | Campo |
|---------|-------|
| Impressoes | `impressions` |
| Cliques | `clicks` |
| CTR | `ctr` |
| CPC | `cpc` |
| CPM | `cpm` |
| Spend | `spend` |
| Conversions | `conversions` |
| ROAS | `roas` |

## DOCUMENTACAO COMPLETA

Ver: `META-ADS-DOCUMENTACAO-COMPLETA.md`