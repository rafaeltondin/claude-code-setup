---
title: "Claude Code — Sistema de Rotacao Automatica de Contas"
category: "Infraestrutura"
tags: [claude-code, accounts, rotation, rate-limit, hooks, oauth]
topic: "claude-code-account-rotation"
priority: high
version: "1.0.0"
last_updated: "2026-03-24"
---

# Claude Code — Sistema de Rotacao Automatica de Contas

> Sistema para rotacionar automaticamente entre 3 assinaturas Claude Code (Max/Pro)
> quando uma atinge o limite de uso. Funciona via hooks sem perder a sessao.

---

## Arquitetura

```
~/.claude/
  accounts/
    account-1.json        <- credenciais conta 1 (gaujalab@gmail.com, Max)
    account-2.json        <- credenciais conta 2 (tondinrafael@gmail.com, Max)
    account-3.json        <- credenciais conta 3 (rafaeltondinnutricionista@gmail.com, Pro)
    current.txt           <- "1", "2" ou "3" (conta ativa)
    rotate.js             <- v2: rotaciona, verifica token, tenta refresh, sync creds
    setup.js              <- configura novas contas (interativo)
    auth-isolated.js      <- v2: auth com HOME isolado, PowerShell para Chrome
    token-refresher.js    <- NEW: refresh preventivo (--check, --daemon, por conta)
    monitor.js            <- v2: monitor + refresh preventivo a cada 6h + sync creds
    status.js             <- v2: horas restantes, emails, health check geral
    rotate.log            <- historico de rotacoes (max 50 entradas)
    refresher.log         <- historico de refreshes
  hooks/
    account-rotate-hook.js  <- hook duplo (Stop + UserPromptSubmit)
```

## Fluxo Automatico

```
Rate limit atingido
  -> Hook Stop detecta (stop_reason / transcript / history.jsonl)
  -> Escreve rate-limited.flag
  -> Chama rotate.js imediatamente
  -> Proxima mensagem: Hook UserPromptSubmit verifica flag (backup)
  -> .credentials.json trocado para proxima conta
  -> Sessao continua sem interrupcao
  -> Notificacao Telegram enviada
```

## Ordem de Rotacao

`1 -> 2 -> 3 -> 1 -> ...`

## Deteccao de Rate Limit

Padroes monitorados pelo hook:
- `stop_reason`: rate_limit_exceeded, usage_limit_exceeded, overloaded, error
- Transcript: "usage limit", "rate limit", "quota exceeded", "too many requests", "529"
- Mensagem real observada: `"You've hit your limit · resets 3pm (America/Bahia)"`
- history.jsonl: ultimas 3-5 linhas verificadas como fallback

## Comandos Manuais

```bash
# Rotacionar agora
node "C:\Users\sabola\.claude\accounts\rotate.js"

# Ver status
node "C:\Users\sabola\.claude\accounts\status.js"

# Monitor background (opcional, verifica a cada 60s)
node "C:\Users\sabola\.claude\accounts\monitor.js"

# Configurar nova conta
node "C:\Users\sabola\.claude\accounts\setup.js"
```

## Como Re-autenticar Contas

### Metodo automatizado (auth-isolated.js)
```bash
# Todas as contas (1-3)
node "$env:USERPROFILE\.claude\accounts\auth-isolated.js"
# Apenas conta 2
node "$env:USERPROFILE\.claude\accounts\auth-isolated.js" 2
```

### Metodo manual (URL + cola codigo)
```bash
# No bash do Claude Code:
mkdir -p ~/.claude/temp/auth-isolated/account-N/.claude
HOME=~/.claude/temp/auth-isolated/account-N USERPROFILE=~/.claude/temp/auth-isolated/account-N claude auth login --email EMAIL > ~/.claude/temp/auth-url-N.txt 2>&1 &
# Copiar URL do arquivo, colar no Chrome no perfil correto
# Apos "You're all set up", copiar credenciais:
cp ~/.claude/temp/auth-isolated/account-N/.claude/temp/auth-isolated/account-N/.claude/.credentials.json ~/.claude/accounts/account-N.json
```

### GOTCHA: path aninhado no Windows
Quando HOME override e usado no Windows, as credenciais sao salvas em path DUPLICADO:
`~/.claude/temp/auth-isolated/account-N/.claude/temp/auth-isolated/account-N/.claude/.credentials.json`
(nao em `~/.claude/temp/auth-isolated/account-N/.claude/.credentials.json`)

## Refresh Preventivo de Tokens

```bash
# Health check rapido
node accounts/token-refresher.js --check
# Refresh todas as contas
node accounts/token-refresher.js
# Refresh apenas conta 2
node accounts/token-refresher.js 2
# Daemon (refresh a cada 6h)
node accounts/token-refresher.js --daemon
```

Tokens expiram em ~8h. O refresher tenta renovar quando faltam <2h.
Monitor.js integra refresh automatico a cada 6h.

**NUNCA** deletar .credentials.json diretamente — desloga a sessao ativa.

## Credenciais

Cada `account-N.json` contem:
```json
{
  "claudeAiOauth": {
    "accessToken": "sk-ant-oat01-...",
    "refreshToken": "sk-ant-ort01-...",
    "expiresAt": 1774400511583,
    "subscriptionType": "pro|max",
    "rateLimitTier": "default_claude_ai"
  }
}
```

## Hooks Registrados (settings.json)

- `UserPromptSubmit[0]` → `account-rotate-hook.js` (verifica flag, rotaciona antes da mensagem)
- `Stop[0]` → `account-rotate-hook.js` (detecta rate limit, escreve flag, rotaciona)

---

## Licoes Aprendidas

### 2026-03-24 - Rate limit real durante teste
**Contexto:** Testando sistema de rotacao, conta 1 (Pro) atingiu limite
**Descoberta:** Mensagem exata: "You've hit your limit · resets 3pm (America/Bahia)" + "API Error: Rate limit reached"
**Aprendizado:** O sistema funcionou — rotacao para conta 2 (Max) foi transparente
**Regra:** Conta Max tem mais capacidade que Pro. Priorizar Max como fallback principal.

### 2026-03-26 - OAuth URL mudou de claude.ai para claude.com
**Contexto:** Re-autenticacao de 3 contas com tokens expirados
**Erro:** Regex no auth-isolated.js v1 usava `claude.ai/oauth/authorize`, mas URL real agora e `claude.com/cai/oauth/authorize`
**Solucao:** Regex atualizado para `claude\.(?:ai|com)\/(?:oauth\/authorize|cai\/oauth\/authorize)`
**Regra:** URL OAuth do Claude Code e `https://claude.com/cai/oauth/authorize`. Manter regex flexivel para ambos dominios.

### 2026-03-26 - cmd.exe `start` abre IE em vez do Chrome
**Contexto:** auth-isolated.js tentava abrir Chrome com `execSync('start "" chrome.exe ...')`
**Erro:** O comando `start` no Windows abre o browser padrao (IE/Edge) quando Chrome nao esta no PATH exato
**Solucao:** Usar PowerShell: `powershell.exe -Command "Start-Process 'C:\Program Files\Google\Chrome\Application\chrome.exe' -ArgumentList '...'"`
**Regra:** Para abrir Chrome com perfil especifico no Windows, SEMPRE usar PowerShell Start-Process com caminho completo. NUNCA cmd.exe start.

### 2026-03-26 - Refresh token nao funciona via API direta
**Contexto:** Tentativa de renovar tokens expirados via POST ao endpoint OAuth
**Erro:** Cloudflare bloqueia chamadas diretas ao token endpoint (403 "Just a moment")
**Solucao:** Usar `claude auth status` (CLI) que faz refresh internamente, ou re-autenticar via browser
**Regra:** NUNCA tentar refresh token via HTTP direto. Usar CLI do Claude Code ou re-auth completa.

### 2026-03-26 - Processo auth morto nao captura callback
**Contexto:** Iniciar `claude auth login` em background com timeout, usuario autentica depois
**Erro:** O processo auth morre antes do usuario completar o login no browser. Callback vai para localhost que nao esta mais ouvindo.
**Solucao:** Manter processo auth vivo ate o usuario completar. Ou: gerar URL, dar ao usuario, usuario autentica, processo captura.
**Regra:** O processo `claude auth login` DEVE estar rodando quando o callback chega. Se morrer, gerar nova URL.
