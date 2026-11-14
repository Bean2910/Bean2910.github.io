@echo off
title An Tu Duyen - Chua Online
echo ===================================================
echo   Dang khoi dong game An Tu Duyen (Chua Online)...
echo ===================================================
cd /d "%~dp0server"

for /f "tokens=5" %%a in ('netstat -ano ^| findstr /C:":8080 " ^| findstr "LISTENING"') do (
  echo Dang dung tien trinh cu tren cong 8080 PID %%a...
  taskkill /F /PID %%a >nul 2>&1
)

start "" /b cmd /c "ping -n 2 127.0.0.1 >nul && start http://localhost:8080/?phong=chua-1"
node server.js
pause
