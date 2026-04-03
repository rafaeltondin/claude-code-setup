# Chrome Debug Protocol - Regras de Uso do Navegador

## SCRIPT E PORTAS

**Script:** `node "~/.claude/chrome-manager.js"`
**Portas debug:** 9333-9399
**Debug dirs:** `~/.claude/chrome-debug-profiles/<perfil>/`

---

## REGRAS CRITICAS

### REGRA #1 — NUNCA MATAR O CHROME DO USUARIO
- `Stop-Process -Name chrome` / `killall chrome` e TERMINANTEMENTE PROIBIDO.
- Chrome do usuario e Chrome de debug sao INSTANCIAS SEPARADAS.

### REGRA #2 — PERGUNTAR PERFIL AO USUARIO
```bash
node "~/.claude/chrome-manager.js" profiles
```

### REGRA #3 — MULTI-INSTANCIA
```bash
node "~/.claude/chrome-manager.js" status          # ver portas em uso
node "~/.claude/chrome-manager.js" open --profile "PERFIL" URL  # porta livre automatico
node "~/.claude/chrome-manager.js" navigate PORTA URL           # reutilizar
node "~/.claude/chrome-manager.js" close PORTA                  # fechar
```

### REGRA #4 — VERIFICAR ANTES DE ABRIR, FECHAR SOMENTE O QUE ABRIU.

### REGRA #5 — SEMPRE NAVEGAR COM CACHE LIMPO
- Ao usar `navigate_page`, **SEMPRE** passar `ignoreCache: true` para evitar conteúdo desatualizado.
- Isso é crítico ao verificar deploys recentes, propostas atualizadas ou qualquer página que acabou de ser modificada no servidor.
- **NUNCA** confiar em resultado de página sem `ignoreCache: true` quando houve alteração recente.

---

## DETECCAO AUTOMATICA (Decision Matrix)

### Nivel 1 - Ativacao OBRIGATORIA (usar chrome-devtools SEM perguntar)

| Trigger | Acao Automatica |
|---------|-----------------|
| URL http/https mencionada | navigate_page + take_screenshot |
| localhost:porta mencionada | navigate_page + take_screenshot + list_console_messages |
| "testar", "verificar", "validar" + frontend | Fluxo completo de validacao |
| Codigo HTML/CSS criado por outro agente | Abrir no browser + validar visualmente |
| "performance", "Core Web Vitals", "velocidade" | performance_start_trace + performance_stop_trace |
| "acessibilidade", "WCAG", "a11y" | take_snapshot + evaluate_script (checks a11y) |

### Nivel 2 - Ativacao RECOMENDADA

| Trigger | Acao Recomendada |
|---------|------------------|
| "site", "website", "pagina", "navegador" | navigate_page para visualizar |
| "extrair dados de", "scraping", "coletar" | navigate_page + evaluate_script |
| "formulario", "preencher", "submeter" | fill_form + click + list_console_messages |
| "erro na pagina", "nao funciona", "bug web" | list_console_messages + list_network_requests |
| "responsivo", "mobile", "tablet" | resize_page em multiplos viewports |

---

## PRE-FLIGHT PROTOCOL (OBRIGATORIO)

```
ANTES de delegar para chrome-automation-expert:

1. VERIFICAR Chrome disponivel:
   +-- list_pages -> Chrome conectado?
   +-- SE NAO: informar usuario "Chrome precisa estar aberto"

2. VERIFICAR URL acessivel:
   +-- localhost? -> servidor rodando? (list_processes)
   +-- URL publica? -> dominio valido?
   +-- URL com auth? -> credenciais disponiveis?

3. DEFINIR objetivo claro:
   +-- O que precisa ser validado/testado/extraido?
   +-- Quais evidencias sao necessarias?
   +-- Qual o criterio de sucesso?
```

---

## CENARIOS DE USO

### Cenario A: Validacao de Frontend Criado
```
1. navigate_page -> URL do frontend
2. wait_for -> carregamento completo
3. list_console_messages -> ZERO erros
4. list_network_requests -> ZERO 4xx/5xx
5. take_screenshot -> evidencia visual desktop
6. resize_page 375x812 -> take_screenshot (mobile)
7. performance_start_trace -> interagir -> performance_stop_trace
8. evaluate_script -> verificar acessibilidade
```

### Cenario B: Debug de Aplicacao Web
```
1. navigate_page -> pagina com problema
2. wait_for -> carregamento
3. list_console_messages -> COLETAR todos erros
4. list_network_requests -> IDENTIFICAR falhas
5. evaluate_script -> estado da aplicacao
```

### Cenario C: Extracao de Dados
```
1. navigate_page -> pagina com dados
2. wait_for -> conteudo carregado
3. take_snapshot -> estrutura DOM
4. evaluate_script -> mapear e extrair dados como JSON
```

### Cenario D: Teste de Performance
```
1. navigate_page -> URL alvo
2. evaluate_script -> limpar caches
3. navigate_page -> reload (sem cache)
4. performance_start_trace -> iniciar
5. INTERAGIR: scroll, clicks, forms
6. performance_stop_trace -> metricas

THRESHOLDS:
- LCP < 2.5s (BOM), < 4.0s (MELHORAR), > 4.0s (RUIM)
- CLS < 0.1 (BOM), < 0.25 (MELHORAR), > 0.25 (RUIM)
- FCP < 1.8s (BOM), < 3.0s (MELHORAR), > 3.0s (RUIM)
```

### Cenario E: Teste de Responsividade
```
PARA CADA viewport: [1920x1080, 1366x768, 768x1024, 375x812, 360x640]
  1. resize_page -> definir viewport
  2. wait_for timeout=1000
  3. take_screenshot -> capturar
  4. evaluate_script -> verificar overflow, touch targets
```

### Cenario F: Teste de Acessibilidade
```
1. navigate_page -> pagina a testar
2. take_snapshot -> DOM completo
3. evaluate_script -> VERIFICAR:
   A. Imagens sem alt
   B. Inputs sem labels
   C. Headings fora de ordem
   D. Links sem texto acessivel
   E. Touch targets pequenos (< 44x44)
   F. Landmarks semanticas
   G. Lang do documento
   H. ARIA roles e propriedades
```

---

## FLUXO COMPLETO VIA MCP (Quick Reference)

```
 0. mcp__chrome-devtools__list_pages           -> pre-flight
 1. mcp__chrome-devtools__navigate_page        -> abrir URL
 2. mcp__chrome-devtools__wait_for             -> aguardar carregamento
 3. mcp__chrome-devtools__take_snapshot        -> inspecionar DOM
 4. mcp__chrome-devtools__take_screenshot      -> capturar visual
 5. mcp__chrome-devtools__click                -> clicar
 6. mcp__chrome-devtools__fill / fill_form     -> preencher campos
 7. mcp__chrome-devtools__list_console_messages -> verificar erros JS
 8. mcp__chrome-devtools__list_network_requests -> verificar requests HTTP
 9. mcp__chrome-devtools__evaluate_script      -> executar JS customizado
10. mcp__chrome-devtools__performance_start_trace -> iniciar medicao
11. mcp__chrome-devtools__performance_stop_trace  -> Core Web Vitals
12. mcp__chrome-devtools__resize_page          -> testar responsividade
```

---

## TRATAMENTO DE FALHAS

```
SE chrome-devtools FALHAR:

+-- Erro de conexao:
|   +-- INFORMAR usuario: "Chrome precisa estar aberto"
|   +-- CONTINUAR tarefas que nao dependem de browser
|
+-- Erro de navegacao:
|   +-- VERIFICAR URL e servidor
|   +-- RETRY 1x com wait_for timeout maior
|
+-- Erro de interacao:
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
| CSP restritivo | Usar apenas take_snapshot para inspecao |

---

## DOCUMENTACAO COMPLETA

Ver: `~/.claude/knowledge-base/CHROME-DEBUG-GUIA-COMPLETO.md`