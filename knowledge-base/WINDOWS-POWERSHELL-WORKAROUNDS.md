---
title: "Windows e PowerShell — Workarounds e Licoes Aprendidas"
category: "Infraestrutura"
tags: [windows, powershell, bash, terminal, scripts, otimizacao]
topic: "windows-powershell"
priority: high
version: "1.0.0"
last_updated: "2026-03-12"
---

# Windows e PowerShell — Workarounds e Licoes Aprendidas

> Documento auto-gerado por `/aprender`. Contém soluções para erros recorrentes ao executar
> comandos PowerShell via Bash tool no Claude Code (Windows 11).
> **Consultar OBRIGATORIAMENTE antes de executar scripts PowerShell via terminal.**

---

## Regra de Ouro

**NUNCA usar `powershell -Command "..."` com `$_` ou calculated properties.**
**SEMPRE escrever scripts em arquivos `.ps1` e executar com `powershell -File`.**

---

## Erros e Solucoes

### 2026-03-12 — `$_` em PowerShell inline quebra via Bash (extglob)

**Contexto:** Executar comandos PowerShell com `Where-Object { $_.Prop }`, `ForEach-Object { $_.X }` ou calculated properties `@{N='x';E={$_.Y}}` via `powershell -Command "..."` no Bash tool.

**Erro:** Bash interpreta `$_` como variável bash ou extglob pattern, causando erros como:
```
Token 'extglob.Name' inesperado na expressão
')' ausente na chamada do método
A cadeia de caracteres não tem o terminador
```

**Solução:** Escrever o script em arquivo `.ps1` e executar com `-File`:
```bash
# ERRADO — quebra com $_
powershell -Command "Get-Process | Where-Object { $_.Name -like '*chrome*' }"

# CORRETO — escrever no arquivo primeiro
# Write script to C:/Users/sabola/.claude/meu_script.ps1
# Then:
powershell -ExecutionPolicy Bypass -File "C:/Users/sabola/.claude/meu_script.ps1"
```

**Regra:** NUNCA usar `$_` em `powershell -Command`. Sempre escrever arquivo `.ps1` com Write tool e executar com `powershell -File`.

---

### 2026-03-12 — Limpar %TEMP% apaga os arquivos de output do Claude

**Contexto:** Executar script PowerShell que deleta `%TEMP%` enquanto o Bash tool aguarda output. Claude Code armazena outputs de comandos em `%TEMP%\claude\...`.

**Erro:** Após limpar `%TEMP%`, o Bash tool retorna:
```
bash output unavailable: output file C:\Users\...\AppData\Local\Temp\claude\...\tasks\xxx.output
could not be read (ENOENT)
```

**Solução:** Salvar output em arquivo fora do Temp e rodar em background:
```bash
# ERRADO — output some junto com o Temp
powershell -File "C:/Users/sabola/.claude/limpeza.ps1"

# CORRETO — redirecionar output para fora do Temp
powershell -File "C:/Users/sabola/.claude/limpeza.ps1" > "C:/Users/sabola/.claude/resultado.txt" 2>&1 &
# Aguardar e ler:
sleep 30 && powershell -Command "Get-Content 'C:/Users/sabola/.claude/resultado.txt'"
```

Dentro do script `.ps1`, usar `Add-Content $log $msg` em vez de `Write-Host` para garantir persistência.

**Regra:** Ao limpar `%TEMP%`, SEMPRE redirecionar output para `~/.claude/resultado.txt` e usar `run_in_background: true` ou `&`. Nunca depender do output direto do Bash quando o script limpa Temp.

---

### 2026-03-12 — Ollama nao suporta desinstalacao silenciosa com /S

**Contexto:** Tentar desinstalar Ollama silenciosamente via script PowerShell com flag `/S`.

**Erro:** O uninstaller do Ollama abre janela GUI e trava o script indefinidamente:
```powershell
Start-Process $uninstaller.FullName -ArgumentList "/S" -Wait  # TRAVA
```

**Solução:** Matar o processo Ollama e deletar as pastas diretamente:
```powershell
# Parar processo
Get-Process | Where-Object { ... } # via ps1 file

# Deletar pastas diretamente (muito mais rapido)
Remove-Item "$env:USERPROFILE\.ollama" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "$env:LOCALAPPDATA\Programs\Ollama" -Recurse -Force -ErrorAction SilentlyContinue

# Remover do startup
Remove-Item "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\Ollama.lnk" -Force
```

**Regra:** Para desinstalar Ollama, NUNCA usar o uninstaller. Matar processo + deletar `~/.ollama` (modelos) e `$LOCALAPPDATA\Programs\Ollama` (app).

---

### 2026-03-12 — Aspas curvas/inteligentes em arquivos .ps1 causam erro de parser

**Contexto:** Escrever arquivo `.ps1` com aspas "inteligentes" (curvas) via Write tool.

**Erro:**
```
A cadeia de caracteres não tem o terminador: "
TerminatorExpectedAtEndOfString
```

**Solução:** Usar SEMPRE aspas ASCII retas `"` e `'` em arquivos PowerShell. Nunca `"` ou `"`.

**Regra:** Ao escrever arquivos `.ps1`, verificar se há aspas curvas no conteúdo. Usar apenas aspas ASCII retas.

---

### 2026-03-12 — `-Verb RunAs -WindowStyle Hidden` oculta o prompt UAC

**Contexto:** Executar script com privilégios de administrador via:
```powershell
Start-Process powershell -Verb RunAs -WindowStyle Hidden -Wait
```

**Erro:** O prompt UAC (Controle de Conta de Usuario) fica invisível para o usuário. O script nunca executa e o arquivo de output não é criado.

**Solução:** Usar `-Verb RunAs` SEM `-WindowStyle Hidden` para que o UAC seja visível:
```powershell
# ERRADO — UAC invisivel
Start-Process powershell -ArgumentList "-File script.ps1" -Verb RunAs -WindowStyle Hidden -Wait

# CORRETO — UAC aparece para o usuario clicar Sim
Start-Process powershell -ArgumentList "-File script.ps1" -Verb RunAs -Wait

# ALTERNATIVA — usar arquivo .bat que o usuario pode clicar com botao direito "Executar como administrador"
# Criar .bat e instruir o usuario a executar como admin
```

**Regra:** Para scripts que requerem admin, NUNCA usar `-WindowStyle Hidden` com `-Verb RunAs`. O UAC precisa ser visível. Alternativa: criar `.bat` e pedir ao usuário para executar como administrador.

---

### 2026-03-12 — Arquivo de log bloqueado ao ler enquanto processo ainda escreve

**Contexto:** Script PowerShell rodando em background escrevendo em arquivo de log. Tentar ler o arquivo antes do processo terminar completamente.

**Erro:**
```
O processo não pode acessar o arquivo '...' porque ele está sendo usado por outro processo.
GetContentReaderIOError
```

**Solução:** Aguardar o processo terminar com `Start-Process -Wait` ou verificar se arquivo contém marcador de fim antes de ler:
```powershell
# No script PS1, adicionar marcador no final:
Add-Content $log "CONCLUIDO"

# No bash, verificar antes de ler:
# Aguardar "CONCLUIDO" aparecer no arquivo, ou usar Start-Process -Wait
```

**Regra:** Sempre usar `Start-Process ... -Wait` quando precisar ler o resultado logo em seguida. Ou adicionar marcador "CONCLUIDO" no final do script e fazer polling do arquivo.

---

### 2026-03-12 — Calculated properties `@{N=...;E={...}}` quebram em -Command inline

**Contexto:** Usar hash tables calculadas do PowerShell inline via Bash:
```bash
powershell -Command "Get-Process | Select-Object @{N='RAM';E={$_.WorkingSet64/1MB}}"
```

**Erro:** Mesmo erro de extglob/`$_` — bash interpreta as chaves e o `$_` incorretamente.

**Solução:** Mover para arquivo `.ps1`. Não há workaround inline viável.

**Regra:** Hash tables `@{N=...;E={...}}` com `$_` NUNCA funcionam em `powershell -Command` via Bash. Usar arquivo `.ps1` sempre.

---

## Padroes que Funcionam

### Padrao recomendado para scripts PowerShell no Claude Code (Windows)

```bash
# 1. Escrever o script com Write tool em ~/.claude/
# Arquivo: C:/Users/sabola/.claude/meu_script.ps1

# 2. Executar em processo separado (evita conflito de Temp)
powershell -ExecutionPolicy Bypass -Command \
  "Start-Process powershell -ArgumentList '-ExecutionPolicy Bypass -File C:/Users/sabola/.claude/meu_script.ps1' -WindowStyle Hidden -Wait"

# 3. Ler resultado
sleep 3 && powershell -Command "Get-Content 'C:/Users/sabola/.claude/resultado.txt'"
```

### Dentro do script .ps1: sempre logar em arquivo

```powershell
$log = "C:/Users/sabola/.claude/resultado.txt"
Set-Content $log ""
function Show($msg) { Write-Host $msg; Add-Content $log $msg }

Show "iniciando..."
# ... codigo ...
Show "CONCLUIDO"
```

### Para operacoes que requerem admin

```powershell
# Criar arquivo .bat com os comandos sc stop/sc config
# Instruir o usuario a executar como Administrador
# OU usar Start-Process -Verb RunAs sem -WindowStyle Hidden
```

---

## Referencia Rapida de Erros Comuns

| Erro | Causa | Solucao |
|------|-------|---------|
| `extglob.Name` / `Token inesperado` | `$_` no inline `-Command` | Usar arquivo `.ps1` |
| `output file could not be read (ENOENT)` | Script limpou `%TEMP%` | Redirecionar output para `~/.claude/` |
| Script trava em uninstaller | GUI abre em background | Matar processo + deletar pasta |
| `A cadeia nao tem terminador` | Aspas curvas no .ps1 | Usar aspas ASCII retas |
| UAC invisivel | `-WindowStyle Hidden` com `-Verb RunAs` | Remover `-WindowStyle Hidden` |
| Arquivo bloqueado ao ler | Processo ainda escrevendo | Usar `-Wait` ou polling por "CONCLUIDO" |
| `~` literal no caminho | PowerShell nao expande `~` | Usar `"$env:USERPROFILE\.claude\..."` ou caminho absoluto |
| `Start-Process 'claude'` falha | `claude` e script .ps1, nao .exe | `Start-Process 'powershell' -ArgumentList '-Command','claude ...'` |

---

## Licoes Aprendidas (Auto-gerado por /aprender)

> Secao atualizada automaticamente. Consultar ANTES de executar tarefas relacionadas.

### 2026-03-24 - `~` nao e expandido no PowerShell do Windows
**Contexto:** Executar `node ~/.claude/accounts/setup.js` no PowerShell
**Erro:** `Cannot find module 'C:\Users\sabola\~\.claude\accounts\setup.js'` — PowerShell literaliza `~`
**Solucao:** Usar caminho completo: `node "C:\Users\sabola\.claude\accounts\setup.js"` ou `"$env:USERPROFILE\.claude\accounts\setup.js"`
**Regra:** Em PowerShell, NUNCA usar `~` em caminhos. SEMPRE usar `$env:USERPROFILE` ou caminho absoluto.

### 2026-03-24 - Start-Process falha com scripts npm (claude, npx, etc)
**Contexto:** Automatizar `claude auth login` em diretorio temporario via Start-Process
**Erro:** `Start-Process -FilePath 'claude'` retorna "nao e um aplicativo Win32 valido" — `claude` e `claude.ps1` em npm global
**Solucao:** `Start-Process -FilePath 'powershell' -ArgumentList '-Command','claude auth login'`
**Regra:** Para executar CLI tools do npm via Start-Process: SEMPRE usar `-FilePath 'powershell'` como wrapper.

### 2026-03-24 - Nunca deletar .credentials.json em sessao ativa do Claude Code
**Contexto:** Configurar contas para rotacao — deletou .credentials.json para forcar novo login
**Erro:** A sessao ativa do Claude Code perdeu autenticacao imediatamente ("Not logged in")
**Solucao:** Usar diretorio temporario isolado: `$env:HOME = 'temp-auth'; $env:USERPROFILE = 'temp-auth'` + `claude auth login`
**Regra:** NUNCA modificar ~/.claude/.credentials.json diretamente. Para auth de nova conta, usar HOME override em diretorio isolado.

### 2026-03-26 - cmd.exe `start` abre IE/Edge em vez do Chrome
**Contexto:** Abrir URL de OAuth no Chrome com perfil especifico via bash/cmd
**Erro:** `start "" "chrome.exe" --profile-directory="Profile 18" "URL"` abre no Internet Explorer
**Solucao:** Usar PowerShell: `powershell.exe -Command "Start-Process 'C:\Program Files\Google\Chrome\Application\chrome.exe' -ArgumentList '--profile-directory=\"Profile 18\"','URL'"`
**Regra:** Para abrir Chrome com perfil especifico: SEMPRE PowerShell Start-Process com path completo. NUNCA cmd start.

### 2026-03-26 - HOME override cria paths duplicados no Windows
**Contexto:** `HOME=~/.claude/temp/account-1 claude auth login` para auth isolada
**Erro:** Credenciais salvas em `temp/account-1/.claude/temp/account-1/.claude/.credentials.json` (path duplicado)
**Solucao:** Buscar credenciais em multiplos paths possiveis (direto + aninhado)
**Regra:** No Windows, HOME override com bash causa path duplication. Scripts DEVEM buscar em paths aninhados como fallback.
