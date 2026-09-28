@echo off
rem TAMCO LDMS - stops the backend (port 8000) and the website (port 3002).
echo Stopping TAMCO LDMS...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr LISTENING ^| findstr ":8000 :3002"') do (
  taskkill /pid %%p /t /f >nul 2>&1
)
rem Also catch LDMS processes that outlived their window (e.g. uvicorn worker processes).
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'uvicorn app\.main:app|next(\.js)? (dev|start)' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"
taskkill /fi "WINDOWTITLE eq LDMS Backend*" /t /f >nul 2>&1
taskkill /fi "WINDOWTITLE eq LDMS Website*" /t /f >nul 2>&1
echo Stopped.
ping -n 3 127.0.0.1 >nul
