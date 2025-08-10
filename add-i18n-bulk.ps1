# Script to add i18n to multiple components
Write-Host "🌐 Adding i18n to Quiz App components..." -ForegroundColor Green

# Array of files and their key text replacements
$files = @(
    @{
        path = "src\features\quiz\pages\LeaderboardPage.tsx"
        searches = @(
            @{ search = "'Bảng xếp hạng'"; replace = "t('nav.leaderboard', 'Bảng xếp hạng')" }
            @{ search = "'Điểm'"; replace = "t('quiz.score', 'Điểm')" }
            @{ search = "'Người chơi'"; replace = "t('quiz.players', 'Người chơi')" }
        )
    },
    @{
        path = "src\shared\pages\Creator.tsx"
        searches = @(
            @{ search = "'Cần đăng nhập'"; replace = "t('auth.loginRequired', 'Cần đăng nhập')" }
            @{ search = "'Bạn cần đăng nhập để truy cập trang Creator'"; replace = "t('creator.loginMessage', 'Bạn cần đăng nhập để truy cập trang Creator')" }
        )
    },
    @{
        path = "src\features\quiz\pages\CreateQuizPage\index.tsx"
        searches = @(
            @{ search = "'Cần đăng nhập'"; replace = "t('auth.loginRequired', 'Cần đăng nhập')" }
            @{ search = "'Bạn cần đăng nhập để tạo quiz'"; replace = "t('quiz.createLoginRequired', 'Bạn cần đăng nhập để tạo quiz')" }
        )
    }
)

foreach ($file in $files) {
    $filePath = $file.path
    Write-Host "📝 Processing: $filePath" -ForegroundColor Yellow
    
    if (Test-Path $filePath) {
        $content = Get-Content $filePath -Raw
        
        # Add useTranslation import if not exists
        if ($content -notmatch "useTranslation") {
            $content = $content -replace "(import.*from 'react';)", "`$1`nimport { useTranslation } from 'react-i18next';"
        }
        
        # Add useTranslation hook if not exists
        if ($content -notmatch "const.*=.*useTranslation") {
            $content = $content -replace "(const.*:\s*React\.FC.*= \(\)\s*=>\s*\{)", "`$1`n  const { t } = useTranslation();"
        }
        
        # Apply text replacements
        foreach ($replacement in $file.searches) {
            $content = $content -replace [regex]::Escape($replacement.search), $replacement.replace
        }
        
        Set-Content $filePath $content -Encoding UTF8
        Write-Host "✅ Updated: $filePath" -ForegroundColor Green
    } else {
        Write-Host "❌ File not found: $filePath" -ForegroundColor Red
    }
}

Write-Host "🎉 Bulk i18n addition completed!" -ForegroundColor Green
