# One-click start for Windows PowerShell (UTF-8 with BOM recommended).
# Usage: powershell -ExecutionPolicy Bypass -File .\start.ps1
# Do NOT double-click this file (window may flash and exit).
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Backend = Join-Path $Root "backend"
$Frontend = Join-Path $Root "vision-biz-dash-main"

Write-Host "==> VisionInsight starting" -ForegroundColor Cyan
Write-Host "    Backend: http://127.0.0.1:8000  (/docs)" -ForegroundColor DarkGray
Write-Host "    Frontend: http://127.0.0.1:8080" -ForegroundColor DarkGray

$BackendCmd = @"
`$ErrorActionPreference = 'Stop'
Set-Location '$Backend'
Write-Host '==> [backend] preparing...' -ForegroundColor Cyan
if (-not (Test-Path '.venv\Scripts\python.exe')) {
  Write-Host '==> [backend] creating venv + installing deps (first run)...' -ForegroundColor Yellow
  py -3 -m venv .venv
  .\.venv\Scripts\python.exe -m pip install -r requirements.txt
}
Write-Host '==> [backend] uvicorn http://127.0.0.1:8000' -ForegroundColor Green
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
"@

$FrontendCmd = @"
`$ErrorActionPreference = 'Stop'
Set-Location '$Frontend'
Write-Host '==> [frontend] preparing...' -ForegroundColor Cyan
if (-not (Test-Path 'node_modules')) {
  Write-Host '==> [frontend] npm install (first run, 1-2 min)...' -ForegroundColor Yellow
  npm install
}
Write-Host '==> [frontend] Vite http://127.0.0.1:8080' -ForegroundColor Green
Write-Host '    Open browser after Local: http://localhost:8080/' -ForegroundColor DarkGray
npm run dev
"@

Write-Host "==> Opening backend window..." -ForegroundColor Green
Start-Process powershell -ArgumentList @("-NoExit", "-Command", $BackendCmd)

Write-Host "==> Opening frontend window..." -ForegroundColor Green
Start-Process powershell -ArgumentList @("-NoExit", "-Command", $FrontendCmd)

Write-Host ""
Write-Host "Two windows opened. Watch their logs; open http://127.0.0.1:8080 when ready." -ForegroundColor Cyan
