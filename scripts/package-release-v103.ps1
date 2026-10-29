# Package verified v1.0.3 standalone builds for a GitHub Release.
# This script does not create or move Git tags or releases.
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$Root = Split-Path -Parent $PSScriptRoot
Push-Location $Root
try {
  $Config = Get-Content -Raw -Encoding UTF8 'app.config.json' | ConvertFrom-Json
  if ([string]$Config.version -ne '1.0.3') { throw "Expected app version 1.0.3; found $($Config.version)" }
  foreach ($required in @(
    'dist/index.html',
    'dist/index.self-extract.html',
    'dist/dependency-manifest.json',
    'dist/self-extract-manifest.json',
    'README.md',
    'README.ja.md',
    'CHANGELOG.md',
    'APP_SPEC.md',
    'LICENSE',
    'THIRD_PARTY_NOTICES.md'
  )) {
    if (-not (Test-Path -LiteralPath $required -PathType Leaf)) { throw "Missing release input: $required" }
  }
  $ReadableHtml = Get-Content -Raw -Encoding UTF8 'dist/index.html'
  if (-not $ReadableHtml.Contains('"version":"1.0.3"')) {
    throw 'Built HTML does not embed app version 1.0.3.'
  }
  $Manifest = Get-Content -Raw -Encoding UTF8 'dist/dependency-manifest.json' | ConvertFrom-Json
  if ([string]$Manifest.app.version -ne '1.0.3') {
    throw 'Dependency manifest version does not match 1.0.3.'
  }

  $Output = Join-Path $Root 'release-out'
  $Staging = Join-Path $Output 'package-v1.0.3'
  if (Test-Path -LiteralPath $Staging) { Remove-Item -LiteralPath $Staging -Recurse -Force }
  New-Item -ItemType Directory -Force -Path $Output, $Staging, (Join-Path $Staging 'assets') | Out-Null

  $Readable = Join-Path $Output 'htmlapps-wireless-sensor-v1.0.3.html'
  $SelfExtract = Join-Path $Output 'htmlapps-wireless-sensor-v1.0.3.self-extract.html'
  $Archive = Join-Path $Output 'htmlapps-wireless-sensor-v1.0.3.zip'
  $ChecksumFile = Join-Path $Output 'SHA256SUMS.txt'

  Copy-Item -LiteralPath 'dist/index.html' -Destination $Readable
  Copy-Item -LiteralPath 'dist/index.self-extract.html' -Destination $SelfExtract
  $Packages = @{
    'index.html' = 'dist/index.html'
    'index.self-extract.html' = 'dist/index.self-extract.html'
    'dependency-manifest.json' = 'dist/dependency-manifest.json'
    'self-extract-manifest.json' = 'dist/self-extract-manifest.json'
    'app.config.json' = 'app.config.json'
    'README.md' = 'README.md'
    'README.ja.md' = 'README.ja.md'
    'CHANGELOG.md' = 'CHANGELOG.md'
    'APP_SPEC.md' = 'APP_SPEC.md'
    'LICENSE' = 'LICENSE'
    'THIRD_PARTY_NOTICES.md' = 'THIRD_PARTY_NOTICES.md'
  }
  foreach ($dest in $Packages.Keys) {
    Copy-Item -LiteralPath $Packages[$dest] -Destination (Join-Path $Staging $dest)
  }
  if (Test-Path -LiteralPath 'dist/build-size-report.json') {
    Copy-Item -LiteralPath 'dist/build-size-report.json' -Destination (Join-Path $Staging 'build-size-report.json')
  }
  $Screenshots = @(Get-ChildItem -Path 'assets' -Filter 'screenshot*.png' -File)
  if ($Screenshots.Count -lt 1) { throw 'Release ZIP must include screenshots.' }
  foreach ($Screenshot in $Screenshots) {
    Copy-Item -LiteralPath $Screenshot.FullName -Destination (Join-Path $Staging 'assets')
  }
  if (Test-Path -LiteralPath $Archive) { Remove-Item -LiteralPath $Archive -Force }
  Compress-Archive -Path (Join-Path $Staging '*') -DestinationPath $Archive -CompressionLevel Optimal

  function Get-Sha256FileHex([string]$Path) {
    $Sha = [System.Security.Cryptography.SHA256]::Create()
    try {
      $Bytes = [System.IO.File]::ReadAllBytes($Path)
      return (($Sha.ComputeHash($Bytes) | ForEach-Object { $_.ToString('x2') }) -join '')
    } finally {
      $Sha.Dispose()
    }
  }
  $Assets = @($Readable, $SelfExtract, $Archive)
  $Checksums = @($Assets | ForEach-Object {
    (Get-Sha256FileHex $_) + '  ' + [System.IO.Path]::GetFileName($_)
  })
  [System.IO.File]::WriteAllLines($ChecksumFile, [string[]]$Checksums, (New-Object System.Text.UTF8Encoding($false)))
  foreach ($Asset in $Assets) {
    $expected = (Get-Sha256FileHex $Asset) + '  ' + [System.IO.Path]::GetFileName($Asset)
    if ($Checksums -notcontains $expected) { throw "Checksum mismatch: $Asset" }
  }
  foreach ($Asset in @($Assets + $ChecksumFile)) {
    if ((Get-Item -LiteralPath $Asset).Length -le 0) { throw "Empty release asset: $Asset" }
  }
  $expanded = Join-Path $Output 'verify-v1.0.3'
  if (Test-Path -LiteralPath $expanded) { Remove-Item -LiteralPath $expanded -Recurse -Force }
  Expand-Archive -LiteralPath $Archive -DestinationPath $expanded
  foreach ($name in @('index.html','index.self-extract.html','dependency-manifest.json','self-extract-manifest.json','README.md','README.ja.md','LICENSE','assets/screenshot.png')) {
    if (-not (Test-Path -LiteralPath (Join-Path $expanded $name) -PathType Leaf)) { throw "Release ZIP is missing: $name" }
  }
  Remove-Item -LiteralPath $expanded -Recurse -Force
  Remove-Item -LiteralPath $Staging -Recurse -Force
  Write-Host '[OK] v1.0.3 release package: 2 HTML files, ZIP, and SHA256SUMS.txt.'
} finally {
  Pop-Location
}
