[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repoRoot = $PSScriptRoot
$configured = if ($env:TIDYSENSE_TEST_POSTGRES) { $env:TIDYSENSE_TEST_POSTGRES } else {
    [Environment]::GetEnvironmentVariable('TIDYSENSE_TEST_POSTGRES', 'User')
}
if ([string]::IsNullOrWhiteSpace($configured)) {
    throw 'TIDYSENSE_TEST_POSTGRES is required for the isolated browser test database.'
}

$psql = if (Get-Command psql -ErrorAction SilentlyContinue) {
    (Get-Command psql).Source
} else {
    'C:\Program Files\PostgreSQL\18\bin\psql.exe'
}
if (-not (Test-Path -LiteralPath $psql)) { throw 'psql was not found.' }

$connection = [System.Data.Common.DbConnectionStringBuilder]::new()
$connection.set_ConnectionString($configured)
$databaseName = 'tidysense_auth_e2e_' + [Guid]::NewGuid().ToString('N').Substring(0, 12)
$connection['Database'] = $databaseName
$previous = @{
    PGHOST = $env:PGHOST
    PGPORT = $env:PGPORT
    PGUSER = $env:PGUSER
    PGPASSWORD = $env:PGPASSWORD
    ASPNETCORE_ENVIRONMENT = $env:ASPNETCORE_ENVIRONMENT
    ConnectionStrings__DefaultConnection = $env:ConnectionStrings__DefaultConnection
    Jwt__SigningKey = $env:Jwt__SigningKey
    Otp__HashingKey = $env:Otp__HashingKey
    Database__MigrateOnStart = $env:Database__MigrateOnStart
    VITE_API_PROXY_TARGET = $env:VITE_API_PROXY_TARGET
}
$backendProcess = $null
$databaseCreated = $false
$stdout = [System.IO.Path]::GetTempFileName()
$stderr = [System.IO.Path]::GetTempFileName()

try {
    $env:PGHOST = [string]$connection['Host']
    $env:PGPORT = [string]$connection['Port']
    $env:PGUSER = [string]$connection['Username']
    $env:PGPASSWORD = [string]$connection['Password']
    Write-Host 'Creating isolated PostgreSQL database...'
    & $psql --dbname postgres --no-password --set ON_ERROR_STOP=1 --command "CREATE DATABASE $databaseName;"
    if ($LASTEXITCODE -ne 0) { throw 'Could not create the isolated browser test database.' }
    $databaseCreated = $true

    $env:ASPNETCORE_ENVIRONMENT = 'Development'
    $env:ConnectionStrings__DefaultConnection = $connection.get_ConnectionString()
    $env:Jwt__SigningKey = 'auth-e2e-signing-key-at-least-32-characters'
    $env:Otp__HashingKey = 'auth-e2e-hashing-key-at-least-32-characters'
    $env:Database__MigrateOnStart = 'true'
    $env:VITE_API_PROXY_TARGET = 'https://127.0.0.1:7076'
    Write-Host 'Building isolated backend...'
    & dotnet build (Join-Path $repoRoot 'backend\TidySense.csproj') --no-restore -p:OutputPath=bin/auth-e2e/ -p:OpenApiGenerateDocuments=false
    if ($LASTEXITCODE -ne 0) { throw 'Backend build failed.' }

    $assembly = Join-Path $repoRoot 'backend\bin\auth-e2e\TidySense.dll'
    Write-Host 'Starting isolated backend...'
    $backendProcess = Start-Process -FilePath 'dotnet' -ArgumentList @($assembly, '--urls', 'https://127.0.0.1:7076') -WorkingDirectory (Join-Path $repoRoot 'backend') -PassThru -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr
    $ready = $false
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        if ($backendProcess.HasExited) { break }
        & curl.exe --silent --insecure --fail --max-time 2 https://127.0.0.1:7076/health/ready | Out-Null
        if ($LASTEXITCODE -eq 0) { $ready = $true; break }
        Start-Sleep -Seconds 1
    }
    if (-not $ready) {
        $failure = ((Get-Content -LiteralPath $stderr -Tail 8 -ErrorAction SilentlyContinue) -join ' ') -replace 'Password=[^;\s]+', 'Password=[redacted]'
        throw "Isolated backend did not become ready. $failure"
    }
    Write-Host 'Running Chrome browser tests...'
    & npm.cmd --prefix (Join-Path $repoRoot 'frontend') run test:e2e
    if ($LASTEXITCODE -ne 0) { throw 'Browser tests failed.' }
}
finally {
    if ($backendProcess -and -not $backendProcess.HasExited) {
        Stop-Process -Id $backendProcess.Id -Force
        $backendProcess.WaitForExit()
    }
    if ($databaseCreated) {
        & $psql --dbname postgres --no-password --set ON_ERROR_STOP=1 --command "DROP DATABASE $databaseName WITH (FORCE);" | Out-Null
    }
    foreach ($name in $previous.Keys) {
        [Environment]::SetEnvironmentVariable($name, $previous[$name], 'Process')
    }
    Remove-Item -LiteralPath $stdout, $stderr -ErrorAction SilentlyContinue
}
