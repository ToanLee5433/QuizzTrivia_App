#!/usr/bin/env powershell
# Sync configuration files from config/ to root for tools compatibility

Write-Host "Syncing configuration files..." -ForegroundColor Green

# Copy environment files
Copy-Item "config/env/.env.*" . -Force
Write-Host "✓ Environment files synced" -ForegroundColor Green

# Copy Firebase files
Copy-Item "config/firebase/firebase.json" . -Force
Copy-Item "config/firebase/.firebaserc" . -Force
Copy-Item "config/firebase/firestore.*" . -Force
Write-Host "✓ Firebase files synced" -ForegroundColor Green

Write-Host "Configuration sync completed!" -ForegroundColor Cyan
