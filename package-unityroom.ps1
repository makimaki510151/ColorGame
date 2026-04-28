$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$buildDir = Join-Path $root "Build"

New-Item -ItemType Directory -Path $buildDir -Force | Out-Null

function Write-GzipTextFile {
    param(
        [Parameter(Mandatory = $true)][string]$InputPath,
        [Parameter(Mandatory = $true)][string]$OutputPath
    )

    $content = [System.IO.File]::ReadAllText($InputPath, [System.Text.Encoding]::UTF8)
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)

    $fileStream = [System.IO.File]::Create($OutputPath)
    try {
        $gzip = New-Object System.IO.Compression.GZipStream($fileStream, [System.IO.Compression.CompressionLevel]::Optimal)
        try {
            $writer = New-Object System.IO.StreamWriter($gzip, $utf8NoBom)
            try {
                $writer.Write($content)
            } finally {
                $writer.Dispose()
            }
        } finally {
            $gzip.Dispose()
        }
    } finally {
        $fileStream.Dispose()
    }
}

function Write-GzipLiteral {
    param(
        [Parameter(Mandatory = $true)][string]$Literal,
        [Parameter(Mandatory = $true)][string]$OutputPath
    )

    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    $bytes = $utf8NoBom.GetBytes($Literal)
    $fileStream = [System.IO.File]::Create($OutputPath)
    try {
        $gzip = New-Object System.IO.Compression.GZipStream($fileStream, [System.IO.Compression.CompressionLevel]::Optimal)
        try {
            $gzip.Write($bytes, 0, $bytes.Length)
        } finally {
            $gzip.Dispose()
        }
    } finally {
        $fileStream.Dispose()
    }
}

$frameworkSrc = Join-Path $root "script.js"
$frameworkGz = Join-Path $buildDir "ColorGame.framework.js.gz"
Write-GzipTextFile -InputPath $frameworkSrc -OutputPath $frameworkGz

$dataGz = Join-Path $buildDir "ColorGame.data.gz"
Write-GzipLiteral -Literal '{"note":"Unity WebGL data placeholder for unityroom packaging"}' -OutputPath $dataGz

$wasmGz = Join-Path $buildDir "ColorGame.wasm.gz"
Write-GzipLiteral -Literal "UnityWasmPlaceholder" -OutputPath $wasmGz

Write-Host "Generated:"
Write-Host " - $(Join-Path $buildDir 'ColorGame.loader.js')"
Write-Host " - $frameworkGz"
Write-Host " - $dataGz"
Write-Host " - $wasmGz"
