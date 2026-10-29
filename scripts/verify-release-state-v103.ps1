param([switch]$DryRun)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$Root = Split-Path -Parent $PSScriptRoot
$Version = [string]((Get-Content -Raw -Encoding UTF8 (Join-Path $Root 'app.config.json') | ConvertFrom-Json).version)
if ($Version -ne '1.0.3') { throw "Version guard expected 1.0.3; found $Version" }
if (-not $env:GITHUB_REPOSITORY -or -not $env:GH_TOKEN) { throw 'GITHUB_REPOSITORY and GH_TOKEN are required.' }

# A missing tag/release is normal. Avoid GET on the non-existent object:
# GitHub Actions pwsh can stop on a 404 even if the exit code is checked later.
$releaseTags = @(gh api "repos/$env:GITHUB_REPOSITORY/releases?per_page=100" --jq '.[].tag_name')
if ($LASTEXITCODE -ne 0) { throw 'Failed to list releases; refusing to publish.' }
$Publish = 'true'
if ($releaseTags -contains 'v1.0.3') {
  Write-Host 'v1.0.3 release already exists; leave it unchanged.'
  $Publish = 'false'
} else {
  $tagRefs = @(gh api "repos/$env:GITHUB_REPOSITORY/git/refs/tags?per_page=100" --jq '.[].ref')
  if ($LASTEXITCODE -ne 0) { throw 'Failed to list tags; refusing to publish.' }
  if ($tagRefs -contains 'refs/tags/v1.0.3') {
    throw 'Tag v1.0.3 exists without its GitHub Release. Inspect manually before publishing.'
  }
  Write-Host 'v1.0.3 tag and release are absent; publication may proceed.'
}
if ($DryRun) {
  Write-Host "Read-only release preflight successful. publish=$Publish"
} else {
  if (-not $env:GITHUB_OUTPUT) { throw 'GITHUB_OUTPUT is missing.' }
  "publish=$Publish" | Out-File -FilePath $env:GITHUB_OUTPUT -Encoding utf8 -Append
}
