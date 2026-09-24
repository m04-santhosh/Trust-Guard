@echo off
title Stop TrustGuard Services
cd /d "%~dp0"
echo Stopping all TrustGuard backend and frontend processes on ports 8000 and 5173...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8000, 5173 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"
echo All TrustGuard processes stopped.
pause
