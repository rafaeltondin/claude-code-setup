# MCP Context - Model Context Protocol Servers

## MCPs DISPONIVEIS

### chrome-devtools (`mcp__chrome-devtools__*`)
**Funcao:** Automacao de browser, debug de frontend, testes visuais, performance

| Categoria | Tools | Uso |
|-----------|-------|-----|
| Navegacao | `navigate_page`, `new_page`, `list_pages`, `select_page`, `close_page`, `resize_page` | Abrir URLs, gerenciar abas, mudar viewport |
| Interacao | `click`, `fill`, `fill_form`, `hover`, `press_key`, `drag`, `upload_file`, `handle_dialog` | Interagir com elementos |
| Captura | `take_screenshot`, `take_snapshot`, `evaluate_script` | Capturar visual, DOM, executar JS |
| Debug | `list_console_messages`, `get_console_message`, `list_network_requests`, `get_network_request` | Console errors, network |
| Performance | `performance_start_trace`, `performance_stop_trace`, `performance_analyze_insight` | Core Web Vitals |
| Emulacao | `emulate`, `wait_for` | Dispositivos moveis, aguardar |

### desktop-commander (`mcp__desktop-commander__*`)
**Funcao:** Operacoes de sistema, terminal, gerenciamento de arquivos/processos

| Situacao | Tool |
|----------|------|
| Rodar comandos terminal | `execute_command` |
| Ler arquivos (Excel, PDF) | `read_file` |
| Escrever arquivos | `write_file` |
| Buscar arquivos | `search_files` |
| Editar arquivos | `edit_file` |
| Executar Python | `execute_python` |
| Executar Node.js | `execute_nodejs` |
| Listar processos | `list_processes` |
| Matar processo | `kill_process` |

### sequential-thinking (`mcp__sequential-thinking__sequential_thinking`)
**Funcao:** Decomposicao de problemas complexos, planejamento step-by-step

| Situacao | Quando Usar |
|----------|-------------|
| Tarefa com 3+ subtarefas | OBRIGATORIO |
| Multiplas abordagens possiveis | OBRIGATORIO |
| Analise arquitetural | OBRIGATORIO |
| Avaliar trade-offs | OBRIGATORIO |

### memory
**Funcao:** Grafo persistente entre sessoes

### context7
**Funcao:** Docs de bibliotecas/frameworks

### fetch
**Funcao:** Buscar URLs

---

## PROTOCOLO DE USO POR FASE

```
FASE 0: PLANEJAMENTO
+-- sequential-thinking -> decompor tarefa em etapas
+-- chrome-devtools: list_pages -> pre-flight check (Chrome disponivel?)

FASE 1: ANALISE
+-- desktop-commander: search_files -> localizar arquivos
+-- desktop-commander: read_file -> ler Excel, PDF
+-- chrome-devtools: navigate_page -> ver pagina existente
+-- chrome-devtools: take_snapshot -> analisar DOM
+-- chrome-devtools: list_console_messages -> erros pre-existentes
+-- chrome-devtools: list_network_requests -> APIs atuais

FASE 2: RECONHECIMENTO
+-- desktop-commander: list_processes -> verificar servidores
+-- desktop-commander: search_files -> buscar padroes
+-- chrome-devtools: take_screenshot -> estado ANTES
+-- chrome-devtools: performance_start_trace -> baseline

FASE 3: IMPLEMENTACAO
+-- desktop-commander: execute_command -> instalar deps, rodar servidor
+-- desktop-commander: execute_nodejs/python -> scripts rapidos
+-- chrome-devtools: navigate_page + wait_for -> abrir e aguardar
+-- chrome-devtools: take_snapshot -> confirmar seletores
+-- chrome-devtools: click/fill/fill_form -> testar interacoes
+-- chrome-devtools: list_console_messages -> verificar erros
+-- chrome-devtools: take_screenshot -> capturar progresso

FASE 4: VALIDACAO (OBRIGATORIA - 2 CAMADAS)
+-- CAMADA 1: Frontend Analyzer (estatico)
|   +-- desktop-commander: execute_command -> rodar Frontend Analyzer
|   +-- Score >= 70, A11y >= 80, Critical = 0
|
+-- CAMADA 2: Chrome DevTools (runtime)
|   +-- chrome-devtools: navigate_page -> abrir pagina
|   +-- chrome-devtools: wait_for -> carregamento completo
|   +-- chrome-devtools: list_console_messages -> ZERO erros
|   +-- chrome-devtools: list_network_requests -> ZERO 4xx/5xx
|   +-- chrome-devtools: take_screenshot -> evidencia visual
|   +-- chrome-devtools: resize_page 375x812 -> screenshot mobile
|   +-- chrome-devtools: performance_start_trace -> interagir
|   +-- chrome-devtools: performance_stop_trace -> Core Web Vitals
|       +-- LCP < 2.5s, CLS < 0.1, FCP < 1.8s
```

---

## DECISION TREE - QUAL TOOL USAR?

```
TAREFA DO AGENTE:
+-- Precisa ABRIR pagina? → navigate_page + wait_for
+-- Precisa VER? → take_screenshot (visual) / take_snapshot (DOM)
+-- Precisa INTERAGIR? → take_snapshot (seletor) → click/fill/fill_form
+-- Precisa DEBUGAR? → list_console_messages / list_network_requests
+-- Precisa MEDIR? → performance_start_trace → interagir → performance_stop_trace
+-- Precisa TESTAR responsivo? → resize_page (1920x1080, 768x1024, 375x812)
```

---

## REGRAS DE OURO CHROME DEVTOOLS

1. **take_snapshot ANTES de interagir** (nunca adivinhar seletores)
2. **wait_for APOS navegar** (nunca interagir antes de carregar)
3. **list_console_messages apos acoes criticas**
4. **take_screenshot em pontos-chave**

---

## TRATAMENTO DE FALHAS

```
SE chrome-devtools FALHAR:

+-- Erro de conexao (Chrome nao responde):
|   +-- INFORMAR usuario: "Chrome precisa estar aberto"
|   +-- CONTINUAR tarefas que nao dependem de browser
|
+-- Erro de navegacao (timeout, URL invalida):
|   +-- VERIFICAR URL e servidor
|   +-- RETRY 1x com wait_for timeout maior
|
+-- Erro de interacao (elemento nao encontrado):
|   +-- take_snapshot -> ver DOM atual
|   +-- TENTAR seletor alternativo
```

---

## LIMITACOES

| Limitacao | Workaround |
|-----------|------------|
| Chrome deve estar rodando | Informar usuario |
| Login/CAPTCHA manual | Pedir usuario para logar primeiro |
| SPAs com hydration lento | wait_for com selector especifico |
| Cross-origin iframes | Navegar diretamente para URL do iframe |
| Shadow DOM | evaluate_script com shadowRoot.querySelector |