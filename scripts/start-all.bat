@echo off
setlocal enabledelayedexpansion
title Claude Ecosystem v2 — Startup

echo ============================================
echo   Claude Ecosystem v2 — Inicializacao
echo ============================================
echo.

:: Verificar Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Node.js nao encontrado! Instale: winget install OpenJS.NodeJS.LTS
    pause
    exit /b 1
)
echo [OK] Node.js encontrado:
node --version

:: Diretorio do projeto
set "PROJECT_DIR=%~dp0.."
cd /d "%PROJECT_DIR%"

:: Instalar dependencias se necessario
if not exist "node_modules" (
    echo [INFO] Instalando dependencias...
    npm install
)

:: Verificar se ja esta rodando
set "PID_FILE=%PROJECT_DIR%\data\server.pid"
if exist "%PID_FILE%" (
    set /p OLD_PID=<"%PID_FILE%"
    echo [INFO] Servidor anterior detectado (PID: !OLD_PID!). Verificando...
    tasklist /fi "PID eq !OLD_PID!" 2>nul | find "!OLD_PID!" >nul 2>&1
    if not errorlevel 1 (
        echo [INFO] Encerrando servidor anterior...
        taskkill /PID !OLD_PID! /T /F >nul 2>&1
        timeout /t 2 /nobreak >nul
    )
    del "%PID_FILE%" >nul 2>&1
)

:: Verificar porta 3847
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3847 " ^| findstr "LISTEN" 2^>nul') do (
    echo [WARN] Porta 3847 em uso (PID: %%a). Encerrando...
    taskkill /PID %%a /T /F >nul 2>&1
    timeout /t 2 /nobreak >nul
)

:: Verificar Redis (para CRM BullMQ — opcional)
echo [INFO] Verificando Redis...
redis-cli ping >nul 2>&1
if errorlevel 1 (
    echo [WARN] Redis offline — CRM workers nao estarao disponiveis
    echo [INFO] Para ativar: docker run -d --name crm-redis -p 6379:6379 redis:alpine
) else (
    echo [OK] Redis disponivel
)

:: Iniciar servidor
echo.
echo [INFO] Iniciando servidor unificado na porta 3847...
start "Claude Ecosystem v2" /min node src/server/index.js

:: Aguardar e verificar
timeout /t 3 /nobreak >nul

:: Verificar se iniciou
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3847 " ^| findstr "LISTEN" 2^>nul') do (
    echo [OK] Servidor rodando na porta 3847 (PID: %%a)
    goto :opened
)
echo [ERRO] Servidor nao iniciou! Verifique os logs.
pause
exit /b 1

:opened
:: Abrir dashboard
if not "%1"=="/silent" (
    if not "%1"=="/no-browser" (
        echo [INFO] Abrindo dashboard...
        start "" "http://localhost:3847"
    )
)

echo.
echo ============================================
echo   Ecosystem v2 rodando em http://localhost:3847
echo ============================================
if not "%1"=="/silent" pause
