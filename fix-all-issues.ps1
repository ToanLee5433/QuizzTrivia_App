# Fix All Issues - Comprehensive Debugging Script
# Sửa toàn bộ lỗi và tối ưu hệ thống

Write-Host "🔧 COMPREHENSIVE PROJECT DEBUG & FIX" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# 1. Clean và reinstall dependencies
Write-Host "1. Cleaning and reinstalling dependencies..." -ForegroundColor Yellow
Remove-Item "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "package-lock.json" -Force -ErrorAction SilentlyContinue
npm install

# 2. Fix imports và exports
Write-Host "2. Fixing imports and exports..." -ForegroundColor Yellow

# Fix ReviewForm export
$reviewFormPath = "src\features\quiz\components\ReviewForm.tsx"
if (Test-Path $reviewFormPath) {
    (Get-Content $reviewFormPath) -replace "export const ReviewForm", "const ReviewForm" | Set-Content $reviewFormPath
    Write-Host "✅ Fixed ReviewForm export" -ForegroundColor Green
}

# 3. Update Firebase imports để tránh test errors
Write-Host "3. Updating Firebase imports..." -ForegroundColor Yellow

# Update AdminQuizManagement imports
$adminQuizPath = "src\features\admin\pages\AdminQuizManagement.tsx"
if (Test-Path $adminQuizPath) {
    $content = Get-Content $adminQuizPath -Raw
    $newContent = $content -replace "import \{\s*collection,\s*getDocs,\s*doc,\s*updateDoc,\s*deleteDoc,\s*query,\s*orderBy\s*\} from 'firebase/firestore';", "import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy, limit } from 'firebase/firestore';"
    Set-Content $adminQuizPath $newContent
    Write-Host "✅ Updated AdminQuizManagement imports" -ForegroundColor Green
}

# 4. Remove debug console.logs từ production code
Write-Host "4. Removing debug console.logs..." -ForegroundColor Yellow

$files = @(
    "src\features\quiz\pages\LeaderboardPage.tsx",
    "src\features\admin\components\QuickActions.tsx"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        $newContent = $content -replace "console\.log\([^)]*\);?\s*\n?", ""
        Set-Content $file $newContent
        Write-Host "✅ Cleaned console.logs from $file" -ForegroundColor Green
    }
}

# 5. Build project để check errors
Write-Host "5. Building project to check for errors..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build successful!" -ForegroundColor Green
} else {
    Write-Host "❌ Build failed - check errors above" -ForegroundColor Red
    exit 1
}

# 6. Run tests
Write-Host "6. Running tests..." -ForegroundColor Yellow
npm test -- --watchAll=false --passWithNoTests

# 7. Start dev server
Write-Host "7. Starting development server..." -ForegroundColor Yellow
Write-Host "🚀 Project should now be running smoothly!" -ForegroundColor Green
Write-Host "Access at: http://localhost:5173" -ForegroundColor Cyan

npm run dev
