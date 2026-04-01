@echo off
setlocal enabledelayedexpansion
title Claude Ecosystem v2 — Shutdown

echo [INFO] Encerrando Claude Ecosystem v2...

:: Via PID file
set "PID_FILE=%~dp0..\data\server.pid"
if exist "%PID_FILE%" (
    set /p PID=<"%PID_FILE%"
    echo [INFO] Encerrando servidor (PID: !PID!)...
    taskkill /PID !PID! /T /F >nul 2>&1
    del "%PID_FILE%" >nul 2>&1
)

:: Via porta 3847
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3847 " ^| findstr "LISTEN" 2^>nul') do (
    echo [INFO] Encerrando processo na porta 3847 (PID: %%a)...
    taskkill /PID %%a /T /F >nul 2>&1
)

echo [OK] Ecosystem v2 encerrado.
if not "%1"=="/silent" pause
