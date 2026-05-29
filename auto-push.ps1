# PowerShell script to automatically stage all changes, commit, and push them to GitHub.

# Get the current git status to check for changes
$status = git status --porcelain

if (-not $status) {
    Write-Host "No changes to commit or push." -ForegroundColor Green
    Exit 0
}

# Prompt/Set a commit message
$commitMessage = $args -join " "
if (-not $commitMessage) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $commitMessage = "Auto-commit: updates as of $timestamp"
}

Write-Host "Staging all changes..." -ForegroundColor Cyan
git add -A

Write-Host "Committing changes with message: '$commitMessage'..." -ForegroundColor Cyan
git commit -m $commitMessage

# The post-commit hook we added will automatically trigger git push,
# but we run it explicitly here as well just in case.
Write-Host "Pushing changes to remote GitHub repository..." -ForegroundColor Cyan
$currentBranch = git branch --show-current
git push origin $currentBranch

Write-Host "Successfully completed auto-push!" -ForegroundColor Green
