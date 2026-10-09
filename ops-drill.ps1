[CmdletBinding()]
param(
    # Who runs the drill. It is written into the drill record and into the erasure record.
    [string] $Operator = $env:USERNAME
)

# Operational drills against an isolated database and an isolated backend (see devmap/operations/runbooks.md):
# kill switch, maintenance, backup and restore, migration rollback, account erasure.
# Nothing here touches the development database, tracked configuration or a real AI provider.

$ErrorActionPreference = 'Stop'
$repoRoot = $PSScriptRoot
$configured = if ($env:TIDYSENSE_TEST_POSTGRES) { $env:TIDYSENSE_TEST_POSTGRES } else {
    [Environment]::GetEnvironmentVariable('TIDYSENSE_TEST_POSTGRES', 'User')
}
if ([string]::IsNullOrWhiteSpace($configured)) {
    throw 'TIDYSENSE_TEST_POSTGRES is required for the isolated drill database.'
}

$psql = if (Get-Command psql -ErrorAction SilentlyContinue) {
    (Get-Command psql).Source
} else {
    'C:\Program Files\PostgreSQL\18\bin\psql.exe'
}
if (-not (Test-Path -LiteralPath $psql)) { throw 'psql was not found.' }
$pgBin = Split-Path -Parent $psql
$pgDump = Join-Path $pgBin 'pg_dump.exe'
$pgRestore = Join-Path $pgBin 'pg_restore.exe'

$suffix = [Guid]::NewGuid().ToString('N').Substring(0, 12)
$databaseName = "tidysense_ops_drill_$suffix"
$restoredName = "tidysense_ops_restore_$suffix"
$connection = [System.Data.Common.DbConnectionStringBuilder]::new()
$connection.set_ConnectionString($configured)
$connection['Database'] = $databaseName
$mainConnection = $connection.get_ConnectionString()
$connection['Database'] = $restoredName
$restoredConnection = $connection.get_ConnectionString()

$baseUrl = 'http://127.0.0.1:7077'
$restoredUrl = 'http://127.0.0.1:7078'
$testPhone = '+989120000000'
$workDirectory = Join-Path ([System.IO.Path]::GetTempPath()) "tidysense-ops-drill-$suffix"
$settingsFile = Join-Path $workDirectory 'appsettings.json'
$dumpFile = Join-Path $workDirectory 'backup.dump'
$stdout = Join-Path $workDirectory 'backend.out.log'
$stderr = Join-Path $workDirectory 'backend.err.log'
$restoredStdout = Join-Path $workDirectory 'restored.out.log'
$restoredStderr = Join-Path $workDirectory 'restored.err.log'
$assembly = Join-Path $repoRoot 'backend\bin\ops-drill\TidySense.dll'
$utf8 = New-Object System.Text.UTF8Encoding $false

$environmentNames = @(
    'PGHOST', 'PGPORT', 'PGUSER', 'PGPASSWORD', 'ASPNETCORE_ENVIRONMENT', 'ConnectionStrings__DefaultConnection',
    'Jwt__SigningKey', 'Otp__HashingKey', 'Database__MigrateOnStart', 'Ai__Planning__Provider',
    'Ai__Reconcile__Provider', 'Operations__OperatorPhones__0', 'DOTNET_CLI_HOME'
)
$previous = @{}
foreach ($name in $environmentNames) { $previous[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
$processes = @()
$databases = @()
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

function Write-Drill([string] $Message) { Write-Host "`n==> $Message" -ForegroundColor Cyan }
function Write-Evidence([string] $Message) { Write-Host "PASS  $Message" -ForegroundColor Green }
function Assert-Drill([bool] $Condition, [string] $Message) {
    if (-not $Condition) { throw "DRILL FAILED: $Message" }
    Write-Evidence $Message
}

function Invoke-Sql([string] $Database, [string] $Sql) {
    # Through a file: Windows PowerShell does not pass quoted identifiers to a native command intact.
    $queryFile = Join-Path $workDirectory 'query.sql'
    [System.IO.File]::WriteAllText($queryFile, $Sql, $utf8)
    $result = & $psql --dbname $Database --no-password --no-align --tuples-only --quiet --set ON_ERROR_STOP=1 --file $queryFile
    if ($LASTEXITCODE -ne 0) { throw "SQL failed against $Database." }
    return ($result | Out-String).Trim()
}

# Returns the status code and the parsed JSON body of any answer, including a refusal.
function Invoke-Api([string] $Method, [string] $Path, $Body = $null, [string] $Base = $baseUrl) {
    $request = @{
        Uri = "$Base$Path"; Method = $Method; WebSession = $session; UseBasicParsing = $true
        Headers = @{ Origin = $Base; 'Idempotency-Key' = [Guid]::NewGuid().ToString() }
    }
    if ($Method -ne 'GET') {
        $json = if ($null -eq $Body) { '{}' } else { $Body | ConvertTo-Json -Depth 8 -Compress }
        $request.ContentType = 'application/json'
        $request.Body = $utf8.GetBytes($json)
    }
    try {
        $response = Invoke-WebRequest @request
        $content = $response.Content
        $status = [int] $response.StatusCode
    }
    catch {
        $failed = $_.Exception.Response
        if (-not $failed) { throw }
        $reader = New-Object System.IO.StreamReader($failed.GetResponseStream())
        $content = $reader.ReadToEnd()
        $status = [int] $failed.StatusCode
    }
    $parsed = if ([string]::IsNullOrWhiteSpace($content)) { $null } else { $content | ConvertFrom-Json }
    return [pscustomobject]@{ Status = $status; Json = $parsed }
}

function Start-Backend([string] $Url, [string] $ConnectionString, [string] $Out, [string] $Err) {
    $env:ConnectionStrings__DefaultConnection = $ConnectionString
    # The content root is a private copy of the tracked settings, so a drill can change configuration at runtime.
    $process = Start-Process -FilePath 'dotnet' -PassThru -WindowStyle Hidden `
        -ArgumentList @("`"$assembly`"", '--urls', $Url, '--contentRoot', "`"$workDirectory`"") `
        -WorkingDirectory $workDirectory -RedirectStandardOutput $Out -RedirectStandardError $Err
    for ($attempt = 0; $attempt -lt 40; $attempt++) {
        if ($process.HasExited) { break }
        try {
            if ((Invoke-WebRequest -Uri "$Url/health/ready" -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200) { return $process }
        }
        catch { Start-Sleep -Milliseconds 750 }
    }
    $failure = @(Get-Content -LiteralPath $Out -Tail 30 -ErrorAction SilentlyContinue
        Get-Content -LiteralPath $Err -Tail 30 -ErrorAction SilentlyContinue) -join ' '
    throw "Backend at $Url did not become ready. $($failure -replace 'Password=[^;\s]+', 'Password=[redacted]')"
}

# Changes one switch in the running backend's settings file and waits until the backend has reloaded it.
# Scope is GLOBAL, PLANNING, RECONCILE or PROVIDER:<key>, the names the audit line uses.
function Set-KillSwitch([string] $Scope, [bool] $Active) {
    $settings = [System.IO.File]::ReadAllText($settingsFile) | ConvertFrom-Json
    switch -Wildcard ($Scope) {
        'GLOBAL' { $settings.Ai.GlobalKillSwitch = $Active }
        'PLANNING' { $settings.Ai.Planning.KillSwitch = $Active }
        'RECONCILE' { $settings.Ai.Reconcile.KillSwitch = $Active }
        'PROVIDER:*' { $settings.Ai.Providers.($Scope.Substring(9)).Disabled = $Active }
        default { throw "Unknown switch scope $Scope." }
    }
    [System.IO.File]::WriteAllText($settingsFile, ($settings | ConvertTo-Json -Depth 12), $utf8)
    if (-not (Wait-Log "AI_KILL_SWITCH_CHANGED. Scope: $Scope, Active: $Active")) {
        throw "The backend did not pick up $Scope=$Active."
    }
    Write-Evidence "the audit line AI_KILL_SWITCH_CHANGED ($Scope, Active: $Active) is in the log"
}

function Start-PlanningAttempt([string] $Key) {
    return Invoke-Api POST '/api/v1/planning/attempts' @{ clientAttemptId = "drill-$Key-$suffix"; intention = 'Drill plan'; replaceActive = $true }
}

# Each switch is turned on and off once per drill, so a line for a scope and value appears at most once.
function Wait-Log([string] $Pattern) {
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        if (Select-String -LiteralPath $stdout -Pattern $Pattern -SimpleMatch -Quiet) { return $true }
        Start-Sleep -Milliseconds 500
    }
    return $false
}

function Get-Counts([string] $Database) {
    $counts = [ordered]@{}
    foreach ($table in '__EFMigrationsHistory', 'Users', 'Tasks', 'ReconcileSessions', 'PlanningAttempts',
        'DomainEvents', 'CommandResults', 'OperationsRecords') {
        $counts[$table] = Invoke-Sql $Database "SELECT COUNT(*) FROM `"$table`";"
    }
    return ($counts.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }) -join ' '
}

try {
    $startedAt = [DateTimeOffset]::UtcNow
    Write-Host "TidySense operational drill. Operator: $Operator. Started: $($startedAt.ToString('u'))"
    New-Item -ItemType Directory -Path $workDirectory | Out-Null
    Copy-Item -LiteralPath (Join-Path $repoRoot 'backend\appsettings.json') -Destination $settingsFile
    Copy-Item -LiteralPath (Join-Path $repoRoot 'backend\appsettings.Development.json') -Destination $workDirectory

    $connection.set_ConnectionString($configured)
    $env:PGHOST = [string] $connection['Host']
    $env:PGPORT = [string] $connection['Port']
    $env:PGUSER = [string] $connection['Username']
    $env:PGPASSWORD = [string] $connection['Password']
    $env:DOTNET_CLI_HOME = Join-Path $repoRoot '.dotnet_home'
    $env:ASPNETCORE_ENVIRONMENT = 'Development'
    $env:Jwt__SigningKey = 'ops-drill-signing-key-at-least-32-characters'
    $env:Otp__HashingKey = 'ops-drill-hashing-key-at-least-32-characters'
    $env:Database__MigrateOnStart = 'true'
    # Drills run against the deterministic samples, whatever provider the developer's user-secrets select.
    $env:Ai__Planning__Provider = 'mock'
    $env:Ai__Reconcile__Provider = 'mock'
    $env:Operations__OperatorPhones__0 = $testPhone

    Write-Drill 'Preparing the isolated database and backend'
    Invoke-Sql 'postgres' "CREATE DATABASE $databaseName;" | Out-Null
    $databases += $databaseName
    & dotnet build (Join-Path $repoRoot 'backend\TidySense.csproj') --no-restore --nologo --verbosity quiet -p:OutputPath=bin/ops-drill/ -p:OpenApiGenerateDocuments=false
    if ($LASTEXITCODE -ne 0) { throw 'Backend build failed.' }
    $processes += Start-Backend $baseUrl $mainConnection $stdout $stderr
    Assert-Drill ((Invoke-Api POST '/api/v1/dev/test-session').Json.isOperator -eq $true) 'signed in as the operator test account'
    $today = (Invoke-Api GET '/api/v1/today').Json.localDate
    $task = Invoke-Api POST '/api/v1/tasks' @{
        title = 'Drill task'; description = $null; goalId = $null; projectId = $null; plannedDate = $today
        deadline = $null; sequenceId = $null; sequenceOrder = $null; isProtected = $false
    }
    Assert-Drill ($task.Status -eq 200 -or $task.Status -eq 201) 'seeded one Task through the API'

    Write-Drill 'Drill 1: AI kill switch'
    $before = Start-PlanningAttempt 'before'
    Assert-Drill ($before.Status -lt 300) "planning accepted an attempt before the switch (HTTP $($before.Status))"
    $switchedAt = [DateTimeOffset]::UtcNow
    Set-KillSwitch 'GLOBAL' $true
    $blocked = Start-PlanningAttempt 'blocked'
    Assert-Drill ($blocked.Status -eq 503 -and $blocked.Json.code -eq 'PLANNING_AI_UNAVAILABLE') 'planning answers 503 PLANNING_AI_UNAVAILABLE while the switch is on'
    $opened = Invoke-Api POST '/api/v1/reconcile/sessions' @{ triggerType = 'MANUAL' }
    Assert-Drill ($opened.Status -eq 200 -and $opened.Json.ai.availability -eq 'DISABLED') 'deterministic Reconcile opens and reports the AI layer DISABLED'
    $sessionPath = "/api/v1/reconcile/sessions/$($opened.Json.id)"
    $manual = Invoke-Api POST '/api/v1/tasks' @{
        title = 'Drill manual task'; description = $null; goalId = $null; projectId = $null; plannedDate = $today
        deadline = $null; sequenceId = $null; sequenceOrder = $null; isProtected = $false
    }
    Assert-Drill ($manual.Status -lt 300) 'manual creation still works'
    $alerts = (Invoke-Api GET '/api/v1/operations/health').Json.alerts
    Assert-Drill ([bool] ($alerts | Where-Object { $_.rule -eq 'AI_KILL_SWITCH_ACTIVE' -and $_.scope -eq 'GLOBAL' })) 'the operator page raises AI_KILL_SWITCH_ACTIVE'
    Set-KillSwitch 'GLOBAL' $false
    $after = Start-PlanningAttempt 'after'
    Assert-Drill ($after.Status -lt 300) "planning accepts attempts again after the switch is off (HTTP $($after.Status))"

    # A family switch stops its own family and leaves the other one alone.
    Set-KillSwitch 'PLANNING' $true
    Assert-Drill ((Start-PlanningAttempt 'planning-off').Status -eq 503) 'the planning switch alone refuses planning attempts'
    Assert-Drill ((Invoke-Api GET $sessionPath).Json.ai.availability -ne 'DISABLED') 'the Reconcile AI layer is not disabled by the planning switch'
    Set-KillSwitch 'PLANNING' $false
    Set-KillSwitch 'RECONCILE' $true
    Assert-Drill ((Invoke-Api GET $sessionPath).Json.ai.availability -eq 'DISABLED') 'the Reconcile switch alone disables the Reconcile AI layer'
    Assert-Drill ((Start-PlanningAttempt 'reconcile-off').Status -lt 300) 'planning is not stopped by the Reconcile switch'
    $scopes = ((Invoke-Api GET '/api/v1/operations/health').Json.alerts | Where-Object { $_.rule -eq 'AI_KILL_SWITCH_ACTIVE' } | ForEach-Object { $_.scope }) -join ','
    Assert-Drill ($scopes -eq 'RECONCILE') "the operator page names the switched family only (scopes: $scopes)"
    Set-KillSwitch 'RECONCILE' $false

    # The provider switch is audited like the others. Both families run on the samples here, so no provider
    # call exists to refuse; refusing a call to a disabled provider is covered by the automated runtime tests.
    Set-KillSwitch 'PROVIDER:deepseek' $true
    Set-KillSwitch 'PROVIDER:deepseek' $false
    Assert-Drill (-not ((Invoke-Api GET '/api/v1/operations/health').Json.alerts | Where-Object { $_.rule -eq 'AI_KILL_SWITCH_ACTIVE' })) 'no kill-switch alert remains'
    Write-Host "Kill switch record: operator=$Operator reason=DRILL first-on=$($switchedAt.ToString('u')) last-off=$([DateTimeOffset]::UtcNow.ToString('u'))"

    Write-Drill 'Drill 2: maintenance run'
    $env:ConnectionStrings__DefaultConnection = $mainConnection
    $maintenance = & dotnet $assembly run-maintenance --contentRoot $workDirectory | Where-Object { $_ -like '{*' } | Select-Object -Last 1
    if ($LASTEXITCODE -ne 0) { throw 'run-maintenance failed.' }
    Write-Host "Maintenance counts: $maintenance"
    $health = (Invoke-Api GET '/api/v1/operations/health').Json
    Assert-Drill ($health.lastMaintenanceOutcome -eq 'SUCCEEDED') 'the operator page shows the maintenance run as succeeded'
    Assert-Drill (-not ($health.alerts | Where-Object { $_.rule -like 'MAINTENANCE_*' })) 'no maintenance alert remains'

    Write-Drill 'Drill 3: backup and restore'
    & $pgDump --dbname $databaseName --format=custom --no-password --file $dumpFile
    if ($LASTEXITCODE -ne 0) { throw 'pg_dump failed.' }
    Invoke-Sql 'postgres' "CREATE DATABASE $restoredName;" | Out-Null
    $databases += $restoredName
    & $pgRestore --dbname $restoredName --no-owner --no-password $dumpFile
    if ($LASTEXITCODE -ne 0) { throw 'pg_restore failed.' }
    $original = Get-Counts $databaseName
    $restored = Get-Counts $restoredName
    Write-Host "Original: $original"
    Write-Host "Restored: $restored"
    Assert-Drill ($original -eq $restored) 'the restored copy has the same migration history and row counts'
    $env:Database__MigrateOnStart = 'false'
    $restoredBackend = Start-Backend $restoredUrl $restoredConnection $restoredStdout $restoredStderr
    $processes += $restoredBackend
    Assert-Drill ((Invoke-Api GET '/api/v1/users/me' $null $restoredUrl).Status -eq 200) 'a backend on the restored copy is ready and accepts the existing session'
    Assert-Drill ((Invoke-Api GET "/api/v1/tasks/$($task.Json.id)" $null $restoredUrl).Json.title -eq 'Drill task') 'the seeded Task is readable from the restored copy'
    Stop-Process -Id $restoredBackend.Id -Force
    $restoredBackend.WaitForExit()

    Write-Drill 'Drill 4: migration rollback and reapply on the restored copy'
    $project = Join-Path $repoRoot 'backend\TidySense.csproj'
    & dotnet tool exec dotnet-ef@10.0.11 --yes -- database update 20261008130508_Step10RecommendationEvidence --project $project --configuration Release --connection $restoredConnection | Select-Object -Last 2
    if ($LASTEXITCODE -ne 0) { throw 'Migration rollback failed.' }
    Assert-Drill ((Invoke-Sql $restoredName "SELECT to_regclass('public.`"OperationsRecords`"') IS NULL;") -eq 't') 'rollback to the STEP-10 schema removed the STEP-11 table'
    Assert-Drill ((Invoke-Sql $restoredName 'SELECT COUNT(*) FROM "Tasks";') -eq '2') 'the Tasks survived the rollback'
    & dotnet tool exec dotnet-ef@10.0.11 --yes -- database update --project $project --configuration Release --connection $restoredConnection | Select-Object -Last 2
    if ($LASTEXITCODE -ne 0) { throw 'Migration reapply failed.' }
    Assert-Drill ((Invoke-Sql $restoredName "SELECT to_regclass('public.`"OperationsRecords`"') IS NOT NULL;") -eq 't') 'reapplying restored the STEP-11 table'
    Assert-Drill ((Invoke-Sql $restoredName 'SELECT COUNT(*) FROM "Tasks";') -eq '2') 'the Tasks survived the reapply'

    Write-Drill 'Drill 5: account erasure'
    $env:ConnectionStrings__DefaultConnection = $mainConnection
    $eventsBefore = Invoke-Sql $databaseName 'SELECT COUNT(*) FROM "DomainEvents";'
    $erasure = & dotnet $assembly erase-user --phone $testPhone --operator $Operator --reason DRILL --contentRoot $workDirectory | Where-Object { $_ -like '{*' } | Select-Object -Last 1
    if ($LASTEXITCODE -ne 0) { throw 'erase-user failed.' }
    Write-Host "Erasure result: $erasure"
    $tombstone = ($erasure | ConvertFrom-Json).TombstoneUserId
    Assert-Drill ((Invoke-Sql $databaseName 'SELECT COUNT(*) FROM "Users";') -eq '0') 'the account row is gone'
    Assert-Drill ((Invoke-Sql $databaseName 'SELECT COUNT(*) FROM "Tasks";') -eq '0') 'the account''s Tasks are gone'
    Assert-Drill ((Invoke-Sql $databaseName "SELECT COUNT(*) FROM `"DomainEvents`" WHERE `"UserId`" = '$tombstone';") -eq $eventsBefore) "all $eventsBefore audit events remain, under the tombstone"
    Assert-Drill ((Invoke-Sql $databaseName "SELECT COUNT(*) FROM `"OperationsRecords`" WHERE `"Kind`" = 'USER_ERASURE' AND `"Operator`" = '$Operator' AND `"ReasonCode`" = 'DRILL' AND `"DetailsJson`"::text NOT LIKE '%$($testPhone.Substring(1))%';") -eq '1') 'the erasure record names operator and reason and not the phone number'
    Assert-Drill ((Invoke-Api GET '/api/v1/users/me').Status -eq 401) 'the erased account''s session is refused'

    Write-Host "`nAll drills passed. Operator: $Operator. Finished: $([DateTimeOffset]::UtcNow.ToString('u'))" -ForegroundColor Green
}
finally {
    foreach ($process in $processes) {
        if ($process -and -not $process.HasExited) {
            Stop-Process -Id $process.Id -Force
            $process.WaitForExit()
        }
    }
    foreach ($database in $databases) {
        & $psql --dbname postgres --no-password --set ON_ERROR_STOP=1 --command "DROP DATABASE IF EXISTS $database WITH (FORCE);" | Out-Null
    }
    foreach ($name in $environmentNames) { [Environment]::SetEnvironmentVariable($name, $previous[$name], 'Process') }
    Remove-Item -LiteralPath $workDirectory -Recurse -Force -ErrorAction SilentlyContinue
}
