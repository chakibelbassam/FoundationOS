[CmdletBinding()]
param(
    [Parameter(Mandatory,Position=0)]
    [ValidateSet('qa','browser','publish','watch','changed')]
    [string]$Tool,
    [Parameter(Position=1)]
    [string]$Target,
    [string]$ExpectedVersion,
    [switch]$ResolveOnly
)
$ErrorActionPreference='Stop'
if (($ExpectedVersion -or $ResolveOnly) -and $Tool -ne 'qa') { throw 'ExpectedVersion applies to QA.' }

function Get-RuntimeDependencies {
    $candidates = @()
    if ($env:FOUNDATIONOS_CODEX_RUNTIME) {
        $candidates += $env:FOUNDATIONOS_CODEX_RUNTIME
        $candidates += Join-Path $env:FOUNDATIONOS_CODEX_RUNTIME 'dependencies'
    }
    $userProfile = [Environment]::GetFolderPath('UserProfile')
    if ($userProfile) {
        $candidates += Join-Path $userProfile '.cache\codex-runtimes\codex-primary-runtime\dependencies'
    }
    foreach ($candidate in $candidates) {
        if ($candidate -and (Test-Path -LiteralPath $candidate -PathType Container)) { return $candidate }
    }
    $poppler = Get-Command pdftoppm -ErrorAction SilentlyContinue
    if ($poppler) {
        $folder = [IO.DirectoryInfo]::new((Split-Path $poppler.Source))
        while ($folder -and $folder.Name -ne 'dependencies') { $folder = $folder.Parent }
        if ($folder) { return $folder.FullName }
    }
    return $null
}

$dependencies = Get-RuntimeDependencies

if ($Tool -eq 'browser') {
    if ($dependencies) {
        $modules = Join-Path $dependencies 'node\node_modules'
        if (Test-Path (Join-Path $modules 'playwright')) {
            $env:NODE_PATH = (@($env:NODE_PATH, $modules) | Where-Object { $_ }) -join [IO.Path]::PathSeparator
        }
    }
    & node (Join-Path $PSScriptRoot 'browser-qa.cjs') $Target
    exit $LASTEXITCODE
}

$candidates = @()
if ($env:FOUNDATIONOS_PYTHON) { $candidates += $env:FOUNDATIONOS_PYTHON }
if ($dependencies) { $candidates += Join-Path $dependencies 'python\python.exe' }
foreach ($name in 'python','python3') {
    $found = Get-Command $name -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found -and $found.Source -notmatch 'Microsoft\\WindowsApps\\') { $candidates += $found.Source }
}
$launcher = Get-Command py -ErrorAction SilentlyContinue
if ($launcher) { $candidates += $launcher.Source }
$probe = if ($Tool -eq 'qa') { 'import sys; assert sys.version_info.major == 3' } else { 'import docx' }
foreach ($candidate in ($candidates | Select-Object -Unique)) {
    if (!(Test-Path -LiteralPath $candidate -PathType Leaf)) { continue }
    $prefix = @()
    if ([IO.Path]::GetFileName($candidate) -eq 'py.exe') { $prefix = @('-3') }
    & $candidate @prefix -c $probe 2>$null
    if ($LASTEXITCODE -eq 0) {
        $script = if ($Tool -eq 'qa') { 'qa.py' } else { 'publish.py' }
        $params = @('-B', (Join-Path $PSScriptRoot $script))
        if ($Tool -eq 'watch') { $params += '--watch' }
        if ($Tool -eq 'changed') { $params += '--changed' }
        if ($Target) { $params += $Target }
        if ($ResolveOnly) { $params += '--resolve-only' }
        if ($ExpectedVersion) { $params += @('--expect-version', $ExpectedVersion) }
        & $candidate @prefix @params
        exit $LASTEXITCODE
    }
}
throw "A compatible Python was not found. Set FOUNDATIONOS_PYTHON to a Python 3 executable. Publishing also needs python-docx and LibreOffice."
