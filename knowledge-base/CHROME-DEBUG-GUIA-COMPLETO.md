# Chrome Debug — Guia Completo de Uso com Claude Code

**Ultima atualizacao:** 2026-02-25
**Script:** `C:\Users\sabola\.claude\chrome-manager.js`

---

## 1. Visao Geral

O Claude Code pode controlar o Google Chrome via Chrome DevTools Protocol (CDP) para:
- Capturar screenshots de paginas web
- Executar JavaScript no contexto da pagina
- Navegar, preencher formularios, extrair dados
- Debugar aplicacoes frontend em desenvolvimento

### Principio Fundamental
**Cada instancia do Claude Code usa sua propria porta debug e diretorio de dados.**
Nunca duas instancias compartilham o mesmo Chrome debug.

---

## 2. Chrome Manager — Script Utilitario

### Localizacao
```
C:\Users\sabola\.claude\chrome-manager.js
```

### Comandos

| Comando | Descricao |
|---------|-----------|
| `profiles` | Lista os 16 perfis do Chrome com nome e email |
| `status` | Mostra quais portas debug (9333-9399) estao ativas |
| `open [URL]` | Lista perfis para escolha |
| `open --profile "X" --port PORTA [URL]` | Abre Chrome com perfil e porta especificos |
| `close [PORTA]` | Fecha instancia debug via CDP |
| `navigate PORTA URL` | Navega aba existente para nova URL |

### Exemplos de Uso

```bash
# Ver perfis disponiveis
node "C:\Users\sabola\.claude\chrome-manager.js" profiles

# Ver portas ativas
node "C:\Users\sabola\.claude\chrome-manager.js" status

# Abrir com perfil especifico
node "C:\Users\sabola\.claude\chrome-manager.js" open --profile "Pinha" http://localhost:3847

# Abrir em porta especifica (quando outra instancia ja usa 9333)
node "C:\Users\sabola\.claude\chrome-manager.js" open --profile "Default" --port 9444 https://google.com

# Navegar em instancia existente
node "C:\Users\sabola\.claude\chrome-manager.js" navigate 9333 http://localhost:3000

# Fechar instancia
node "C:\Users\sabola\.claude\chrome-manager.js" close 9333
```

---

## 3. Perfis do Chrome

O usuario possui 16 perfis configurados no Chrome, cada um com credenciais e sessoes proprias:

| # | Diretorio | Nome | Email |
|---|-----------|------|-------|
| 1 | Profile 8 | Alisson | — |
| 2 | Profile 6 | dropkite.com.br | contato@dropkite.com.br |
| 3 | Profile 25 | garobeauty.com | contato@garobeauty.com |
| 4 | Profile 18 | Gauja | gaujalab@gmail.com |
| 5 | Profile 7 | Julia | fontana.juliac@gmail.com |
| 6 | Profile 27 | Matheus Marques | — |
| 7 | Profile 26 | Nort | nortmarketingdigital@gmail.com |
| 8 | Default | O seu Chrome (Rafael) | tondinrafael@gmail.com |
| 9 | Profile 5 | Pinha | pinhaoriginals@gmail.com |
| 10 | Profile 16 | Rafael | rafaeltondinnutricionista@gmail.com |
| 11 | Profile 21 | Raiana | — |
| 12 | Profile 11 | RIWER LABS | — |
| 13 | Profile 2 | Rodosul | rodosulmarketing@gmail.com |
| 14 | Profile 12 | Sul | suletiquetas.vendas@gmail.com |
| 15 | Profile 15 | Sulmig | sulmigmaquinas@gmail.com |
| 16 | Profile 3 | TAKE | takebagoficial@gmail.com |

### Quando usar qual perfil?
- **Shopify Fiber (Oficial):** Default (tondinrafael@gmail.com) ou RIWER LABS
- **Shopify Pinha:** Profile 5 (Pinha — pinhaoriginals@gmail.com)
- **Meta Ads / Facebook:** Default ou RIWER LABS
- **Google Search Console:** Default (tondinrafael@gmail.com)
- **Clientes especificos:** Usar o perfil do cliente correspondente

### IMPORTANTE — Credenciais nos Perfis Debug
- O Chrome NAO compartilha cookies entre perfis (criptografia DPAPI).
- Na PRIMEIRA vez que usar um perfil debug, o usuario precisara logar nos sites.
- Apos o primeiro login, a sessao persiste no diretorio de debug.
- Diretorios de debug ficam em: `C:\Users\sabola\.claude\chrome-debug-profiles\<nome-perfil>\`

---

## 4. Multi-Instancia — Regras

### Problema
Quando ha 2+ janelas do Claude Code abertas, elas podem tentar usar o mesmo Chrome debug, causando conflito.

### Solucao: Portas Isoladas

| Instancia | Porta Padrao |
|-----------|-------------|
| Claude Code #1 | 9333 |
| Claude Code #2 | 9334 |
| Claude Code #3 | 9335 |
| ... | ... |
| Maximo | 9399 (67 portas) |

### Protocolo Obrigatorio

**ANTES de abrir qualquer Chrome debug:**

```bash
# 1. Verificar portas em uso
node "C:\Users\sabola\.claude\chrome-manager.js" status

# 2. Abrir em porta LIVRE (o script encontra automaticamente)
node "C:\Users\sabola\.claude\chrome-manager.js" open --profile "PERFIL" URL
```

**OU manualmente:**

```bash
# 1. Checar se porta 9333 esta livre
curl -s http://localhost:9333/json/version 2>/dev/null && echo "EM_USO" || echo "LIVRE"

# 2. Se 9333 em uso, tentar 9334, 9335, etc.
curl -s http://localhost:9334/json/version 2>/dev/null && echo "EM_USO" || echo "LIVRE"

# 3. Abrir na porta livre encontrada
"C:/Program Files/Google/Chrome/Application/chrome.exe" \
  --remote-debugging-port=9334 \
  "--user-data-dir=C:/Users/sabola/.claude/chrome-debug-profiles/meu-perfil" \
  --no-first-run --no-default-browser-check "URL" &
```

### NUNCA fazer:
- Usar `Stop-Process -Name chrome` (mata TODAS as janelas do Chrome, incluindo as do usuario)
- Abrir duas instancias na mesma porta
- Usar o `--user-data-dir` padrao do Chrome (bloqueia debug)
- Assumir que porta 9333 esta livre sem checar

---

## 5. Perguntar ao Usuario

### Quando perguntar qual perfil?
- **SEMPRE** que precisar abrir o Chrome para acessar sites autenticados
- **SEMPRE** na primeira vez de uma sessao que precisa de navegador
- **NAO PERGUNTAR** se ja tem uma instancia debug ativa (reutilizar)
- **NAO PERGUNTAR** se o contexto deixa claro qual perfil usar (ex: "abre a loja da Pinha" → Profile 5)

### Formato da pergunta:
```
Preciso abrir o Chrome para [MOTIVO].
Qual perfil devo usar?

Perfis disponiveis:
1. O seu Chrome (Rafael) — tondinrafael@gmail.com
2. Pinha — pinhaoriginals@gmail.com
3. RIWER LABS
4. [outros relevantes ao contexto]
```

### Logica de deducao automatica:
| Contexto | Perfil |
|----------|--------|
| Shopify Pinha / pinha | Profile 5 (Pinha) |
| Meta Ads / Facebook Ads | Default ou RIWER LABS |
| Google / Search Console | Default |
| Desenvolvimento local | Qualquer (nao precisa perguntar) |
| Loja de cliente X | Perfil do cliente X |

---

## 6. Fluxo Completo — Abrindo Chrome Debug

```
1. PRECISA DO CHROME?
   │
   ├─ Verificar portas: node chrome-manager.js status
   │   ├─ Tem instancia ativa que serve? → REUTILIZAR (navigate)
   │   └─ Nao tem / precisa perfil diferente → ABRIR NOVA
   │
   ├─ ABRIR NOVA INSTANCIA:
   │   ├─ Contexto indica perfil? → Usar automaticamente
   │   └─ Ambiguo? → PERGUNTAR ao usuario
   │       │
   │       └─ node chrome-manager.js open --profile "PERFIL" --port PORTA URL
   │
   ├─ AGUARDAR INICIALIZACAO:
   │   └─ curl -s http://localhost:PORTA/json/version (retry ate 10s)
   │
   └─ USAR INSTANCIA:
       ├─ CDP via WebSocket (screenshots, navegacao, JS)
       ├─ Playwright/Puppeteer com connectOverCDP
       └─ Ou via chrome-devtools MCP
```

---

## 7. Reutilizar Instancia Existente

Quando ja existe uma instancia debug rodando:

```bash
# Navegar para nova URL na aba existente
node "C:\Users\sabola\.claude\chrome-manager.js" navigate 9333 http://nova-url.com

# Ou via CDP direto — criar nova aba
curl -s "http://localhost:9333/json/new?http://nova-url.com"

# Listar abas abertas
curl -s http://localhost:9333/json
```

---

## 8. Troubleshooting

### Chrome nao abre com debug
- Verificar se o caminho do Chrome esta correto
- Garantir que `--user-data-dir` NAO aponta para o perfil padrao
- Fechar qualquer Chrome debug anterior na mesma porta

### Porta em uso por outra instancia
```bash
# Ver qual processo usa a porta
powershell -Command "Get-NetTCPConnection -LocalPort 9333 | Select-Object OwningProcess"
# Ver detalhes do processo
powershell -Command "Get-Process -Id PID | Select-Object ProcessName,Path"
```

### Sessao expirou / precisa logar novamente
- Normal no primeiro uso de cada perfil debug
- Usuario loga UMA VEZ, sessao persiste no diretorio debug
- Se sessao expirar, pedir ao usuario para logar de novo

### Conflito entre instancias Claude Code
```bash
# Ver TODAS as instancias debug ativas
node "C:\Users\sabola\.claude\chrome-manager.js" status
# Fechar a que nao precisa mais
node "C:\Users\sabola\.claude\chrome-manager.js" close PORTA
```

---

## 9. Diretorios de Debug

```
C:\Users\sabola\.claude\chrome-debug-profiles\
  ├── default\           → Debug do perfil "O seu Chrome"
  ├── pinha\             → Debug do perfil "Pinha"
  ├── riwer-labs\        → Debug do perfil "RIWER LABS"
  ├── take\              → Debug do perfil "TAKE"
  └── [outros]\          → Criados sob demanda
```

Cada diretorio contem o estado completo do Chrome debug daquele perfil (cookies, localStorage, etc).

---

## 10. Referencia Rapida

```bash
# Listar perfis
node "C:\Users\sabola\.claude\chrome-manager.js" profiles

# Ver portas ativas
node "C:\Users\sabola\.claude\chrome-manager.js" status

# Abrir (pergunta perfil)
node "C:\Users\sabola\.claude\chrome-manager.js" open http://localhost:3847

# Abrir com perfil especifico
node "C:\Users\sabola\.claude\chrome-manager.js" open --profile "Pinha" --port 9333 URL

# Navegar
node "C:\Users\sabola\.claude\chrome-manager.js" navigate 9333 URL

# Fechar
node "C:\Users\sabola\.claude\chrome-manager.js" close 9333
```

---

## 11. Usar Perfil Real do Chrome com Remote Debugging (Login Preservado)

> **PROBLEMA:** Chrome 136+ proíbe `--remote-debugging-port` no user-data-dir padrão (segurança).
> Usar `--user-data-dir` separado quebra DPAPI → cookies/login não funcionam.
> Junction e subst também falham (Chrome usa o caminho resolvido na criptografia).

> **SOLUÇÃO DEFINITIVA:** Usar **`chrome://inspect/#remote-debugging`** (Chrome 144+) + **Chrome DevTools MCP com `--autoConnect`**. Não precisa de `--user-data-dir` separado. O Chrome abre normal com o perfil real e o MCP conecta via pipe interno.

### Método A — autoConnect via chrome://inspect (RECOMENDADO)

**Requisito:** Chrome 144+ (funciona no Chrome 145 atual)

**1. Abrir Chrome normalmente com o perfil desejado**

```bash
# Via chrome-manager
node chrome-manager.js open --profile "Gauja" URL

# Ou diretamente (NÃO precisa fechar Chrome existente)
"C:\Program Files\Google\Chrome\Application\chrome.exe" --profile-directory="Profile 18" URL
```

**2. No Chrome, habilitar remote debugging (uma vez por sessão)**

- Navegar para: `chrome://inspect/#remote-debugging`
- Clicar para **habilitar** conexões de debugging remoto
- O Chrome exibirá: "Server running at: 127.0.0.1:9222"

> **NOTA:** A porta 9222 mostrada NÃO responde via curl/TCP — é um pipe interno do Chrome. Só o chrome-devtools-mcp com `--autoConnect` consegue conectar.

**3. Conectar via Chrome DevTools MCP**

```bash
# Adicionar MCP ao Claude Code (uma vez)
claude mcp add --transport stdio chrome-devtools -- npx -y chrome-devtools-mcp@latest --autoConnect --channel=stable

# Reiniciar Claude Code para carregar o MCP
```

**4. Usar no Claude Code**

Após reiniciar, as ferramentas do chrome-devtools-mcp ficam disponíveis automaticamente:
- `navigate_to_url`, `take_screenshot`, `click_element`, `fill_input`, etc.
- O Chrome mostrará: "Chrome is being controlled by automated test software"

### Método B — Perfil debug persistente (alternativa)

Se não quiser usar autoConnect, criar perfil debug separado e logar **uma vez**:

```bash
# Fechar Chrome → abrir com perfil debug persistente
node chrome-manager.js open --profile "gauja-debug" --port 9333 URL

# Logar com gaujalab@gmail.com na primeira vez
# Nas próximas vezes o login persiste no diretório debug
```

### Mapeamento de perfis → profile-directory

| Nome | Email | Profile Directory |
|------|-------|-------------------|
| O seu Chrome | tondinrafael@gmail.com | Default |
| Gauja | gaujalab@gmail.com | Profile 18 |
| Pinha | pinhaoriginals@gmail.com | Profile 5 |
| TAKE | takebagoficial@gmail.com | Profile 3 |
| RIWER LABS | — | Profile 11 |
| Julia | fontana.juliac@gmail.com | Profile 7 |

> Para listar todos: `node chrome-manager.js profiles`

### O que NÃO funciona (Chrome 136+)

| Abordagem | Erro | Por quê |
|-----------|------|---------|
| `--remote-debugging-port` + user-data-dir padrão | "requires a non-default data directory" | Bloqueio de segurança do Chrome 136+ |
| `--user-data-dir` separado (cópia de perfil) | "Failed to decrypt" DPAPI | Chave de criptografia vinculada ao caminho original |
| Junction (mklink /J) para user-data-dir real | "Failed to decrypt" DPAPI | Chrome resolve o caminho e detecta diferença |
| Subst (drive virtual Z:) | "Failed to decrypt" DPAPI | Mesmo problema que junction |
| Nome curto 8.3 (USERDA~1) | "Failed to decrypt" DPAPI | Chrome normaliza o caminho |

### REGRAS

1. **Método A (autoConnect) é o padrão** — Perfil real, login preservado, sem fechar Chrome
2. **Método B (debug persistente) para quando autoConnect não funcionar** — Requer logar uma vez
3. **NUNCA tentar junction/subst/cópia** para preservar login — Chrome 136+ DPAPI impede
4. **Perguntar ao usuário qual perfil** antes de abrir
5. **chrome://inspect habilitar uma vez por sessão** — O toggle não persiste entre reinícios do Chrome

---

## Lições Aprendidas (Auto-gerado por /aprender)

> Seção atualizada automaticamente. Consultar ANTES de executar tarefas relacionadas.

### 2026-03-12 - Chrome 136+ impede debug com perfil real via --user-data-dir
**Contexto:** Usuário pediu para usar Chrome com perfil Gauja (gaujalab@gmail.com) já logado + remote debugging
**Erros tentados:** (1) chrome-manager debug dir separado → sem login; (2) --user-data-dir real → "requires non-default"; (3) junction → DPAPI "Failed to decrypt"; (4) subst drive → DPAPI falha; (5) nome curto 8.3 → DPAPI falha
**Solução:** Usar `chrome://inspect/#remote-debugging` (Chrome 144+) + Chrome DevTools MCP com `--autoConnect`. O Chrome abre normal com perfil real, habilita debug via UI, e o MCP conecta via pipe interno sem precisar de --user-data-dir alternativo.
**Regra:** NUNCA usar junction/subst/cópia para debug com login. SEMPRE usar chrome://inspect + autoConnect para perfis reais. Configurar: `claude mcp add --transport stdio chrome-devtools -- npx -y chrome-devtools-mcp@latest --autoConnect`

### 2026-03-12 - Gemini: wait_for deve usar texto exato em PT-BR
**Contexto:** Gerando imagens no Gemini via Chrome DevTools MCP, aguardando conclusão da geração
**Erro:** `wait_for` com textos ["Gerar mais", "Download", "Salvar"] causou timeout de 120s. Os textos não correspondem à UI real do Gemini em PT-BR.
**Solução:** O texto correto do botão de download no Gemini é `"Baixar imagem"` (presente em "Baixar imagem no tamanho original"). Usar `wait_for` com `["Baixar imagem"]`.
**Regra:** Ao usar wait_for no Gemini, SEMPRE usar `["Baixar imagem"]` como texto de espera. A UI do Gemini em PT-BR usa "Baixar", não "Download".

### 2026-03-12 - Gemini: botão "Nova conversa" abre sidebar primeiro
**Contexto:** Após gerar imagem no Gemini, clicar no link "Nova conversa" (uid do nav) para iniciar novo prompt
**Erro:** Clicar no link "Nova conversa" na navegação principal abriu o menu lateral (sidebar) em vez de navegar diretamente. Foi necessário um segundo clique no "Nova conversa" dentro da sidebar.
**Solução:** Navegar diretamente via URL `https://gemini.google.com/app` é mais confiável do que clicar no link "Nova conversa". Ou fechar a sidebar antes com o botão "Menu principal".
**Regra:** Para nova conversa no Gemini, preferir `navigate_page` para `https://gemini.google.com/app` em vez de clicar em links internos.

### 2026-03-12 - Gemini via browser é lento para batch de imagens
**Contexto:** Geração de 10 imagens BetPredict via Gemini no navegador (Chrome DevTools MCP)
**Erro:** Cada imagem leva ~1-2 min para gerar + tempo de navegação/download. Para 10 imagens = ~20 min. Processo manual e sujeito a falhas de UI.
**Solução:** Para batch de imagens, usar o Nano Banana Pro CLI (`node ~/.claude/tools/nano-banana-cli.js batch`) que usa a API diretamente, é mais rápido (~10-15s por imagem) e automatiza o salvamento com nomes corretos.
**Regra:** Para gerar 3+ imagens, SEMPRE sugerir Nano Banana Pro CLI (API) como alternativa mais eficiente ao Gemini via browser. Browser só para geração unitária ou quando o usuário pedir explicitamente.
