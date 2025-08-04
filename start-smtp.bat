@echo off
title Quiz App - SMTP Server

echo ================================
echo      QUIZ APP - SMTP SERVER
echo ================================
echo.

cd /d "%~dp0"

echo [1/4] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js not found! Please install Node.js first.
    echo Download: https://nodejs.org/
    pause
    exit /b 1
)
echo ✅ Node.js found

echo.
echo [2/4] Installing SMTP dependencies...
call npm install express nodemailer cors >nul 2>&1
if errorlevel 1 (
    echo ❌ Failed to install dependencies
    echo Trying manual installation...
    npm install express nodemailer cors
    if errorlevel 1 (
        echo ❌ Manual installation also failed
        pause
        exit /b 1
    )
)
echo ✅ Dependencies installed

echo.
echo [3/4] SMTP Configuration:
echo 📧 Email: lequytoanptit0303@gmail.com
echo 🔐 Password: zzeh rnuz bmwz sqsa (App Password)
echo 🌐 Server: smtp.gmail.com:587
echo.

echo [4/4] Starting SMTP Server...
echo 🚀 Server will run on: http://localhost:3001
echo 📋 Test endpoint: http://localhost:3001/api/test
echo.
echo ⚠️  Keep this window open while using the app
echo 💡 Press Ctrl+C to stop the server
echo.

REM Start the SMTP server
node smtp-server.js

echo.
echo ================================
echo SMTP Server stopped.
echo Press any key to exit...
pause >nul
