## NUNCA DIZER "PRONTO" SEM TESTAR

**PROIBIDO** declarar conclusão sem executar e validar. Testar → verificar → só então reportar.
Se falhar → corrigir e re-testar. Se impossível testar → avisar: *"Não consegui testar porque [motivo]."*

---

## ACENTUAÇÃO PT-BR

**SEMPRE** acentuação correta em PT-BR. Sem acentos apenas em variáveis/funções (em inglês).
Windows + JSON PT-BR: usar Node.js (nunca `curl -d`). Ver § Encoding UTF-8.

---

## ESCALA DE COMPLEXIDADE — QUANDO USAR TASKS

| Nível | Tasks? | Heartbeat? | Âncora? |
|-------|--------|-----------|---------|
| Trivial (1-2 passos) | Não | Não | Não |
| Leve (3-4 passos) | Opcional | Não | Não |
| Médio (5-7 passos) | Sim | A cada 10 tool calls | Sim |
| Alto (8+ passos) | Obrigatório | A cada 10 tool calls | Sim |

Prestes a responder "pronto"? → PAUSE. TaskList. Pending? → TRABALHE.

---

## ORQUESTRADOR UNIVERSAL DE TAREFAS

**Apenas nível médio+ (5+ passos):**

**FASE 0 — ÂNCORA:** TaskCreate com pedido integral do usuário → status=completed (registro imutável). Perdeu o fio? → TaskGet na âncora.

**FASE 1 — DECOMPOR:** Extrair requisitos → max 12 tasks → classificar [P]aralela/[S]equencial/[D]ireta → mapear dependências → apresentar plano ao usuário ANTES de executar.

**FASE 2 — EXECUTAR:** Iniciar TODAS tasks independentes simultaneamente. Priorizar: desbloqueiam mais dependentes > mais simples > menor número. Após cada task: TaskUpdate completed → TaskList → próxima. Retry: 1ª clarificar, 2ª mudar abordagem, 3ª escalar, após 3 falhas: reportar.

**FASE 3 — SELF-AUDIT:** TaskList 100% completed? → TaskGet âncora → cada requisito: "Fiz? Evidência?" → faltou? → executar agora. Validar: código→testar, frontend→html_validator (score≥70, a11y≥80).

**FASE 4 — RELATÓRIO:** Resumo 1-2 frases + checklist de requisitos + entregas + validação + ressalvas.

**Anti-patterns:** Finalizar sem 100% completed | Sequenciar o que pode ser paralelo | >12 tasks | Retry infinito sem mudar abordagem | Tasks para coisas triviais | Despachar agente sem brief completo.

---

## CAMINHOS

`CLAUDE_HOME` = `~/.claude`. Temp: `~/.claude/temp/<nome-kebab-case>`.
**NUNCA** caminhos absolutos com nome de usuário. **NUNCA** deletar `.credentials.json` com sessão ativa.

---

## ROTAÇÃO AUTOMÁTICA DE CONTAS

3 contas em `~/.claude/accounts/`. Hook Stop detecta rate limit → rotaciona automaticamente.
- Status: `node accounts/status.js` | Rate limits: `node accounts/rate-limit-status.js`
- Manual: `node accounts/rotate.js` | Refresh: `node accounts/token-refresher.js`
- Re-auth: `node accounts/auth-isolated.js` | KB: `CLAUDE-CODE-ROTACAO-CONTAS-DOCUMENTACAO.md`
- **GOTCHA:** Tokens expiram ~8h. Se TODAS esgotadas → alerta Telegram, NÃO tenta rotacionar.

---

## ECONOMIA DE TOKENS

### Regras Críticas
1. **Sub-agentes:** haiku=pesquisa, sonnet=implementação, opus=arquitetura
2. **Compact proativo:** `/compact` quando contexto > 60%
3. **Grep > Read:** Buscar conteúdo com Grep, Read só com offset/limit para trechos
4. **NUNCA ler 4+ arquivos para "ver contexto"** → 1 Grep específico
5. **Git sem ruído:** env var `core.autocrlf=false` já configurada. Usar `git diff --stat | head -20`
6. **NUNCA repetir** git status/diff se fez há <5 tool calls sem edições
7. **UM diretório por projeto.** Decidir path ANTES. NUNCA sync entre dois dirs
8. **Verificar permissões ANTES.** Se não pode editar → mover PRIMEIRO
9. **CONFIAR no build.** vite/tsc OK → funciona. NÃO testar server, NÃO confirmar imports
10. **NUNCA sleep + cat task output.** Usar `run_in_background` do Bash
11. **NUNCA npm install em dir que será abandonado.** Confirmar path → depois instalar
12. **Respostas concisas.** Sem ASCII tables com bordas. Markdown simples

---

## ENCODING UTF-8 (Windows)

**NUNCA** `curl -d` com JSON PT-BR. SEMPRE Node.js:
```js
const http = require('http');
const body = JSON.stringify({ campo: 'Valor com acentuação' });
const opts = { hostname:'localhost', port:3847, path:'/api/...', method:'POST',
  headers: { 'Authorization':'Bearer local-dev-token', 'Content-Type':'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body,'utf8') }};
const req = http.request(opts, r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>console.log(d)); });
req.write(body,'utf8'); req.end();
```

---

## REGRAS GLOBAIS

- **IDIOMA:** PT-BR (respostas, comentários, commits). Variáveis em inglês.
- **LANDING PAGES:** Único `index.html` (CSS em `<style>`, JS em `<script>`).

---

## INICIALIZAÇÃO DE SESSÃO (sob demanda)

- Pendências anteriores: `node "~/.claude/session-diary/session-diary.js" latest`
- CRM/leads: `curl -s http://localhost:3847/api/crm/health`
- CRM offline: `cd ~/.claude/task-scheduler && node server.js &`

---

## KB — BUSCA OBRIGATÓRIA

**ANTES de qualquer tarefa**, buscar na KB: `node tools-cli.js search_kb query="[palavras-chave]"`
Fallback: `node "~/.claude/knowledge-base/knowledge-search.js" "[query]"` | Libs: MCP context7.
Score >50% → usar obrigatório | 20-50% → referência | <20% → prosseguir.
**Exceções:** conversas simples, ler arquivo específico, git trivial. Timeout >3s → prosseguir.

---

## PROTOCOLO DE ERRO

Bash falhou → alternativa, não repetir 3x | 5xx → retry 1x | 4xx → verificar payload | 429 → Retry-After ou 60s, 1x
Arquivo não encontrado → Glob | Agente falhou → re-despachar com brief melhorado | Contexto comprimiu → TaskList + âncora

---

## MONITORAMENTO DE ERROS (Error Learning System)

Hook `error-monitor-hook.js` roda a cada PostToolUse. Erros salvos em `~/.claude/temp/error-monitor/`.
- 3+ erros consecutivos → PARAR, ler summary, mudar abordagem
- Fim de sessão → `node ~/.claude/tools/error-learner/error-learner.js --status`
- Erro resolvido → documentar na KB imediatamente
- Regra: ERRAR → CORRIGIR → DOCUMENTAR. Erro 3x+ → adicionar regra ao CLAUDE.md

---

## PROTEÇÃO DE PROCESSOS NODE

**NUNCA** `killall node` / `pkill node`. Identificar PID: `powershell "Get-Process node | Select Id,CommandLine"`

---

## SSH — BATCH OBRIGATÓRIO

**NUNCA** múltiplas conexões SSH rápidas (fail2ban bane após ~15 em 5min).
Planejar TODOS os comandos → 1 conexão com `&&`. Edições complexas: script local → `scp` + `ssh python3 /tmp/script.py` (2 conexões max). Limite: ~10 conexões/sessão. Se banido: VNC → `fail2ban-client unban --all`.

---

## SEGURANÇA

**NUNCA logar:** tokens, API keys, senhas, PIIs. **NUNCA commitar:** `.env`, `credentials.json`, `*.pem`, `*.key`.

---

## ANTI-HALLUCINATION

Sem fonte verificável → WebSearch ou admitir: *"Não tenho informações verificadas."*
Perguntas factuais → pesquisar ANTES de responder.

---

## FERRAMENTAS (tools-cli)

**Invocação:** `node ~/.claude/task-scheduler/tools-cli.js <ferramenta> [key=value ...]`
**Listar todas:** `--list` | **Help:** `--help <ferramenta>`
**Contexto completo com 72 ferramentas:** `contexts/tools-cli-context.md`

### Regras
1. **TOOLS-CLI PRIMEIRO:** Antes de escrever script temporário, verificar se tools-cli já resolve
2. **VALIDAÇÃO HTML obrigatória:** `html_validator input="[ARQUIVO]" check_seo=true` + `node ~/.claude/frontend-analyzer/src/index.js --path "[PASTA]" --format json` (score<70 ou a11y<80 → corrigir)
3. **KB antes de qualquer tarefa:** `search_kb query="[palavras-chave]"`
4. **Capacidade do servidor antes de ops pesadas:** `ssh root@SERVIDOR "uptime && free -h && df -h /"` (load>10 ou RAM<500MB → NÃO lançar)
5. **Ações críticas → audit trail:** registrar no CRM + notificar usuário

---

## ANTI-PERDA

"pronto/concluído" → TaskList primeiro. Pending? → trabalhar.
TaskGet #1 → reler pedido → cada requisito: fiz? evidência? → faltou? → executar.

---

## EXECUÇÃO PARALELA

Max 12 tasks. Leitura: sempre paralelo. Escrita mesmo arquivo: nunca paralelo. Agentes longos: `run_in_background: true`. Max 5 simultâneos.

---

## CARREGAMENTO SOB DEMANDA

| Contexto | Arquivo | Quando |
|----------|---------|--------|
| CRM | `contexts/crm-context.md` | Leads, mensagens, financeiro |
| Tools CLI | `contexts/tools-cli-context.md` | Ferramentas CLI (72 disponíveis) |
| Credenciais | `contexts/credentials-context.md` | Vault, SSH, servidor |
| WhatsApp | `contexts/whatsapp-context.md` | Mensagens, contatos |
| MCPs | `contexts/mcp-context.md` | Chrome DevTools, desktop-commander |
| Agentes | `contexts/agents-context.md` | Delegar para especializados |
| Chrome | `contexts/protocols/chrome-protocol.md` | Automação browser |
| Validação | `contexts/protocols/validation-protocol.md` | Validar frontend/backend |
| Criativos | `contexts/protocols/criativos-protocol.md` | Motion, banners, pixel analysis |

---

## KB — CATEGORIAS

| Categoria | Docs |
|-----------|------|
| CRM | CRM-DOCUMENTACAO-COMPLETA, CRM-QUICK-REF |
| Shopify | SHOPIFY-DOCUMENTACAO-COMPLETA, SHOPIFY-LIQUID-SECTIONS-GUIA-COMPLETO |
| Ads | ADS-DASHBOARD-DOCUMENTACAO-COMPLETA |
| APIs | META-ADS-*, EVOLUTION-API-*, GOOGLE-*-API-*, WOOCOMMERCE-*, ACTIVECAMPAIGN-* |
| Infra | MEU-SERVIDOR-CYBERPANEL, GUIA-CORRECAO-SSL-*, OLS-CYBERPANEL-* |
| Marketing | CRIATIVOS-*, NEUROMARKETING-*, MARKETING-DIGITAL-* |
| Dev | FRONTEND-ANALYZER-*, LANDING-PAGE-*, FREEFRONTEND-*, MOTION-* |

---

## CRM LOCAL (porta 3847)

**Frontend:** `http://localhost:3847/` | **API:** `http://localhost:3847/api/crm` | **Auth:** `Bearer local-dev-token`
Regra: lead → buscar → criar se não existe → atualizar → registrar nota.
Tarefas pessoais → `POST /api/crm/personal-tasks` (NUNCA TaskCreate). dueDate ISO 8601: `"2026-03-12T12:00:00.000Z"`.
Financeiro → `http://localhost:3847/finance` (frontend-only, usar Chrome DevTools).

---

## CHROME DEBUG

**NUNCA** matar Chrome do usuário | Perguntar perfil | Fechar só o que abriu
**SEMPRE** `ignoreCache: true` no `navigate_page`. Modo: autoConnect (Chrome 144+).
**Contexto completo:** `contexts/protocols/chrome-protocol.md`

---

## CRIATIVOS (Estáticos, Motion, Vídeo)

Consultar KB ANTES: `search_kb query="NEUROMARKETING gatilhos mentais Meta Ads"`
Fontes mínimas Meta Ads 1080×1080: headline 56px+, body 26px+, CTA 24px.
**Protocolo completo (pixel analysis, gradientes, puppeteer):** `contexts/protocols/criativos-protocol.md`

---

## CRIAÇÃO DE PÁGINAS HTML/CSS/JS

1. KB: `search_kb query="FREEFRONTEND efeitos"` + `search_kb query="LANDING-PAGE GUIA"`
2. Paleta do cliente → `color_palette input="logo.jpg"` ou `scrape_website url="site.com"` — NUNCA estimar cores
3. **Paleta Riwer Labs (padrão):** Fundo `#0A0F1E` | Azul `#2563EB` | Ciano `#00D4FF` | Cinza `#94A3B8` | Inter
4. Validar ANTES de entregar: `html_validator` + `frontend-analyzer` (score≥70, a11y≥80)

---

## PROTOCOLOS RÁPIDOS

- **Docker:** vX.Y → vX.Y+1 (MINOR). Breaking → vX+1.0 (MAJOR)
- **CSS Overlap:** `node ~/.claude/skills/css-overlap/scripts/css-overlap.js <path> [--json] [--verbose]`. Detecta CSS sobreposto em temas Shopify. Score<50 → refatoração urgente. `--json` para integração
- **Frontend Analyzer:** `node ~/.claude/frontend-analyzer/src/index.js --path "[PATH]" --format json`
- **Motion Video:** `node ~/.claude/tools/motion-gen/motion-gen.js <html> --quality turbo --output <mp4>`. APAGAR MP3s antigos se textos mudaram. KB: `CRIATIVOS-MOTION-ADS-TOOLKIT-GUIA.md`
- **Topaz Upscale:** `topaz_enhance input="video.mp4" model=ahq-12 width=W height=H`. SEMPRE passar width/height mantendo aspect ratio
- **OpenClaw pós-restart:** `npx openclaw browser status` → start se false → `devices approve --latest`

---

## AGENTES (69 disponíveis)

> **Lista + mapeamento:** `contexts/agents-context.md`

Regra: haiku=pesquisa, sonnet=implementação, opus=arquitetura.

---

## MCPs

> **Protocolo completo:** `contexts/mcp-context.md`

chrome-devtools (screenshot/snapshot) | desktop-commander (terminal) | sequential-thinking (3+ subtarefas) | memory (grafo) | context7 (docs libs) | fetch (URLs) | **codebase-memory** (knowledge graph de código)

### Codebase Memory MCP (Knowledge Graph)

Indexa codebase inteiro em knowledge graph persistente (SQLite local). Reduz consumo de tokens em até 49x.

**Indexar projeto:** `mcp__codebase-memory__index_repository` com path do projeto
**Buscar:** `mcp__codebase-memory__search_graph` ou `search_code` — queries sub-milissegundo
**Arquitetura:** `mcp__codebase-memory__get_architecture` — visão geral sem ler arquivos
**Rastrear:** `mcp__codebase-memory__trace_call_path` — segue chamadas entre funções
**Status:** `mcp__codebase-memory__index_status` — verifica se indexação está atualizada
**Mudanças:** `mcp__codebase-memory__detect_changes` — detecta o que mudou desde última indexação

**Regras:**
1. Em projeto novo/desconhecido → indexar PRIMEIRO antes de explorar
2. Preferir `search_graph`/`search_code` sobre Grep quando buscar relações entre componentes
3. Usar `get_architecture` em vez de ler múltiplos arquivos para entender estrutura
4. Usar `trace_call_path` para debugging e análise de impacto de mudanças
5. Re-indexar após mudanças significativas (novo módulo, refactor grande)

---

## AGENT TEAMS (Experimental)

Habilitado via `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`. Diferente de sub-agentes — teammates conversam entre si sem intermediário.

**Quando usar:** Projetos complexos que precisam de coordenação multi-especialista (frontend+backend+QA, design+dev+review).
**Quando NÃO usar:** Tarefas simples, pesquisa rápida, single-file edits — usar sub-agentes normais.

**Ferramentas:** `TeamCreate` (criar equipe), `TeamDelete` (desmontar), `SendMessage` (comunicar).
**Custo:** Cada teammate consome context window próprio — usar com parcimônia.

---

## SKILLS INSTALADAS

**GSD** (`/gsd:*`): Framework spec-driven. Principais: `/gsd:new-project`, `/gsd:plan-phase`, `/gsd:execute-phase`, `/gsd:autonomous`, `/gsd:progress`, `/gsd:help`.

**UI/UX Pro Max** (`/ui-ux-pro-max`): Design intelligence. Sub-skills: `/design`, `/design-system`, `/ui-styling`, `/banner-design`, `/brand`, `/slides`.

**Shopify** (`/liquid-lint`, `/theme-check`, `/css-overlap`): Validação de temas Shopify.
- `/liquid-lint [arquivo.liquid]` — Sintaxe, filtros deprecados, performance, a11y. Score 0-100.
- `/theme-check [diretório]` — Auditoria completa OS 2.0 (8 categorias). Score ponderado.
- `/css-overlap [diretório-assets]` — Detecta CSS sobreposto entre arquivos. Script: `node ~/.claude/skills/css-overlap/scripts/css-overlap.js <path> [--json] [--verbose]`
- **Ordem ideal:** `/liquid-lint` → `/css-overlap` → `/theme-check`

### Mapeamento Skills → Agentes

Skills são pré-carregadas nos agentes via `skills:` no frontmatter. Agentes com skills:

| Agente | Skills |
|--------|--------|
| shopify-theme-expert | liquid-lint, theme-check, css-overlap |
| shopify-liquid-expert | liquid-lint, theme-check, css-overlap |
| shopify-fullstack-specialist | liquid-lint, theme-check, css-overlap |
| css-master | ui-styling, design, design-system, css-overlap |
| html5-guru | ui-styling, design, design-system |
| frontend-testing-expert | ui-styling, design |
| gsd-ui-researcher | ui-styling, design-system |
| gsd-ui-auditor | ui-styling, design-system |
| meta-ads-optimizer | banner-design, brand |
| content-writer | banner-design, brand, slides |
| email-marketing-specialist | brand |
| architecture-architect | design-system |
| data-analyst | slides |

---

## COMANDOS

`/auto` orquestrador paralelo | `/aprender` analisa erros e persiste lições na KB

---

## PROMPT MANAGER — DETECÇÃO AUTOMÁTICA

Se tarefa menciona "analisar", "relatório", "briefing", "SEO", "Meta Ads", "campanha" → verificar prompts salvos:
`curl -s http://localhost:3847/api/prompt-templates -H "Authorization: Bearer local-dev-token"` (timeout 1.5s, ignorar se falhar).
Match → informar nome + variáveis → perguntar se quer usar. NUNCA bloquear a tarefa.

---

## FIM DE SESSÃO

Antes de encerrar → EXECUTAR `/aprender` PRIMEIRO.
Session diary: `node "~/.claude/session-diary/session-diary.js" write --project "nome" --summary "..." --pending "..." --decisions "..."`

---

## AÇÕES QUE EXIGEM CONFIRMAÇÃO

**Comunicação (NUNCA sem aprovação):** WhatsApp, E-mail, Telegram → mostrar destinatário + conteúdo → aguardar "sim". Exceção: notificações internas.

**Ações críticas:** Deletar arquivos/dados, pausar campanhas, alterar preços, registros financeiros, trades live, git push, DNS/SSL/servidor, operações irreversíveis.
