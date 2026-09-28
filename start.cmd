@echo off
rem TAMCO LDMS - starts the Python backend and the website, then opens the browser.
rem Double-click this file. Close the two windows it opens (or run stop.cmd) to stop.
title TAMCO LDMS launcher
cd /d "%~dp0"

if not exist "backend\.venv\Scripts\python.exe" (
  echo Backend is not set up yet. See backend\README.md ^(Setup^).
  pause
  exit /b 1
)
if not exist "frontend\node_modules" (
  echo Installing website packages ^(first time only^)...
  call npm --prefix frontend install
)

echo Starting backend  ^(Python, port 8000^)...
start "LDMS Backend" /d "%~dp0backend" cmd /k .venv\Scripts\python -m uvicorn app.main:app --port 8000

echo Starting website  ^(port 3002^)...
start "LDMS Website" /d "%~dp0frontend" cmd /k npm run dev

echo Waiting for the website to be ready...
set /a tries=0
:wait
ping -n 3 127.0.0.1 >nul
curl -s -o nul -m 5 http://localhost:3002/login && goto ready
set /a tries+=1
if %tries% lss 60 goto wait
echo The website did not start. Check the "LDMS Website" and "LDMS Backend" windows for errors.
pause
exit /b 1

:ready
echo Opening http://localhost:3002
start "" http://localhost:3002
