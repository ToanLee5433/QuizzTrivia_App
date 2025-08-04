@echo off
echo ================================
echo      QUIZ APP - SMTP TEST
echo ================================
echo.

cd /d "%~dp0"

echo [1/3] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js not found! Please install Node.js first.
    echo Download: https://nodejs.org/
    pause
    exit /b 1
)
echo ✅ Node.js found

echo.
echo [2/3] Installing dependencies...
if not exist node_modules (
    npm install
    if errorlevel 1 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
)
echo ✅ Dependencies ready

echo.
echo [3/3] Running SMTP test...
echo ⚠️  Make sure you have updated SMTP config in test-local.js
echo.
node test-local.js

echo.
echo ================================
echo Test completed! Press any key to continue...
pause >nul
