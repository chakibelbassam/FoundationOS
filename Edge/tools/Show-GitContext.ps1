<#
.SYNOPSIS
Print the work item, branch, change count and base distance before a watched Git operation.

.EXAMPLE
.\Edge\tools\Show-GitContext.ps1
#>
[CmdletBinding()]
param(
    [string]$Base = 'origin/codex/development-workspace'
)

$ErrorActionPreference = 'Stop'

$root = git rev-parse --show-toplevel
if (-not $root) { throw 'Not inside a Git repository.' }

Push-Location $root
try {
    $branch = git branch --show-current
    if (-not $branch) { $branch = '(detached)' }

    $item = if ($branch -match '(WI-\d{3,})') { $Matches[1].ToUpperInvariant() } else { 'no work item' }
    $changes = @(git status --porcelain)
    $state = if ($changes.Count -eq 0) { 'clean' } else { "$($changes.Count) changed" }

    $counts = 'base not fetched'
    if (git rev-parse --verify --quiet $Base) {
        $ahead = git rev-list --count "$Base..HEAD"
        $behind = git rev-list --count "HEAD..$Base"
        $counts = "ahead $ahead, behind $behind"
    }

    $line = "[$item] $branch | $state | $counts"
    Write-Host ''
    Write-Host $line -ForegroundColor Cyan
    Write-Host ('-' * $line.Length) -ForegroundColor DarkCyan
}
finally {
    Pop-Location
}
