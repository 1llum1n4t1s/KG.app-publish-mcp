#requires -Version 7.4
[CmdletBinding()]
param([Parameter(Mandatory)][string] $PackageFile)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$archive = (Resolve-Path -LiteralPath $PackageFile).ProviderPath
$manifestJson = Get-Content -Raw -LiteralPath (Join-Path $root 'package.json')
$manifest = $manifestJson | ConvertFrom-Json -AsHashtable
$server = Get-Content -Raw -LiteralPath (Join-Path $root 'server.json') | ConvertFrom-Json -AsHashtable
$lock = Get-Content -Raw -LiteralPath (Join-Path $root 'package-lock.json') | ConvertFrom-Json -AsHashtable
foreach ($version in @($server.version, $server.packages[0].version, $lock.version, $lock.packages[''].version)) {
    if ($version -cne $manifest.version) { throw 'Package metadata versions differ' }
}
$expected = [Collections.Generic.Dictionary[string, string]]::new([StringComparer]::Ordinal)
foreach ($file in @(Get-ChildItem -LiteralPath (Join-Path $root 'dist') -File -Recurse) + @(Get-ChildItem -LiteralPath $root -File -Filter 'README*.md') + @(Get-Item -LiteralPath (Join-Path $root 'LICENSE'))) {
    $relative = [IO.Path]::GetRelativePath($root, $file.FullName).Replace('\', '/')
    $expected.Add('package/' + $relative, $file.FullName)
}
$expected.Add('package/package.json', (Join-Path $root 'package.json'))
$seen = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
$archiveBytes = [IO.File]::ReadAllBytes($archive)
$stream = [IO.MemoryStream]::new($archiveBytes, $false)
try {
    $gzip = [IO.Compression.GZipStream]::new($stream, [IO.Compression.CompressionMode]::Decompress)
    try {
        $reader = [System.Formats.Tar.TarReader]::new($gzip)
        try {
            while ($entry = $reader.GetNextEntry()) {
                if ($entry.EntryType -notin @([System.Formats.Tar.TarEntryType]::RegularFile, [System.Formats.Tar.TarEntryType]::V7RegularFile)) { throw "Unexpected archive entry type: $($entry.Name)" }
                if ($entry.Name -cmatch '(^|/)(?:\.env|secrets\.json|test|node_modules)(/|$)|\.(?:p8|pem|key|pfx)$') { throw "Forbidden archive entry: $($entry.Name)" }
                if (-not $expected.ContainsKey($entry.Name) -or -not $seen.Add($entry.Name)) { throw "Unexpected or duplicate archive entry: $($entry.Name)" }
                $buffer = [IO.MemoryStream]::new()
                try { $entry.DataStream.CopyTo($buffer); $bytes = $buffer.ToArray() } finally { $buffer.Dispose() }
                if ($entry.Name -ceq 'package/package.json') {
                    # Bun may reformat JSON; only whitespace and object key order may differ.
                    $packed = [System.Text.Json.Nodes.JsonNode]::Parse([Text.Encoding]::UTF8.GetString($bytes))
                    $source = [System.Text.Json.Nodes.JsonNode]::Parse($manifestJson)
                    if (-not [System.Text.Json.Nodes.JsonNode]::DeepEquals($packed, $source)) { throw 'Archive manifest differs from package.json' }
                } elseif (-not [Linq.Enumerable]::SequenceEqual[byte]($bytes, [IO.File]::ReadAllBytes($expected[$entry.Name]))) { throw "Archive contents differ: $($entry.Name)" }
                if ($entry.Name -ceq 'package/dist/cli.js' -and (([int]$entry.Mode -band 73) -eq 0)) { throw 'Archive CLI is not executable' }
            }
        } finally { $reader.Dispose() }
    } finally { $gzip.Dispose() }
} finally { $stream.Dispose() }
foreach ($required in @('package/dist/cli.js', 'package/dist/index.js', 'package/dist/google/client.js', 'package/dist/apple/client.js', 'package/LICENSE', 'package/README.md')) {
    if (-not $seen.Contains($required)) { throw "Archive is missing required file: $required" }
}
if ($seen.Count -ne $expected.Count) { throw 'Archive is missing expected files' }
$integrity = 'sha512-' + [Convert]::ToBase64String([Security.Cryptography.SHA512]::HashData($archiveBytes))
[pscustomobject]@{ PackageFile = $archive; Integrity = $integrity; Files = $seen.Count }
