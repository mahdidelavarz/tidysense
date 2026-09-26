[CmdletBinding()]
param(
    [ValidateSet('all', 'backend', 'frontend', 'build', 'test', 'db', 'check', 'openapi')]
    [string] $Command = 'all',
    [switch] $Quick
)

$ErrorActionPreference = 'Stop'
$repoRoot = $PSScriptRoot
Set-Location -LiteralPath $repoRoot

$localDotnet = Join-Path $repoRoot '.dotnet\dotnet.exe'
$dotnet = if (Test-Path -LiteralPath $localDotnet) { $localDotnet } else { 'dotnet' }
$env:DOTNET_CLI_HOME = Join-Path $repoRoot '.dotnet_home'
$backendProject = Join-Path $repoRoot 'backend\TidySense.csproj'
$backendTests = Join-Path $repoRoot 'backend.Tests\TidySense.Backend.Tests.csproj'
$frontendDirectory = Join-Path $repoRoot 'frontend'

function Write-Step([string] $Message) {
    Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Write-Pass([string] $Message) {
    Write-Host "PASS  $Message" -ForegroundColor Green
}

function Assert-ExitCode([string] $Activity) {
    if ($LASTEXITCODE -ne 0) {
        throw "$Activity failed with exit code $LASTEXITCODE."
    }
}

function Get-PsqlPath {
    $command = Get-Command psql -ErrorAction SilentlyContinue
    if ($command) { return $command.Source }

    $installed = 'C:\Program Files\PostgreSQL\18\bin\psql.exe'
    if (Test-Path -LiteralPath $installed) { return $installed }

    throw 'psql was not found. Install PostgreSQL 18 or reopen PowerShell after updating PATH.'
}

function Get-TestConnection {
    $connection = $env:TIDYSENSE_TEST_POSTGRES
    if ([string]::IsNullOrWhiteSpace($connection)) {
        $connection = [Environment]::GetEnvironmentVariable('TIDYSENSE_TEST_POSTGRES', 'User')
    }
    if ([string]::IsNullOrWhiteSpace($connection)) {
        throw 'TIDYSENSE_TEST_POSTGRES is not configured at process or user scope.'
    }
    return $connection
}

function Ensure-FrontendDependencies {
    if (-not (Test-Path -LiteralPath (Join-Path $frontendDirectory 'node_modules\.bin\vite.cmd'))) {
        Write-Step 'Installing frontend dependencies with npm ci'
        & npm.cmd --prefix $frontendDirectory ci
        Assert-ExitCode 'Frontend dependency installation'
    }
}

function Test-Database {
    Write-Step 'Checking PostgreSQL 18 and the TidySense schema'
    $psql = Get-PsqlPath
    & $psql --version
    Assert-ExitCode 'psql version check'

    $service = Get-Service -Name 'postgresql-x64-18' -ErrorAction SilentlyContinue
    if (-not $service -or $service.Status -ne 'Running') {
        throw 'Windows service postgresql-x64-18 is not running.'
    }
    Write-Pass 'PostgreSQL Windows service is running'

    $builder = [System.Data.Common.DbConnectionStringBuilder]::new()
    $builder.set_ConnectionString((Get-TestConnection))
    $previousValues = @{
        PGHOST = $env:PGHOST
        PGPORT = $env:PGPORT
        PGUSER = $env:PGUSER
        PGPASSWORD = $env:PGPASSWORD
    }

    try {
        $env:PGHOST = [string] $builder['Host']
        $env:PGPORT = [string] $builder['Port']
        $env:PGUSER = [string] $builder['Username']
        $env:PGPASSWORD = [string] $builder['Password']

        $serverResult = & $psql --dbname postgres --no-align --tuples-only --set ON_ERROR_STOP=1 --command 'SELECT 1;'
        Assert-ExitCode 'PostgreSQL server connectivity check'
        if (($serverResult | Out-String).Trim() -ne '1') { throw 'PostgreSQL server query returned an unexpected value.' }
        Write-Pass 'localhost PostgreSQL connection and query succeeded'

        $schemaResult = & $psql --dbname tidysense --no-align --tuples-only --set ON_ERROR_STOP=1 --command "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('__EFMigrationsHistory', 'Users', 'Projects');"
        Assert-ExitCode 'TidySense schema check'
        if (($schemaResult | Out-String).Trim() -ne '3') { throw 'The expected TidySense migration/schema tables were not found.' }
        Write-Pass 'tidysense database and expected migration/schema tables are present'
    }
    finally {
        $env:PGHOST = $previousValues.PGHOST
        $env:PGPORT = $previousValues.PGPORT
        $env:PGUSER = $previousValues.PGUSER
        $env:PGPASSWORD = $previousValues.PGPASSWORD
    }
}

function Build-Backend {
    Write-Step 'Building backend and generating OpenAPI'
    $env:ASPNETCORE_ENVIRONMENT = 'Development'
    & $dotnet build $backendProject -p:OutputPath=bin/dev-check/ -p:UseAppHost=false
    Assert-ExitCode 'Backend build'
    Write-Pass 'Backend build and OpenAPI generation completed'
}

function Build-Frontend {
    Ensure-FrontendDependencies
    Write-Step 'Linting frontend'
    & npm.cmd --prefix $frontendDirectory run lint
    Assert-ExitCode 'Frontend lint'
    Write-Step 'Type-checking frontend'
    & npm.cmd --prefix $frontendDirectory run typecheck
    Assert-ExitCode 'Frontend typecheck'
    Write-Step 'Building frontend'
    & npm.cmd --prefix $frontendDirectory run build
    Assert-ExitCode 'Frontend build'
    Write-Pass 'Frontend lint, typecheck and build completed'
}

function Test-Backend {
    $env:TIDYSENSE_TEST_POSTGRES = Get-TestConnection
    Write-Step 'Running backend tests against real PostgreSQL'
    & $dotnet test $backendTests --no-restore -p:OutputPath=bin/dev-check/ -p:OpenApiGenerateDocuments=false
    Assert-ExitCode 'Backend tests'
    Write-Pass 'Backend PostgreSQL integration tests completed'
}

function Test-Frontend {
    Ensure-FrontendDependencies
    Write-Step 'Running frontend tests'
    & npm.cmd --prefix $frontendDirectory run test
    Assert-ExitCode 'Frontend tests'
    Write-Pass 'Frontend tests completed'
}

switch ($Command) {
    'backend' {
        Write-Host 'Backend: https://localhost:7075 (readiness: /health/ready)' -ForegroundColor Green
        $env:ASPNETCORE_ENVIRONMENT = 'Development'
        $env:Database__MigrateOnStart = 'true'
        & $dotnet run --project $backendProject --launch-profile https
        Assert-ExitCode 'Backend server'
    }
    'frontend' {
        Ensure-FrontendDependencies
        Write-Host 'Frontend: http://localhost:5173 (API proxy: https://localhost:7075)' -ForegroundColor Green
        & npm.cmd --prefix $frontendDirectory run dev
        Assert-ExitCode 'Frontend server'
    }
    'all' {
        $shell = if (Get-Command pwsh.exe -ErrorAction SilentlyContinue) { 'pwsh.exe' } else { 'powershell.exe' }
        Write-Host 'Opening backend and frontend in separate PowerShell windows.' -ForegroundColor Green
        Start-Process -FilePath $shell -WorkingDirectory $repoRoot -ArgumentList @('-NoExit', '-ExecutionPolicy', 'Bypass', '-File', $PSCommandPath, 'backend')
        Start-Process -FilePath $shell -WorkingDirectory $repoRoot -ArgumentList @('-NoExit', '-ExecutionPolicy', 'Bypass', '-File', $PSCommandPath, 'frontend')
    }
    'build' {
        Build-Backend
        Build-Frontend
    }
    'test' {
        Test-Backend
        Test-Frontend
    }
    'db' {
        Test-Database
    }
    'openapi' {
        Build-Backend
        Ensure-FrontendDependencies
        Write-Step 'Regenerating frontend API types'
        & npm.cmd --prefix $frontendDirectory run generate:api
        Assert-ExitCode 'Frontend API type generation'
        Write-Pass 'OpenAPI document and frontend transport types regenerated'
    }
    'check' {
        Write-Step 'Checking required tool versions'
        $dotnetVersion = & $dotnet --version
        Assert-ExitCode '.NET SDK version check'
        if (-not $dotnetVersion.StartsWith('10.')) { throw ".NET 10 is required; found $dotnetVersion." }
        Write-Pass ".NET SDK $dotnetVersion"
        & $dotnet dev-certs https --check | Out-Null
        Assert-ExitCode 'ASP.NET Core HTTPS development certificate check'
        Write-Pass 'ASP.NET Core HTTPS development certificate is available'

        $nodeVersion = & node.exe --version
        Assert-ExitCode 'Node version check'
        $npmVersion = & npm.cmd --version
        Assert-ExitCode 'npm version check'
        Write-Pass "Node $nodeVersion / npm $npmVersion"

        Test-Database
        Build-Backend
        if (-not $Quick) { Test-Backend }
        Ensure-FrontendDependencies
        Write-Step 'Type-checking frontend'
        & npm.cmd --prefix $frontendDirectory run typecheck
        Assert-ExitCode 'Frontend typecheck'
        if (-not $Quick) {
            Test-Frontend
            Write-Step 'Linting and building frontend'
            & npm.cmd --prefix $frontendDirectory run lint
            Assert-ExitCode 'Frontend lint'
            & npm.cmd --prefix $frontendDirectory run build
            Assert-ExitCode 'Frontend build'
        }
        Write-Pass $(if ($Quick) { 'Quick local health check completed' } else { 'Full local health check completed' })
    }
}
