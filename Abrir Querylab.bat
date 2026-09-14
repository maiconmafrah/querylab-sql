@echo off
chcp 65001 >nul
title querylab
cd /d "%~dp0"

rem Dê dois cliques neste arquivo para colocar o querylab no ar.
rem Enquanto esta janela estiver aberta, o site fica acessível pelo navegador.

where node >nul 2>nul
if errorlevel 1 goto sem_node

if exist "node_modules\" goto abrir
echo.
echo   Primeira vez por aqui: instalando o que o site precisa. Pode levar alguns minutos...
echo.
call npm install
if errorlevel 1 goto falha_instalacao

:abrir
node scripts\abrir-site.ts
if errorlevel 1 pause
exit /b

:sem_node
echo.
echo   O Node.js não está instalado neste computador.
echo   Baixe a versão LTS em https://nodejs.org, instale e dê dois cliques neste arquivo de novo.
echo.
pause
exit /b 1

:falha_instalacao
echo.
echo   Não consegui instalar as dependências. Confira a internet e tente de novo.
echo.
pause
exit /b 1
