#requires -Version 7.2
[CmdletBinding(DefaultParameterSetName='Version')]
param(
    [Parameter(Mandatory,ParameterSetName='Version')][string]$Version,
    [Parameter(Mandatory,ParameterSetName='File')][string]$VersionFile,
    [string]$PnpmVersion,
    [string]$NpmVersion
)
$ErrorActionPreference='Stop'
if (![Runtime.InteropServices.RuntimeInformation]::IsOSPlatform([Runtime.InteropServices.OSPlatform]::Linux) -or [Runtime.InteropServices.RuntimeInformation]::OSArchitecture -ne [Runtime.InteropServices.Architecture]::X64) { throw 'Node build bootstrap requires Linux x64' }
if (!$env:RUNNER_TEMP -or !$env:GITHUB_PATH) { throw 'GitHub runner paths are required' }
if ($VersionFile) {
    if ($VersionFile.EndsWith('.json')) { $Version=(Get-Content -LiteralPath $VersionFile -Raw | ConvertFrom-Json).volta.node }
    else { $Version=(Get-Content -LiteralPath $VersionFile -Raw).Trim() }
}
if ($Version -notmatch '^v?\d+(?:\.\d+){0,2}$' -or ($PnpmVersion -and $PnpmVersion -notmatch '^\d+(?:\.\d+){0,2}$') -or ($NpmVersion -and $NpmVersion -notmatch '^\d+(?:\.\d+){0,2}$')) { throw 'Invalid Node, npm, or pnpm version selector' }
$Version=$Version.TrimStart('v')
$client=[Net.Http.HttpClient]::new([Net.Http.HttpClientHandler]@{AllowAutoRedirect=$false})
$client.Timeout=[TimeSpan]::FromMinutes(5)
function Read-Official([string]$Url) {
    $response=$client.GetAsync($Url).GetAwaiter().GetResult()
    try {
        if (!$response.IsSuccessStatusCode) { throw "Official Node download failed: HTTP $([int]$response.StatusCode)" }
        return $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
    } finally { $response.Dispose() }
}
try {
    if (($Version -split '\.').Count -lt 3) {
        $versions=Read-Official 'https://nodejs.org/dist/index.json' | ConvertFrom-Json
        $prefix='^v'+[Regex]::Escape($Version)+'(?:\.|$)'
        $selected=@($versions | Where-Object { $_.version -match $prefix -and 'linux-x64' -in $_.files } | Select-Object -First 1)
        if ($selected.Count -ne 1) { throw 'No official Node release matches selector' }
        $Version=$selected[0].version.TrimStart('v')
    }
    $archive="node-v$Version-linux-x64.tar.xz"
    $checksums=Read-Official "https://nodejs.org/dist/v$Version/SHASUMS256.txt"
    $pattern='(?m)^([a-f0-9]{64})  '+[Regex]::Escape($archive)+'\r?$'
    $matchesFound=[Regex]::Matches($checksums,$pattern)
    if ($matchesFound.Count -ne 1) { throw 'Node archive checksum is missing or ambiguous' }
    $target=Join-Path $env:RUNNER_TEMP ('node-build-'+[Guid]::NewGuid().ToString('N'))
    [IO.Directory]::CreateDirectory($target) | Out-Null
    $archivePath=Join-Path $target $archive
    $downloadDeadline=[Threading.CancellationTokenSource]::new([TimeSpan]::FromMinutes(5))
    $response=$null
    try {
        $response=$client.GetAsync("https://nodejs.org/dist/v$Version/$archive",[Net.Http.HttpCompletionOption]::ResponseHeadersRead,$downloadDeadline.Token).GetAwaiter().GetResult()
        if (!$response.IsSuccessStatusCode) { throw "Node archive download failed: HTTP $([int]$response.StatusCode)" }
        $stream=[IO.File]::Open($archivePath,'CreateNew','Write','None')
        try { $response.Content.CopyToAsync($stream,$downloadDeadline.Token).GetAwaiter().GetResult() } finally { $stream.Dispose() }
    } finally { if ($null -ne $response) { $response.Dispose() }; $downloadDeadline.Dispose() }
    if ((Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant() -cne $matchesFound[0].Groups[1].Value) { throw 'Node archive SHA-256 mismatch' }
    & tar -xJf $archivePath -C $target --strip-components=1
    if ($LASTEXITCODE -ne 0) { throw 'Node archive extraction failed' }
    $bin=Join-Path $target 'bin'
    $env:PATH=$bin+[IO.Path]::PathSeparator+$env:PATH
    # npm/pnpm は製品のビルド・包装用にだけ導入する。
    if ($NpmVersion) {
        & (Join-Path $bin 'npm') install --global --prefix $target "npm@$NpmVersion" --ignore-scripts --no-audit --no-fund
        if ($LASTEXITCODE -ne 0) { throw 'Build npm installation failed' }
    }
    if ($PnpmVersion) {
        & (Join-Path $bin 'npm') install --global --prefix $target "pnpm@$PnpmVersion" --ignore-scripts --no-audit --no-fund
        if ($LASTEXITCODE -ne 0) { throw 'Build pnpm installation failed' }
    }
    $bin | Add-Content -LiteralPath $env:GITHUB_PATH -Encoding utf8
    Write-Output "Build tools prepared: Node $Version, npm $NpmVersion, pnpm $PnpmVersion"
} finally { $client.Dispose() }
