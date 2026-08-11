# fix-superpowers-windows.ps1
# Patches Cursor Superpowers plugin hooks-cursor.json on Windows so SessionStart
# runs via run-hook.cmd instead of opening the extensionless session-start file.
#
# Symptom: every new Agent chat shows Windows "Select an app to open 'session-start'".
# Upstream: https://github.com/obra/superpowers/issues/871
#
# Usage (from any directory):
#   powershell -ExecutionPolicy Bypass -File path/to/agent-quality-loop/scripts/fix-superpowers-windows.ps1

$ErrorActionPreference = 'Stop'

$old = '"command": "./hooks/session-start"'
$new = '"command": "./hooks/run-hook.cmd session-start"'

$roots = @(
    (Join-Path $env:USERPROFILE '.cursor\plugins\local\superpowers\hooks\hooks-cursor.json'),
    (Join-Path $env:USERPROFILE '.cursor\plugins\cache\cursor-public\superpowers\*\hooks\hooks-cursor.json')
)

$targets = @()
foreach ($pattern in $roots) {
    $parent = Split-Path $pattern -Parent
    if ($pattern -like '*\*') {
        $targets += Get-ChildItem -Path $parent -Filter 'hooks-cursor.json' -Recurse -ErrorAction SilentlyContinue
    } elseif (Test-Path $pattern) {
        $targets += Get-Item $pattern
    }
}

$targets = $targets | Sort-Object FullName -Unique
if (-not $targets) {
    Write-Host 'No Superpowers hooks-cursor.json found under ~/.cursor/plugins/.'
    Write-Host 'If the popup persists, disable the Superpowers plugin from the Cursor plugin panel, or see https://github.com/obra/superpowers/issues/871'
    exit 0
}

$patched = 0
$skipped = 0
foreach ($file in $targets) {
    $content = Get-Content -Raw -LiteralPath $file.FullName
    if ($content -match [regex]::Escape($new)) {
        Write-Host "OK (already patched): $($file.FullName)"
        $skipped++
        continue
    }
    if ($content -notmatch [regex]::Escape($old)) {
        Write-Host "SKIP (unexpected format): $($file.FullName)"
        $skipped++
        continue
    }
    $updated = $content.Replace($old, $new)
    Set-Content -LiteralPath $file.FullName -Value $updated -NoNewline -Encoding utf8
    Write-Host "PATCHED: $($file.FullName)"
    $patched++
}

Write-Host ""
Write-Host "Done. Patched: $patched; skipped: $skipped."
Write-Host "Restart Cursor (or start a new Agent chat) for the change to take effect."
