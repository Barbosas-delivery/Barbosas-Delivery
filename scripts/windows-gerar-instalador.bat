@echo off
setlocal
cd /d "%~dp0\.."
echo Gerando instalador Windows do Barbosa's Delivery Desktop 6.0.53...
call pnpm install
if errorlevel 1 exit /b %errorlevel%
call pnpm run desktop:installer
if errorlevel 1 exit /b %errorlevel%
echo.
echo Instalador gerado na pasta release.
pause
