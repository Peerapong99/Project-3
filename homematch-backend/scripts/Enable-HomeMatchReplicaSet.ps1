
$ErrorActionPreference = 'Stop'
$workspacePath = 'C:\Project 3'
$backendPath = Join-Path $workspacePath 'homematch-backend'
$configPath = 'C:\Program Files\MongoDB\Server\8.2\bin\mongod.cfg'
$dataPath = 'C:\Program Files\MongoDB\Server\8.2\data'
$backupPath = Join-Path $workspacePath ('backups\mongodb-' + [DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss'))
$logPath = Join-Path $backendPath 'replica-set-setup.log'
$nodeExecutable = (Get-Command node).Source
$newline = [Environment]::NewLine
$principal = [Security.Principal.WindowsPrincipal]::new([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { throw 'Run this script in an Administrator PowerShell.' }
$configText = [System.IO.File]::ReadAllText($configPath)
if ($configText -match '(?m)^replication:') { throw 'Replication already configured; inspect before changing it.' }
if ($configText -notmatch 'dbPath:\s*C:\\Program Files\\MongoDB\\Server\\8\.2\\data') { throw 'Unexpected dbPath; refusing to alter another database.' }
New-Item -ItemType Directory -Path $backupPath -Force | Out-Null
[System.IO.File]::WriteAllText((Join-Path $backupPath 'mongod.cfg.original'), $configText)
[System.IO.File]::WriteAllText($logPath, 'Starting local replica-set setup. Backup: ' + $backupPath + $newline)
$changed = $false
try {
 Stop-Service -Name MongoDB
 (Get-Service MongoDB).WaitForStatus('Stopped', [TimeSpan]::FromSeconds(30))
 Copy-Item -LiteralPath $dataPath -Destination (Join-Path $backupPath 'data') -Recurse
 $sourceFiles = Get-ChildItem -LiteralPath $dataPath -File -Recurse
 $backupFiles = Get-ChildItem -LiteralPath (Join-Path $backupPath 'data') -File -Recurse
 if ($sourceFiles.Count -ne $backupFiles.Count -or ($sourceFiles | Measure-Object Length -Sum).Sum -ne ($backupFiles | Measure-Object Length -Sum).Sum) { throw 'Backup verification failed.' }
 Add-Content -LiteralPath $logPath -Value 'Offline data backup verified.'
 $nextConfig = $configText + $newline + 'replication:' + $newline + '  replSetName: homematch-rs' + $newline
 [System.IO.File]::WriteAllText($configPath, $nextConfig, [System.Text.UTF8Encoding]::new($false))
 $changed = $true
 Start-Service -Name MongoDB
 (Get-Service MongoDB).WaitForStatus('Running', [TimeSpan]::FromSeconds(30))
 & $nodeExecutable (Join-Path $backendPath 'scripts\initializeLocalReplicaSet.js') 2>&1 | Out-File -LiteralPath $logPath -Append -Encoding utf8
 if ($LASTEXITCODE -ne 0) { throw 'Replica initialization failed; see setup log.' }
 Add-Content -LiteralPath $logPath -Value 'SUCCESS: MongoDB replica set enabled. Existing data preserved.'
} catch {
 Add-Content -LiteralPath $logPath -Value ('FAILED: ' + $_.Exception.Message)
 if ($changed) {
  Stop-Service -Name MongoDB -ErrorAction SilentlyContinue
  [System.IO.File]::WriteAllText($configPath, $configText, [System.Text.UTF8Encoding]::new($false))
 }
 if ((Get-Service MongoDB).Status -ne 'Running') { Start-Service -Name MongoDB }
 throw
}
