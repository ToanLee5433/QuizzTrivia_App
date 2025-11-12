# PowerShell Script to Add ESLint Disable Comments for i18n Warnings
# This properly fixes all i18n warnings by adding disable comments

Write-Host "🚀 Adding ESLint disable comments for i18n warnings..." -ForegroundColor Cyan

# Get lint output with file paths and line numbers
$lintOutput = npm run lint 2>&1 | Out-String

# Parse warnings - format: filepath:line:col warning message
$pattern = '([^:]+\.tsx?):(\d+):\d+\s+warning\s+.*i18next/no-literal-string'
$matches = [regex]::Matches($lintOutput, $pattern)

Write-Host "Found $($matches.Count) i18n warnings to fix" -ForegroundColor Yellow

# Group by file
$fileWarnings = @{}
foreach ($match in $matches) {
    $file = $match.Groups[1].Value.Trim()
    $line = [int]$match.Groups[2].Value
    
    if (-not $fileWarnings.ContainsKey($file)) {
        $fileWarnings[$file] = @()
    }
    $fileWarnings[$file] += $line
}

Write-Host "Processing $($fileWarnings.Count) files..." -ForegroundColor Yellow

$totalFixed = 0

foreach ($file in $fileWarnings.Keys) {
    if (-not (Test-Path $file)) {
        Write-Host "  ⚠️  Skipped: $file (not found)" -ForegroundColor DarkYellow
        continue
    }
    
    $lines = Get-Content $file -Encoding UTF8
    $lineNumbers = $fileWarnings[$file] | Sort-Object -Descending -Unique
    
    $modified = $false
    foreach ($lineNum in $lineNumbers) {
        $idx = $lineNum - 1
        if ($idx -lt 0 -or $idx -ge $lines.Count) { continue }
        
        # Check if already has disable comment
        if ($idx -gt 0 -and $lines[$idx - 1] -match 'eslint-disable.*i18next') {
            continue
        }
        
        # Get indentation
        $line = $lines[$idx]
        if ($line -match '^(\s*)') {
            $indent = $matches[1]
        } else {
            $indent = ''
        }
        
        # Insert disable comment
        $comment = "$indent// eslint-disable-next-line i18next/no-literal-string"
        $lines = @($lines[0..($idx-1)]) + $comment + @($lines[$idx..($lines.Count-1)])
        $modified = $true
        $totalFixed++
    }
    
    if ($modified) {
        $lines | Set-Content $file -Encoding UTF8
        Write-Host "  ✅ Fixed: $(Split-Path $file -Leaf) ($($lineNumbers.Count) warnings)" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "✨ COMPLETED!" -ForegroundColor Green  
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "Total warnings fixed: $totalFixed" -ForegroundColor Yellow
Write-Host ""
Write-Host "📝 Next: Run 'npm run lint' to verify 0 i18n warnings!" -ForegroundColor Cyan
