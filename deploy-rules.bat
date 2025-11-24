@echo off
echo.
echo ========================================
echo   DEPLOY FIREBASE RULES
echo ========================================
echo.

echo [1/2] Deploying Realtime Database Rules...
call firebase deploy --only database
if %errorlevel% neq 0 (
    echo ERROR: Failed to deploy database rules
    pause
    exit /b 1
)

echo.
echo [2/2] Deploying Firestore Rules...
call firebase deploy --only firestore:rules
if %errorlevel% neq 0 (
    echo ERROR: Failed to deploy firestore rules
    pause
    exit /b 1
)

echo.
echo ========================================
echo   DEPLOYMENT SUCCESSFUL!
echo ========================================
echo.
echo Rules have been deployed to Firebase.
echo You can now test the application.
echo.
pause
