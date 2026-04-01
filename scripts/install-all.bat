@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1
title Claude Code Ecosystem - Instalacao Universal
color 0A

:: =============================================
:: INSTALL-ALL.BAT — Claude Code Ecosystem
:: Instalador universal e portatil para Windows.
:: Detecta automaticamente o usuario e diretorio.
::
:: Uso: Duplo-clique ou execute no terminal.
:: =============================================

:: ── Detectar diretorio do usuario automaticamente ──
set "CLAUDE_HOME=%USERPROFILE%\.claude"
set "TASK_SCHEDULER_DIR=%CLAUDE_HOME%\task-scheduler"
set "FRONTEND_ANALYZER_DIR=%CLAUDE_HOME%\frontend-analyzer"
set "CRM_DIR=%CLAUDE_HOME%\task-scheduler\crm-backend"
set "CRM_FRONTEND_DIR=%CLAUDE_HOME%\task-scheduler\frontend"
set "MCP_SERVER_DIR=%CLAUDE_HOME%\mcp-server"
set "CONFIG_DIR=%CLAUDE_HOME%\config"
set "LOG_DIR=%CLAUDE_HOME%\logs"
set "TEMP_DIR=%CLAUDE_HOME%\temp"

:: ── Data segura para log (independente de locale) ──
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value 2^>nul ^| find "="') do set "DT=%%I"
set "LOG_DATE=%DT:~0,8%"
if "%LOG_DATE%"=="" set "LOG_DATE=install"
set "LOG_FILE=%LOG_DIR%\install-%LOG_DATE%.log"

:: ── Contadores ──
set "INSTALLED=0"
set "SKIPPED=0"
set "ERRORS=0"
set "TOTAL_STEPS=12"

:: ── Criar diretorios essenciais PRIMEIRO ──
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%" 2>nul
if not exist "%CONFIG_DIR%" mkdir "%CONFIG_DIR%" 2>nul
if not exist "%TEMP_DIR%" mkdir "%TEMP_DIR%" 2>nul
if not exist "%CLAUDE_HOME%\knowledge-base" mkdir "%CLAUDE_HOME%\knowledge-base" 2>nul
if not exist "%CLAUDE_HOME%\session-diary" mkdir "%CLAUDE_HOME%\session-diary" 2>nul
if not exist "%CLAUDE_HOME%\memory" mkdir "%CLAUDE_HOME%\memory" 2>nul
if not exist "%CLAUDE_HOME%\agents" mkdir "%CLAUDE_HOME%\agents" 2>nul
if not exist "%CLAUDE_HOME%\hooks" mkdir "%CLAUDE_HOME%\hooks" 2>nul
if not exist "%CLAUDE_HOME%\skills" mkdir "%CLAUDE_HOME%\skills" 2>nul
if not exist "%CLAUDE_HOME%\commands" mkdir "%CLAUDE_HOME%\commands" 2>nul
if not exist "%CLAUDE_HOME%\backups" mkdir "%CLAUDE_HOME%\backups" 2>nul
if not exist "%CLAUDE_HOME%\cache" mkdir "%CLAUDE_HOME%\cache" 2>nul
if not exist "%CLAUDE_HOME%\sessions" mkdir "%CLAUDE_HOME%\sessions" 2>nul
if not exist "%CLAUDE_HOME%\tasks" mkdir "%CLAUDE_HOME%\tasks" 2>nul
if not exist "%CLAUDE_HOME%\plans" mkdir "%CLAUDE_HOME%\plans" 2>nul
if exist "%TASK_SCHEDULER_DIR%" (
    if not exist "%TASK_SCHEDULER_DIR%\data" mkdir "%TASK_SCHEDULER_DIR%\data" 2>nul
    if not exist "%TASK_SCHEDULER_DIR%\output" mkdir "%TASK_SCHEDULER_DIR%\output" 2>nul
)

call :log "================================================================"
call :log "  CLAUDE CODE ECOSYSTEM — Instalacao: %DT:~0,4%-%DT:~4,2%-%DT:~6,2% %DT:~8,2%:%DT:~10,2%"
call :log "  Usuario: %USERNAME% | Home: %USERPROFILE%"
call :log "  Claude Home: %CLAUDE_HOME%"
call :log "================================================================"

echo.
echo  ================================================================
echo     CLAUDE CODE ECOSYSTEM — Instalacao Universal (Windows)
echo  ================================================================
echo.
echo  Usuario:     %USERNAME%
echo  Home:        %USERPROFILE%
echo  Claude Home: %CLAUDE_HOME%
echo.

:: ══════════════════════════════════════════════
:: PASSO 0: Parar instancias existentes
:: ══════════════════════════════════════════════
echo  [PRE] Parando instancias existentes...
if exist "%CLAUDE_HOME%\stop-all.bat" (
    call "%CLAUDE_HOME%\stop-all.bat" >nul 2>&1
    echo  [OK] Instancias encerradas
) else (
    for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":3847.*LISTENING"') do (
        taskkill /PID %%a /T /F >nul 2>&1
    )
    if exist "%TASK_SCHEDULER_DIR%\data\server.pid" del "%TASK_SCHEDULER_DIR%\data\server.pid" >nul 2>&1
    echo  [OK] Portas liberadas
)
timeout /t 2 /nobreak >nul

:: ══════════════════════════════════════════════════════════════════
::  FASE 1: DEPENDENCIAS BASE (Node.js, Git)
::  Instala ANTES de qualquer coisa que precise de npm/node/git
:: ══════════════════════════════════════════════════════════════════

:: ══════════════════════════════════════════════
:: PASSO 1: Node.js
:: ══════════════════════════════════════════════
call :step 1 "Verificando Node.js..."

where node >nul 2>&1
if !ERRORLEVEL! neq 0 (
    echo  [!] Node.js NAO encontrado. Tentando instalar...
    call :log "[!] Node.js nao encontrado, tentando instalar"

    where winget >nul 2>&1
    if !ERRORLEVEL! neq 0 (
        echo  [ERRO] winget nao disponivel.
        echo  [ERRO] Instale Node.js manualmente: https://nodejs.org/en/download/
        echo  [ERRO] Apos instalar, execute este script novamente.
        call :log "[ERRO] winget indisponivel, Node.js nao pode ser instalado automaticamente"
        set /a ERRORS+=1
        goto :node_done
    )

    echo  [..] Instalando Node.js via winget (pode demorar)...
    winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
    if !ERRORLEVEL! neq 0 (
        echo  [ERRO] Falha ao instalar Node.js via winget
        echo  [ERRO] Instale manualmente: https://nodejs.org/en/download/
        call :log "[ERRO] winget install Node.js falhou"
        set /a ERRORS+=1
        goto :node_done
    )

    :: Atualizar PATH para encontrar node/npm na sessao atual
    set "PATH=%PATH%;%ProgramFiles%\nodejs;%APPDATA%\npm"
    :: Tentar tambem o caminho do nvm-windows
    if exist "%APPDATA%\nvm" set "PATH=%PATH%;%APPDATA%\nvm"

    :: Verificar se node esta acessivel agora
    where node >nul 2>&1
    if !ERRORLEVEL! neq 0 (
        echo  [AVISO] Node.js instalado mas precisa reiniciar o terminal.
        echo  [AVISO] Feche este terminal, abra um novo e execute o script novamente.
        call :log "[AVISO] Node instalado mas PATH nao atualizado na sessao"
        set /a ERRORS+=1
        goto :need_restart
    )

    for /f "tokens=*" %%v in ('node --version 2^>nul') do echo  [OK] Node.js %%v instalado!
    call :log "[OK] Node.js instalado"
    set /a INSTALLED+=1
) else (
    for /f "tokens=*" %%v in ('node --version 2^>nul') do echo  [OK] Node.js %%v
    set /a SKIPPED+=1
)
:node_done

:: ══════════════════════════════════════════════
:: PASSO 2: Git
:: ══════════════════════════════════════════════
call :step 2 "Verificando Git..."

where git >nul 2>&1
if !ERRORLEVEL! neq 0 (
    echo  [!] Git NAO encontrado. Tentando instalar...
    call :log "[!] Git nao encontrado"

    where winget >nul 2>&1
    if !ERRORLEVEL! neq 0 (
        echo  [ERRO] Instale Git manualmente: https://git-scm.com/downloads/win
        set /a ERRORS+=1
        goto :git_done
    )

    echo  [..] Instalando Git via winget...
    winget install Git.Git --accept-source-agreements --accept-package-agreements
    set "PATH=%PATH%;%ProgramFiles%\Git\bin;%ProgramFiles%\Git\cmd"

    where git >nul 2>&1
    if !ERRORLEVEL! neq 0 (
        echo  [AVISO] Git instalado mas precisa reiniciar o terminal.
        call :log "[AVISO] Git instalado mas PATH nao atualizado"
        set /a ERRORS+=1
    ) else (
        echo  [OK] Git instalado!
        set /a INSTALLED+=1
    )
) else (
    for /f "tokens=3" %%v in ('git --version 2^>nul') do echo  [OK] Git v%%v
    set /a SKIPPED+=1
)
:git_done

:: ── Verificar se npm esta disponivel para os proximos passos ──
where npm >nul 2>&1
if !ERRORLEVEL! neq 0 (
    echo.
    echo  ================================================================
    echo  [ERRO CRITICO] npm nao esta disponivel!
    echo  Node.js precisa estar instalado para continuar.
    echo  Instale Node.js: https://nodejs.org/en/download/
    echo  Apos instalar, execute este script novamente.
    echo  ================================================================
    call :log "[ERRO CRITICO] npm indisponivel, abortando instalacao de dependencias"
    set /a ERRORS+=1
    goto :final_check
)

echo.
echo  [OK] npm disponivel - continuando instalacao de dependencias...
echo.

:: ══════════════════════════════════════════════════════════════════
::  FASE 2: DEPENDENCIAS NPM (requer Node.js/npm)
:: ══════════════════════════════════════════════════════════════════

:: ══════════════════════════════════════════════
:: PASSO 3: Claude Code CLI
:: ══════════════════════════════════════════════
call :step 3 "Verificando Claude Code CLI..."

where claude >nul 2>&1
if !ERRORLEVEL! neq 0 (
    echo  [..] Instalando Claude Code CLI...
    call npm install -g @anthropic-ai/claude-code 2>&1
    if !ERRORLEVEL! neq 0 (
        echo  [ERRO] Falha ao instalar Claude Code CLI
        call :log "[ERRO] npm install claude-code falhou"
        set /a ERRORS+=1
    ) else (
        echo  [OK] Claude Code CLI instalado!
        set /a INSTALLED+=1
    )
) else (
    echo  [OK] Claude Code CLI ja instalado
    set /a SKIPPED+=1
)

:: ══════════════════════════════════════════════
:: PASSO 4: Task Scheduler deps
:: ══════════════════════════════════════════════
call :step 4 "Task Scheduler dependencies..."

if not exist "%TASK_SCHEDULER_DIR%\package.json" (
    echo  [SKIP] Task Scheduler nao encontrado
    set /a SKIPPED+=1
    goto :step5
)

if not exist "%TASK_SCHEDULER_DIR%\node_modules" (
    echo  [..] Instalando dependencias do Task Scheduler...
    cd /d "%TASK_SCHEDULER_DIR%"
    call npm install 2>&1
    if !ERRORLEVEL! neq 0 (
        echo  [ERRO] Falha ao instalar deps do Task Scheduler
        set /a ERRORS+=1
    ) else (
        echo  [OK] Task Scheduler deps instaladas
        set /a INSTALLED+=1
    )
) else (
    echo  [OK] Task Scheduler deps ja instaladas
    set /a SKIPPED+=1
)

:: ══════════════════════════════════════════════
:: PASSO 5: CRM Backend
:: ══════════════════════════════════════════════
:step5
call :step 5 "CRM Prospeccao IA..."

if not exist "%CRM_DIR%\package.json" (
    echo  [SKIP] CRM nao encontrado
    set /a SKIPPED+=1
    goto :step6
)

:: 5a: npm install
if not exist "%CRM_DIR%\node_modules" (
    echo  [..] Instalando dependencias do CRM...
    cd /d "%CRM_DIR%"
    call npm install 2>&1
    if !ERRORLEVEL! neq 0 (
        echo  [ERRO] Falha ao instalar deps do CRM
        set /a ERRORS+=1
        goto :step6
    )
)

:: 5b: .env check
if not exist "%CRM_DIR%\.env" (
    if exist "%CRM_DIR%\.env.example" (
        echo  [..] Criando .env a partir do .env.example...
        copy /Y "%CRM_DIR%\.env.example" "%CRM_DIR%\.env" >nul 2>&1
        echo  [OK] .env criado — revise as configuracoes em: %CRM_DIR%\.env
    ) else (
        echo  [AVISO] .env nao encontrado. Crie manualmente antes de iniciar o CRM.
    )
)

:: 5c: Prisma generate + db push
echo  [..] Prisma generate...
cd /d "%CRM_DIR%"
call npx prisma generate >nul 2>&1
if !ERRORLEVEL! neq 0 (
    echo  [AVISO] Prisma generate falhou (pode precisar de .env correto)
) else (
    echo  [OK] Prisma Client gerado
)

echo  [..] Aplicando schema no banco...
cd /d "%CRM_DIR%"
call npx prisma db push --skip-generate >nul 2>&1
if !ERRORLEVEL! neq 0 (
    echo  [AVISO] Prisma db push falhou (verifique DATABASE_URL no .env)
) else (
    echo  [OK] Schema do banco aplicado
)

:: 5d: Build TypeScript
echo  [..] Compilando TypeScript...
cd /d "%CRM_DIR%"
call npx tsc 2>&1
if !ERRORLEVEL! neq 0 (
    echo  [ERRO] Falha ao compilar CRM backend
    call :log "[ERRO] CRM TypeScript build falhou"
    set /a ERRORS+=1
) else (
    echo  [OK] CRM backend compilado
    set /a INSTALLED+=1
)

:: 5e: Frontend (se existir)
if exist "%CRM_FRONTEND_DIR%\package.json" (
    if not exist "%CRM_FRONTEND_DIR%\node_modules" (
        echo  [..] Instalando deps do frontend...
        cd /d "%CRM_FRONTEND_DIR%"
        call npm install 2>&1
    )
    echo  [..] Compilando Frontend (Vite)...
    cd /d "%CRM_FRONTEND_DIR%"
    call npm run build 2>&1
    if !ERRORLEVEL! neq 0 (
        echo  [AVISO] Build do frontend falhou
    ) else (
        echo  [OK] Frontend compilado
    )
)

:: ══════════════════════════════════════════════
:: PASSO 6: Frontend Analyzer
:: ══════════════════════════════════════════════
:step6
call :step 6 "Frontend Analyzer..."

if not exist "%FRONTEND_ANALYZER_DIR%\package.json" (
    echo  [SKIP] Frontend Analyzer nao encontrado
    set /a SKIPPED+=1
    goto :step7
)

if not exist "%FRONTEND_ANALYZER_DIR%\node_modules" (
    echo  [..] Instalando Frontend Analyzer...
    cd /d "%FRONTEND_ANALYZER_DIR%"
    call npm install 2>&1
    if !ERRORLEVEL! neq 0 (
        echo  [ERRO] Falha ao instalar Frontend Analyzer
        set /a ERRORS+=1
    ) else (
        echo  [OK] Frontend Analyzer instalado
        set /a INSTALLED+=1
    )
) else (
    echo  [OK] Frontend Analyzer ja instalado
    set /a SKIPPED+=1
)

:: ══════════════════════════════════════════════
:: PASSO 7: MCP Server (se existir)
:: ══════════════════════════════════════════════
:step7
call :step 7 "MCP Server local..."

if not exist "%MCP_SERVER_DIR%\package.json" (
    echo  [SKIP] MCP Server nao encontrado
    set /a SKIPPED+=1
    goto :step8
)

if not exist "%MCP_SERVER_DIR%\node_modules" (
    echo  [..] Instalando MCP Server...
    cd /d "%MCP_SERVER_DIR%"
    call npm install 2>&1
    if !ERRORLEVEL! neq 0 (
        echo  [ERRO] Falha ao instalar MCP Server
        set /a ERRORS+=1
    ) else (
        echo  [OK] MCP Server instalado
        set /a INSTALLED+=1
    )
) else (
    echo  [OK] MCP Server ja instalado
    set /a SKIPPED+=1
)

:: ══════════════════════════════════════════════
:: PASSO 8: Docker + Redis (opcional)
:: ══════════════════════════════════════════════
:step8
call :step 8 "Docker e Redis (opcional)..."

where docker >nul 2>&1
if !ERRORLEVEL! neq 0 (
    echo  [~] Docker nao encontrado (opcional — Redis nao sera iniciado)
    set /a SKIPPED+=1
    goto :step9
)

echo  [OK] Docker encontrado

set "REDIS_RUNNING=0"
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":6379.*LISTENING"') do set "REDIS_RUNNING=1"

if "!REDIS_RUNNING!"=="0" (
    echo  [..] Iniciando Redis via Docker...
    docker start crm-redis >nul 2>&1 || docker run -d --name crm-redis -p 6379:6379 --restart unless-stopped redis:7-alpine >nul 2>&1
    timeout /t 3 /nobreak >nul
    echo  [OK] Redis iniciado
    set /a INSTALLED+=1
) else (
    echo  [OK] Redis ja rodando
    set /a SKIPPED+=1
)

:: ══════════════════════════════════════════════
:: PASSO 9: MCPs config
:: ══════════════════════════════════════════════
:step9
call :step 9 "Configurando MCPs..."

set "MCP_FILE=%CONFIG_DIR%\mcp.json"
node -e "const fs=require('fs');const p='%MCP_FILE:\=\\%';let c={mcpServers:{}};try{c=JSON.parse(fs.readFileSync(p,'utf8'))}catch(e){}const s=c.mcpServers||{};if(!s['chrome-devtools'])s['chrome-devtools']={command:'npx',args:['chrome-devtools-mcp@latest']};if(!s['desktop-commander'])s['desktop-commander']={command:'npx',args:['@wonderwhy-er/desktop-commander']};if(!s['sequential-thinking'])s['sequential-thinking']={command:'npx',args:['-y','@modelcontextprotocol/server-sequential-thinking']};if(!s['memory'])s['memory']={command:'npx',args:['-y','@modelcontextprotocol/server-memory']};if(!s['context7'])s['context7']={command:'npx',args:['-y','@upstash/context7-mcp@latest']};c.mcpServers=s;fs.writeFileSync(p,JSON.stringify(c,null,2));console.log('  [OK] MCPs: '+Object.keys(s).join(', '))" 2>nul
if !ERRORLEVEL! neq 0 (
    echo  [AVISO] Falha ao configurar MCPs
    set /a ERRORS+=1
) else (
    set /a INSTALLED+=1
)

:: ══════════════════════════════════════════════
:: PASSO 10: Settings e permissoes
:: ══════════════════════════════════════════════
call :step 10 "Configuracoes..."

if exist "%CLAUDE_HOME%\settings.json" (
    echo  [OK] settings.json existe
    set /a SKIPPED+=1
) else (
    node -e "const fs=require('fs');const s={permissions:{allow:['Edit','Write','Read','Glob','Grep','Bash','WebFetch(domain:*)','WebSearch','MCP','NotebookEdit','Task','TodoWrite','AskUserQuestion','Skill','Skill(auto)'],deny:['Read(./.env)','Read(./.env.*)','Edit(./.env)','Edit(./.env.*)'],ask:[]},language:'portuguese-br'};fs.writeFileSync('%CLAUDE_HOME:\=\\%\\settings.json',JSON.stringify(s,null,2))" 2>nul
    echo  [OK] settings.json criado
    set /a INSTALLED+=1
)

:: Dados iniciais do task scheduler
if exist "%TASK_SCHEDULER_DIR%\data" (
    if not exist "%TASK_SCHEDULER_DIR%\data\tasks.json" echo []> "%TASK_SCHEDULER_DIR%\data\tasks.json" 2>nul
    if not exist "%TASK_SCHEDULER_DIR%\data\executions.json" echo []> "%TASK_SCHEDULER_DIR%\data\executions.json" 2>nul
    if not exist "%TASK_SCHEDULER_DIR%\data\prompt-templates.json" echo []> "%TASK_SCHEDULER_DIR%\data\prompt-templates.json" 2>nul
    if not exist "%TASK_SCHEDULER_DIR%\data\scheduled-tasks.json" echo []> "%TASK_SCHEDULER_DIR%\data\scheduled-tasks.json" 2>nul

    if not exist "%TASK_SCHEDULER_DIR%\data\config.json" (
        node -e "const fs=require('fs');fs.writeFileSync('%TASK_SCHEDULER_DIR:\=\\%\\data\\config.json',JSON.stringify({schedulerEnabled:true,checkInterval:60000,maxConcurrentTasks:10,retryAttempts:3,retryDelay:5000,notifications:{enabled:false,onSuccess:false,onFailure:true,webhook:''},telegram:{enabled:false,botToken:'',chatId:'',authorizedUsers:[]}},null,2))" 2>nul
    )
    echo  [OK] Dados iniciais criados
)

:: ══════════════════════════════════════════════
:: PASSO 11: Auto-inicio Windows
:: ══════════════════════════════════════════════
call :step 11 "Auto-inicio Windows..."

set "VBS_FILE=%CLAUDE_HOME%\autostart-silent.vbs"
(
    echo Set WshShell = CreateObject^("WScript.Shell"^)
    echo WshShell.Run """%CLAUDE_HOME%\start-all.bat"" /silent", 0, False
) > "%VBS_FILE%"

schtasks /create /tn "ClaudeCodeEcosystem" /tr "wscript.exe \"%VBS_FILE%\"" /sc onlogon /delay 0000:30 /f /rl highest >nul 2>&1
if !ERRORLEVEL! equ 0 (
    echo  [OK] Auto-inicio via Task Scheduler (30s apos login)
    set /a INSTALLED+=1
) else (
    set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
    copy /Y "%VBS_FILE%" "%STARTUP_DIR%\ClaudeCodeEcosystem.vbs" >nul 2>&1
    if !ERRORLEVEL! equ 0 (
        echo  [OK] Auto-inicio via Startup folder (fallback)
        set /a INSTALLED+=1
    ) else (
        echo  [AVISO] Falha ao configurar auto-inicio (nao critico)
        set /a SKIPPED+=1
    )
)

:: ══════════════════════════════════════════════
:: PASSO 12: Verificacao final
:: ══════════════════════════════════════════════
:final_check
call :step 12 "Verificacao final..."

echo.

:: Node.js
where node >nul 2>&1
if !ERRORLEVEL! equ 0 (
    for /f "tokens=*" %%v in ('node --version 2^>nul') do echo  [V] Node.js %%v
) else (
    echo  [X] Node.js — NECESSARIO
)

:: npm
where npm >nul 2>&1
if !ERRORLEVEL! equ 0 (
    for /f "tokens=*" %%v in ('npm --version 2^>nul') do echo  [V] npm v%%v
) else (
    echo  [X] npm — NECESSARIO
)

:: Git
where git >nul 2>&1
if !ERRORLEVEL! equ 0 (
    for /f "tokens=3" %%v in ('git --version 2^>nul') do echo  [V] Git v%%v
) else (
    echo  [X] Git
)

:: Claude CLI
where claude >nul 2>&1
if !ERRORLEVEL! equ 0 (
    echo  [V] Claude Code CLI
) else (
    echo  [~] Claude Code CLI (instalar com: npm i -g @anthropic-ai/claude-code)
)

:: Task Scheduler
if exist "%TASK_SCHEDULER_DIR%\node_modules\express" (
    echo  [V] Task Scheduler
) else (
    echo  [~] Task Scheduler
)

:: CRM Backend
if exist "%CRM_DIR%\dist\index.js" (
    echo  [V] CRM Backend compilado
) else (
    echo  [~] CRM Backend
)

:: Frontend Analyzer
if exist "%FRONTEND_ANALYZER_DIR%\node_modules" (
    echo  [V] Frontend Analyzer
) else (
    echo  [~] Frontend Analyzer
)

:: MCPs
if exist "%CONFIG_DIR%\mcp.json" (
    echo  [V] MCPs configurados
) else (
    echo  [X] MCPs
)

:: Settings
if exist "%CLAUDE_HOME%\settings.json" (
    echo  [V] Permissoes
) else (
    echo  [X] Permissoes
)

:: Docker
where docker >nul 2>&1
if !ERRORLEVEL! equ 0 (
    echo  [V] Docker
) else (
    echo  [~] Docker (opcional)
)

echo.
echo  ================================================================
echo     Instalados: !INSTALLED! ^| Existentes: !SKIPPED! ^| Erros: !ERRORS!
echo  ================================================================
echo.
echo  Endpoints (apos start-all.bat):
echo    Dashboard:  http://localhost:3847
echo    API CRM:    http://localhost:3847/api/crm
echo    API Tasks:  http://localhost:3847/api
echo.
echo  Claude Home: %CLAUDE_HOME%
echo  Log: %LOG_FILE%
echo.

call :log "Instalacao finalizada: !INSTALLED! instalados, !SKIPPED! existentes, !ERRORS! erros"

if !ERRORS! gtr 0 (
    echo  [!] Houve !ERRORS! erro(s). Verifique o log para detalhes.
    echo.
)

goto :end

:: ══════════════════════════════════════════════
:: Label para quando precisa reiniciar terminal
:: ══════════════════════════════════════════════
:need_restart
echo.
echo  ================================================================
echo  [!] Node.js foi instalado mas o PATH nao foi atualizado.
echo  [!] FECHE este terminal, abra um novo e execute novamente:
echo  [!]   "%CLAUDE_HOME%\install-all.bat"
echo  ================================================================
echo.
goto :end

:: ══════════════════════════════════════════════
:: Funcoes auxiliares
:: ══════════════════════════════════════════════
:step
echo.
echo  ----------------------------------------------------------------
echo  [%~1/%TOTAL_STEPS%] %~2
echo  ----------------------------------------------------------------
call :log "[%~1/%TOTAL_STEPS%] %~2"
goto :eof

:log
echo [%DT:~0,4%-%DT:~4,2%-%DT:~6,2% %DT:~8,2%:%DT:~10,2%] %~1 >> "%LOG_FILE%" 2>nul
goto :eof

:end
echo  Pressione qualquer tecla para fechar...
pause >nul
endlocal
exit /b !ERRORS!
