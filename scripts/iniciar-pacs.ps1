# Script de inicio automático de Docker Desktop y contenedores PACS (Sanatorio Antonia)
$ErrorActionPreference = "Continue"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Verificando estado de Docker y PACS     " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$dockerExe = "C:\Program Files\Docker\Docker\Docker Desktop.exe"

# 1. Comprobar si el motor de Docker ya responde
$dockerReady = $false
try {
    $salida = docker info 2>&1
    if ($LASTEXITCODE -eq 0) {
        $dockerReady = $true
    }
} catch {
    $dockerReady = $false
}

# 2. Si no responde, iniciar Docker Desktop
if (-not $dockerReady) {
    Write-Host "Docker Desktop no esta ejecutandose. Iniciando aplicacion..." -ForegroundColor Yellow
    if (Test-Path $dockerExe) {
        Start-Process $dockerExe
    } else {
        Write-Host "Inicia Docker Desktop desde tu menu de inicio." -ForegroundColor Yellow
    }

    Write-Host "Esperando a que el motor de Docker este activo (puede demorar unos segundos)..." -ForegroundColor Yellow
    $intentos = 0
    while (-not $dockerReady -and $intentos -lt 40) {
        Start-Sleep -Seconds 3
        $intentos++
        try {
            $null = docker info 2>&1
            if ($LASTEXITCODE -eq 0) {
                $dockerReady = $true
                break
            }
        } catch {}
        Write-Host "." -NoNewline
    }
    Write-Host ""
}

if ($dockerReady) {
    Write-Host "Motor Docker activo. Levantando contenedores PACS..." -ForegroundColor Green
    $composeFile = Join-Path $PSScriptRoot "..\docker-compose.pacs.yml"
    docker compose -f $composeFile up -d
    Write-Host "Contenedores PACS listos en segundo plano:" -ForegroundColor Green
    Write-Host " - Visor OHIF:       http://localhost:3005" -ForegroundColor Cyan
    Write-Host " - Servidor Orthanc: http://localhost:8042" -ForegroundColor Cyan
} else {
    Write-Host "Aun no se pudo comunicar con Docker. Cuando Docker Desktop termine de cargar, volve a ejecutar este script." -ForegroundColor Red
}
