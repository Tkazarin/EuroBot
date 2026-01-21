@echo off
REM Скрипт резервного копирования БД EUROBOT для Windows
REM Использование: backup.bat [restore файл.sql] [list] [clean дней]

cd /d "%~dp0\.."

if "%1"=="restore" (
    .\venv\Scripts\python.exe scripts\backup_db.py --restore %2
) else if "%1"=="list" (
    .\venv\Scripts\python.exe scripts\backup_db.py --list
) else if "%1"=="clean" (
    .\venv\Scripts\python.exe scripts\backup_db.py --clean %2
) else (
    .\venv\Scripts\python.exe scripts\backup_db.py
)

pause
