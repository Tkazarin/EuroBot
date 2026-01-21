# Скрипт резервного копирования БД EUROBOT для Windows PowerShell
# Использование:
#   .\backup.ps1           # Создать бэкап
#   .\backup.ps1 -List     # Показать список бэкапов
#   .\backup.ps1 -Restore "файл.sql"  # Восстановить
#   .\backup.ps1 -Clean 7  # Удалить бэкапы старше 7 дней

param(
    [switch]$List,
    [string]$Restore,
    [int]$Clean
)

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Split-Path -Parent $scriptPath
$pythonPath = Join-Path $backendPath "venv\Scripts\python.exe"
$scriptFile = Join-Path $scriptPath "backup_db.py"

Set-Location $backendPath

if ($List) {
    & $pythonPath $scriptFile --list
}
elseif ($Restore) {
    & $pythonPath $scriptFile --restore $Restore
}
elseif ($Clean -gt 0) {
    & $pythonPath $scriptFile --clean $Clean
}
else {
    & $pythonPath $scriptFile
}
