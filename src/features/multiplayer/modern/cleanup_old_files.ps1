# 🧹 Cleanup Old Multiplayer Components
# Run this script to remove duplicate/old files

Write-Host "🧹 Starting cleanup of old multiplayer components..." -ForegroundColor Cyan
Write-Host ""

$rootPath = "src\features\multiplayer\modern\components"
$filesToRemove = @(
    "$rootPath\ModernQuizQuestion.tsx",
    "$rootPath\ModernPlayerControls.tsx",
    "$rootPath\ModernPowerUpsPanel.tsx",
    "$rootPath\ModernHostControlPanel.tsx",
    "$rootPath\ModernAnswerResultAnimation.tsx",
    "$rootPath\ModernLiveLeaderboard.tsx",
    "$rootPath\MemoizedPlayerCard.tsx"
)

$removed = 0
$notFound = 0

foreach ($file in $filesToRemove) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "✅ Removed: $file" -ForegroundColor Green
        $removed++
    } else {
        Write-Host "⚠️  Not found: $file" -ForegroundColor Yellow
        $notFound++
    }
}

Write-Host ""
Write-Host "📊 Cleanup Summary:" -ForegroundColor Cyan
Write-Host "   Removed: $removed files" -ForegroundColor Green
Write-Host "   Not found: $notFound files" -ForegroundColor Yellow
Write-Host ""
Write-Host "✅ Cleanup completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Update ModernRoomLobby.tsx (see INTEGRATION_READY.md)"
Write-Host "   2. Test the game flow"
Write-Host "   3. Enjoy! 🎮"
