# Genera public/Manual-Kostruye-Plus.pdf desde la fuente HTML versionada.
# Uso:  pwsh docs/manual/build.ps1
$ErrorActionPreference = "Stop"
$root   = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)   # raíz del proyecto
$src    = Join-Path $PSScriptRoot "Manual-Kostruye-Plus.html"
$out    = Join-Path $root "public\Manual-Kostruye-Plus.pdf"

$chrome = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $chrome) { throw "No se encontró Chrome ni Edge para renderizar el PDF." }

$srcUrl = "file:///" + ($src -replace '\\','/' -replace ' ','%20')
& $chrome --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf="$out" $srcUrl
Write-Host "Manual generado en: $out"
