@echo off
echo ==========================================
echo   Iniciando Docker y Contenedores PACS
echo ==========================================
powershell -ExecutionPolicy Bypass -File "%~dp0backend-sistemamedico\scripts\iniciar-pacs.ps1"
pause
