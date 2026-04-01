# Instruções para Claude Desktop Cowork

## PRIMEIRA COISA A FAZER

No INÍCIO de cada conversa, execute `instrucoes_claude` para carregar as regras globais do usuário.

## Ferramentas Disponíveis via MCP "claude-ecosystem"

### Instruções e Contexto
- `instrucoes_claude` — Carrega CLAUDE.md (OBRIGATÓRIO no início)
- `instrucoes_contexto` — Carrega contextos sob demanda (crm, tools-cli, credentials, whatsapp, mcp, agents, chrome-protocol, validation-protocol)
- `instrucoes_memoria` — Carrega MEMORY.md com memória persistente
- `instrucoes_memoria_detalhe` — Lê arquivo de memória específico

### CRM Local (porta 3847)
- `crm_listar_leads`, `crm_ver_lead`, `crm_criar_lead`, `crm_atualizar_lead`
- `crm_adicionar_nota`, `crm_historico_mensagens`
- `crm_enviar_whatsapp`, `crm_enviar_email`
- `crm_dashboard_stats`, `crm_listar_campanhas`, `crm_listar_templates`

### Tarefas Pessoais
- `tasks_listar`, `tasks_criar`, `tasks_atualizar`, `tasks_stats`

### Financeiro
- `finance_resumo`, `finance_listar_transacoes`, `finance_criar_transacao`
- `finance_listar_categorias`, `finance_listar_metas`, `finance_listar_investimentos`

### Notas
- `notas_listar`, `notas_criar`, `notas_atualizar`, `notas_toggle_pin`, `notas_listar_categorias`

### Knowledge Base
- `kb_listar_documentos`, `kb_buscar`, `kb_ler_documento`

### Sessões
- `sessao_ultima`, `sessao_pendencias`, `sessao_salvar`

### Chrome
- `chrome_perfis`, `chrome_abrir_url`, `chrome_status`

### File System
- `fs_ler_arquivo`, `fs_escrever_arquivo`, `fs_deletar`, `fs_mover`, `fs_listar`, `fs_info`

### Shell
- `shell_executar` — Executa qualquer comando do sistema

### Tools CLI (103+ ferramentas)
- `tools_listar` — Lista todas
- `tools_help` — Help de uma ferramenta
- `tools_executar` — Executa qualquer ferramenta (scrape, SEO, Meta Ads, DNS, SSL, WhatsApp, Telegram, imagens, etc.)

### Sentinels
- `sentinel_acoes_rodar`, `sentinel_crypto_rodar`, `sentinel_logs`

## Outros MCPs Disponíveis
- **desktop-commander** — Terminal, arquivos, Python/Node
- **sequential-thinking** — Raciocínio multi-step
- **memory** — Grafo de conhecimento persistente
- **context7** — Docs de bibliotecas externas
- **fetch** — Buscar URLs

## Regras Importantes
1. Sempre responder em PT-BR
2. Nunca dizer "pronto" sem testar
3. Usar tools-cli antes de scripts manuais
4. Nunca killall node
5. SSH em batch (nunca múltiplas conexões rápidas)
6. Pedir confirmação antes de enviar mensagens ou deletar dados
