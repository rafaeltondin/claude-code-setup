# CORE_RULES - Regras Compartilhadas (v3.0)

Arquivo de referencia para TODOS os agentes. Evita duplicacao de regras.

## CONVENCAO DE CAMINHOS

Todos os caminhos usam `~/.claude/` como raiz (resolve para `$HOME/.claude/` em qualquer SO).
NUNCA usar caminhos absolutos com nome de usuario especifico.

## KB_PROTOCOL
ANTES de qualquer acao:
1. Buscar na KB: `node "~/.claude/knowledge-base/knowledge-search.js" "termos"`
2. Score > 50%: USAR OBRIGATORIO | 20-50%: Referencia | <20%: Conhecimento geral
3. Citar fonte: "Fonte: [documento.md]"

## MCP_PROTOCOL
MCPs disponiveis para TODOS os agentes usarem quando necessario:

### chrome-devtools (`mcp__chrome-devtools__*`)
- **Quando:** Validar frontend, testar no browser, debug web, medir performance
- **Tools principais:**

| Categoria | Tools | Uso |
|-----------|-------|-----|
| Navegacao | `navigate_page`, `new_page`, `list_pages`, `select_page`, `close_page`, `resize_page` | Abrir URLs, gerenciar abas, mudar viewport |
| Interacao | `click`, `fill`, `fill_form`, `hover`, `press_key`, `drag`, `upload_file`, `handle_dialog` | Interagir com elementos |
| Captura | `take_screenshot`, `take_snapshot`, `evaluate_script` | Capturar visual, DOM, executar JS |
| Debug | `list_console_messages`, `get_console_message`, `list_network_requests`, `get_network_request` | Console errors, network |
| Performance | `performance_start_trace`, `performance_stop_trace`, `performance_analyze_insight` | Core Web Vitals |
| Emulacao | `emulate`, `wait_for` | Dispositivos moveis, aguardar |

### Decision Tree: Qual Tool Usar?

```
TAREFA DO AGENTE:
+-- Precisa ABRIR pagina? → navigate_page + wait_for
+-- Precisa VER? → take_screenshot (visual) / take_snapshot (DOM) / ambos
+-- Precisa INTERAGIR? → take_snapshot (seletor) → click/fill/fill_form
+-- Precisa DEBUGAR? → list_console_messages / list_network_requests
+-- Precisa MEDIR? → performance_start_trace → interagir → performance_stop_trace
+-- Precisa TESTAR responsivo? → resize_page (1920x1080, 768x1024, 375x812)
```

### Pre-flight Check (OBRIGATORIO)

```
1. list_pages → verificar Chrome conectado
2. Para localhost: verificar servidor rodando
3. Para URLs publicas: verificar URL valida
```

### Regras de Ouro
1. take_snapshot ANTES de interagir (nunca adivinhar seletores)
2. wait_for APOS navegar (nunca interagir antes de carregar)
3. list_console_messages apos acoes criticas
4. take_screenshot em pontos-chave

### desktop-commander (`mcp__desktop-commander__*`)
- **Quando:** Rodar comandos, gerenciar arquivos/processos
- **Tools:** `execute_command`, `read_file`, `write_file`, `search_files`, `edit_file`, `execute_python`, `execute_nodejs`, `list_processes`, `kill_process`

### sequential-thinking (`mcp__sequential-thinking__sequential_thinking`)
- **Quando:** Tarefa complexa (3+ subtarefas), multiplas abordagens, analise arquitetural

## CODE_RULES
- Logs detalhados em CADA funcao (entrada, processo, saida, erro)
- Ler codigo existente ANTES de criar/modificar
- Compatibilidade com padroes do projeto
- Error handling robusto

## OUTPUT_RULES
- NUNCA criar arquivos .md de documentacao sem ser pedido
- NUNCA pedir ao usuario fazer tarefas manualmente
- Codigo pronto para uso IMEDIATO
- Compatibilidade cross-platform

## VALIDATION_RULES (OBRIGATORIO!)

### Frontend (HTML/CSS/JS)

**Camada 1 - Frontend Analyzer (estatico):**
```bash
cd ~/.claude/frontend-analyzer && node src/index.js --path "[CAMINHO]" --format json
```
Criterios: Score >=70, Acessibilidade >=80, Critical=0

**Camada 2 - Chrome DevTools (runtime):**
```
1. navigate_page → abrir pagina
2. list_console_messages → ZERO erros
3. list_network_requests → ZERO 4xx/5xx
4. take_screenshot → evidencia visual
5. performance traces → LCP<2.5s, CLS<0.1, FCP<1.8s
6. resize_page 375x812 → mobile OK
```

### Backend Node.js
```bash
npx tsc --noEmit && npm run lint && npm test
```

## REPORT_FORMAT
```json
{"tarefaId":"T001","status":"SUCESSO|FALHA|PARCIAL","resumo":"...","artefatos":[],"problemas":[],"validacao":{"frontend_analyzer":{"score":85},"chrome_devtools":{"console_errors":0}}}
```
