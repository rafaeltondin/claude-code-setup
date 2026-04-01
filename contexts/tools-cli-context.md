# Tools CLI — 50 Ferramentas via Terminal

**CLI:** `node "~/.claude/task-scheduler/tools-cli.js"`

**REGRA:** SEMPRE preferir o Tools CLI para tarefas que possuem ferramenta dedicada.

**Comandos:**
- `--list` — lista todas as ferramentas
- `--help <ferramenta>` — mostra descrição e parâmetros
- `<ferramenta> key=value ...` — executa com argumentos
- `'{"tool":"nome","args":{...}}'` — executa com JSON

## Ferramentas por categoria

| Categoria | Ferramentas |
|-----------|------------|
| **Busca/Pesquisa** | `search_kb`, `google_search`, `maps_search`, `search_in_files`, `find_files` |
| **Web/SEO** | `scrape_website`, `seo_check`, `pagespeed`, `fetch_api`, `open_url` |
| **CRM** | `call_crm` (leads, tasks, finance, notes, campaigns, templates, settings) |
| **Meta Ads** | `meta_ads` (campaigns, insights, adsets, ads, account_info) |
| **Arquivos** | `read_file`, `write_file`, `list_directory`, `delete_file`, `move_file`, `file_info`, `diff_files` |
| **Execução** | `execute_node`, `run_command`, `git`, `process_manager`, `scheduler` |
| **Dados** | `csv_processor`, `pdf_reader` |
| **Credenciais** | `get_credential`, `vault_manage` |
| **Mensagens** | `send_whatsapp`, `send_email` |
| **WhatsApp** | `whatsapp_contacts` (contacts, groups, chats, group_info) |
| **Browser** | `chrome`, `generate_image` |
| **Social** | `instagram` |
| **Orquestração** | `orchestrate` |
| **Servidor** | `cyberpanel_site` (create, list, delete, ssl), `docker_manage`, `db_query`, `log_analyzer` |
| **Rede/DNS** | `dns_lookup`, `ssl_check`, `whois_lookup` |
| **Utilitários** | `text_utils` (base64, hash, slugify, jwt, uuid), `image_optimize` |
| **Python/ETL** | `ocr_extract`, `data_transform`, `video_tools`, `color_palette`, `html_to_pdf`, `contact_validator` |

## Exemplos de uso

```bash
# KB
node tools-cli.js search_kb query="Shopify API orders"

# CRM
node tools-cli.js call_crm endpoint=/leads query="limit=10&status=new"
node tools-cli.js call_crm endpoint=/leads method=POST body='{"name":"João","phone":"5511999999999"}'
node tools-cli.js call_crm endpoint=/personal-tasks method=POST body='{"title":"Tarefa","priority":"high","dueDate":"2026-03-12T12:00:00.000Z"}'

# Web/SEO
node tools-cli.js seo_check url=https://example.com
node tools-cli.js pagespeed url=https://example.com strategy=mobile
node tools-cli.js scrape_website url=https://example.com

# Busca
node tools-cli.js google_search query="dentistas Garopaba SC" num_results=20
node tools-cli.js maps_search query=dentistas location="Garopaba SC"

# Meta Ads
node tools-cli.js meta_ads action=campaigns status=ACTIVE
node tools-cli.js meta_ads action=insights date_preset=last_7d

# Dados
node tools-cli.js csv_processor file_path=dados.csv action=stats
node tools-cli.js pdf_reader file_path=documento.pdf

# Scheduler
node tools-cli.js scheduler action=create name="Backup" cron="0 3 * * *" command="node backup.js" type=node

# CyberPanel
node tools-cli.js cyberpanel_site action=create domain=meusite.com.br
node tools-cli.js cyberpanel_site action=list
node tools-cli.js cyberpanel_site action=ssl domain=meusite.com.br ssl_method=acme

# Rede/DNS
node tools-cli.js dns_lookup domain=meusite.com.br
node tools-cli.js ssl_check domain=meusite.com.br
node tools-cli.js whois_lookup domain=meusite.com.br

# DB/Docker/Logs (servidor)
node tools-cli.js db_query query="SHOW DATABASES"
node tools-cli.js docker_manage action=list
node tools-cli.js log_analyzer domain=meusite.com.br analysis=summary

# Utilitários
node tools-cli.js text_utils action=slugify text="Meu Título"
node tools-cli.js text_utils action=uuid
node tools-cli.js image_optimize input=foto.jpg quality=75 width=1200 format=webp

# ETL/Dados
node tools-cli.js ocr_extract input=documento.png
node tools-cli.js data_transform action=convert input=dados.xlsx output=dados.json
node tools-cli.js video_tools action=info input=video.mp4
node tools-cli.js color_palette input=logo.png colors=5
node tools-cli.js html_to_pdf input=proposta.html output=proposta.pdf
node tools-cli.js contact_validator action=validate_phone phone="48999887766"

# WhatsApp
node tools-cli.js whatsapp_contacts action=contacts search="João"
node tools-cli.js whatsapp_contacts action=groups search="vendas"
node tools-cli.js send_whatsapp number="5548999999999" text="mensagem"
```

O CLI já integra credential vault, circuit breaker e cache automaticamente.

---

## Ralph Init — Ferramenta de projetos Ralph

```bash
# Listar projetos Ralph
node ~/.claude/tools/ralph-init.js --list

# Criar projeto novo
node ~/.claude/tools/ralph-init.js <nome>

# Criar a partir de diretório existente
node ~/.claude/tools/ralph-init.js <nome> --from ~/Desktop/meu-app

# Clonar e configurar
node ~/.claude/tools/ralph-init.js <nome> --clone https://github.com/user/repo

# Retomar projeto existente
node ~/.claude/tools/ralph-init.js --resume <nome>
```

Faz automaticamente: cria ~/projects/<nome>/, git init, ralph-enable, corrige .ralphrc com ALLOWED_TOOLS full, adiciona instruções de KB ao PROMPT.md, abre Git Bash com ralph --live.
