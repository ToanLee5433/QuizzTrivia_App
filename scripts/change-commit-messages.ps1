#!/usr/bin/env powershell
# Script to change all commit messages to "Noi dung cap nhat"

Write-Host "Changing all commit messages to 'Noi dung cap nhat'..." -ForegroundColor Yellow

# Get the first commit hash
$firstCommit = git log --reverse --oneline | Select-Object -First 1 | ForEach-Object { $_.Split(' ')[0] }
Write-Host "First commit: $firstCommit" -ForegroundColor Green

# Create filter-branch command to change all commit messages
$env:FILTER_BRANCH_SQUELCH_WARNING = 1

git filter-branch --msg-filter 'echo "Noi dung cap nhat"' --force -- --all

Write-Host "All commit messages have been changed!" -ForegroundColor Green
Write-Host "Force pushing to remote..." -ForegroundColor Yellow

git push --force origin main

Write-Host "Completed!" -ForegroundColor Cyan
