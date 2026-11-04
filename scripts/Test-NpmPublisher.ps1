#requires -Version 7.4
[CmdletBinding()]
param([Parameter(Mandatory)][string]$WorkDirectory)
$ErrorActionPreference = 'Stop'
# C#はメモリー内でコンパイルする。SDK・NuGet・実資格情報は不要。
Add-Type -Path (Join-Path $PSScriptRoot 'NpmPublisher.cs'), (Join-Path $PSScriptRoot 'NpmPublisher.Tests.cs')
$networkGuard = [Kagayoi.Npm.LoopbackNetworkGuard]::new()
try {
$networkGuard.Verify()
[Kagayoi.Npm.ContractTests]::Run([IO.Path]::GetFullPath($WorkDirectory))

# 現役PowerShell入口も、合成したprovenance入力で確認する。元の環境は必ず戻す。
$context = @{
    GITHUB_SERVER_URL = 'https://github.com'; GITHUB_REPOSITORY = 'fixture/package'
    GITHUB_WORKFLOW_REF = 'fixture/package/.github/workflows/publish.yml@refs/heads/release/1.2.3'
    GITHUB_REF = 'refs/heads/release/1.2.3'; GITHUB_REF_NAME = 'release/1.2.3'
    GITHUB_SHA = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'; GITHUB_EVENT_NAME = 'push'
    GITHUB_REPOSITORY_ID = '1'; GITHUB_REPOSITORY_OWNER_ID = '2'; RUNNER_ENVIRONMENT = 'github-hosted'
    GITHUB_RUN_ID = '3'; GITHUB_RUN_ATTEMPT = '4'
}
$previous = @{}
try {
    foreach ($key in $context.Keys) {
        $previous[$key] = [Environment]::GetEnvironmentVariable($key)
        [Environment]::SetEnvironmentVariable($key, $context[$key])
    }
    $file = Join-Path $WorkDirectory 'valid.tgz'
    $integrity = 'sha512-' + [Convert]::ToBase64String([Security.Cryptography.SHA512]::HashData([IO.File]::ReadAllBytes($file)))
    $result = & (Join-Path $PSScriptRoot 'Publish-Npm.ps1') -PackageFile $file -ExpectedIntegrity $integrity -PrepareOnly
    if ($result.Metadata.name -cne '@fixture/package' -or $result.Statement.subject[0].digest.sha512 -cne (Get-FileHash -LiteralPath $file -Algorithm SHA512).Hash.ToLowerInvariant()) {
        throw 'PowerShell PrepareOnly entry contract failed'
    }
    $result = & (Join-Path $PSScriptRoot 'Publish-Npm.ps1') -PackResultPath (Join-Path $WorkDirectory 'pack-object.json') -PrepareOnly
    if ($result.Metadata.name -cne '@fixture/package') { throw 'PowerShell PackResultPath entry contract failed' }
    Write-Output 'PowerShell PrepareOnly and PackResultPath entry contracts passed'
    Push-Location -LiteralPath $WorkDirectory
    try {
        $relative = & (Join-Path $PSScriptRoot 'Publish-Npm.ps1') -PackageFile 'valid.tgz' -ExpectedIntegrity $integrity -PrepareOnly
        $relativePack = & (Join-Path $PSScriptRoot 'Publish-Npm.ps1') -PackageFile 'ignored-missing.tgz' -ExpectedIntegrity 'sha512-ignored' -PackResultPath 'pack-object.json' -PrepareOnly
        if ($relative.Metadata.name -cne '@fixture/package' -or $relativePack.Metadata.name -cne '@fixture/package') { throw 'PowerShell relative path entry contract failed' }
        Write-Output 'PowerShell Set-Location relative archive and pack-result entry contracts passed'
    } finally { Pop-Location }
    $source = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'NpmPublisher.cs'))
    $marker = 'manifest["_id"] = name + "@" + version;'
    if (-not $source.Contains($marker)) { throw 'Source-version fixture marker missing' }
    $alternate = $source.Replace($marker, ($marker + ' manifest["fixtureSourceVersion"] = "alternate";'))
    foreach ($entry in @(@('source-original', $source), @('source-alternate', $alternate))) {
        $directory = Join-Path $WorkDirectory $entry[0]
        [IO.Directory]::CreateDirectory($directory) | Out-Null
        [IO.File]::WriteAllText((Join-Path $directory 'NpmPublisher.cs'), $entry[1], [Text.UTF8Encoding]::new($false))
        Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'Publish-Npm.ps1') -Destination (Join-Path $directory 'Publish-Npm.ps1')
    }
    foreach ($version in 'source-original', 'source-alternate', 'source-original') {
        $result = & (Join-Path (Join-Path $WorkDirectory $version) 'Publish-Npm.ps1') -PackageFile $file -ExpectedIntegrity $integrity -PrepareOnly
        $markerValue = $result.Metadata.versions['1.2.3'].fixtureSourceVersion
        if (($version -eq 'source-alternate' -and $markerValue -cne 'alternate') -or ($version -eq 'source-original' -and $null -ne $markerValue)) {
            throw 'Publisher reused an incompatible source version'
        }
    }
    Write-Output 'PowerShell same-version reload and alternate-source entry contracts passed'
} finally {
    foreach ($key in $previous.Keys) { [Environment]::SetEnvironmentVariable($key, $previous[$key]) }
}
} finally {
    $networkGuard.Dispose()
}
