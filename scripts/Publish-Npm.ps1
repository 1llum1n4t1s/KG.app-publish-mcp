#requires -Version 7.4
<#
Publishes an already verified npm archive using GitHub OIDC and native cosign.
The protocol implementation is NpmPublisher.cs, compiled in memory by PowerShell.
PrepareOnly performs no network requests and returns the unsigned publication inputs.
No Node.js, npm CLI, .NET SDK or NuGet packages are required for publication.
#>
[CmdletBinding()]
param(
    [string] $PackageFile,
    [string] $ExpectedIntegrity,
    [string] $PackResultPath,
    [switch] $PrepareOnly
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
try {
    # PowerShellの現在位置はprocess cwdと異なるため、相対入力は入口で解決する。
    if ($PackResultPath) { $PackResultPath = (Resolve-Path -LiteralPath $PackResultPath -ErrorAction Stop).ProviderPath }
    elseif ($PackageFile) { $PackageFile = (Resolve-Path -LiteralPath $PackageFile -ErrorAction Stop).ProviderPath }
    # 同じpwsh内でも、異なるソース版が既存の型を再利用しないよう区別する。
    $sourceBytes = [IO.File]::ReadAllBytes((Join-Path $PSScriptRoot 'NpmPublisher.cs'))
    $sourceHash = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($sourceBytes)).ToLowerInvariant()
    $sourceNamespace = 'Kagayoi.Npm.Source' + $sourceHash
    $publisherType = ($sourceNamespace + '.Publisher') -as [type]
    if (-not $publisherType) {
        $source = [Text.UTF8Encoding]::new($false, $true).GetString($sourceBytes)
        if ([regex]::Matches($source, 'namespace Kagayoi\.Npm\b').Count -ne 1) { throw 'Unexpected publisher namespace' }
        Add-Type -TypeDefinition $source.Replace('namespace Kagayoi.Npm', ('namespace ' + $sourceNamespace))
        $publisherType = ($sourceNamespace + '.Publisher') -as [type]
    }
    $result = $publisherType::Run($PackageFile, $ExpectedIntegrity, $PackResultPath, [bool]$PrepareOnly)
    if ($PrepareOnly) { $result | ConvertFrom-Json -AsHashtable }
    else { Write-Host $result }
} catch {
    Write-Error $_.Exception.Message -ErrorAction Continue
    exit 1
}
