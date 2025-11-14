@echo off
echo 🚀 Deploying Chatbot AI Functions...
echo.

cd /d "%~dp0"

echo 📦 Building functions...
cd functions
call npm run build
if %ERRORLEVEL% neq 0 (
    echo ❌ Build failed!
    pause
    exit /b 1
)

echo 🚀 Deploying to Firebase...
call firebase deploy --only functions
if %ERRORLEVEL% neq 0 (
    echo ❌ Deploy failed!
    pause
    exit /b 1
)

echo ✅ Deploy completed!
echo.
echo 📋 Next steps:
echo 1. Go to your app and login as admin
echo 2. Visit /admin/build-index
echo 3. Click "Build Index" to create vector database
echo 4. Test the chatbot!
echo.
pause
