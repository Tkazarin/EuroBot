#!/usr/bin/env python3
"""
Скрипт для резервного копирования базы данных PostgreSQL.

Использование:
    python backup_db.py                    # Создать бэкап
    python backup_db.py --restore backup.sql  # Восстановить из бэкапа
    python backup_db.py --list             # Показать список бэкапов
    python backup_db.py --clean 7          # Удалить бэкапы старше 7 дней
"""

import os
import sys
import subprocess
import argparse
from datetime import datetime, timedelta
from pathlib import Path

# Добавляем путь к app для импорта конфигурации
sys.path.insert(0, str(Path(__file__).parent.parent))

# Настройки по умолчанию (можно переопределить через .env)
DEFAULT_CONFIG = {
    "DB_HOST": "localhost",
    "DB_PORT": "5432",
    "DB_NAME": "eurobot",
    "DB_USER": "eurobot",
    "DB_PASSWORD": "eurobot",
    "BACKUP_DIR": "backups",
    "KEEP_DAYS": 30,  # Хранить бэкапы 30 дней
}


def get_config():
    """Получить конфигурацию из переменных окружения или .env файла."""
    config = DEFAULT_CONFIG.copy()
    
    # Попробуем загрузить из .env
    env_file = Path(__file__).parent.parent / ".env"
    if env_file.exists():
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    key = key.strip()
                    value = value.strip().strip('"').strip("'")
                    
                    # Парсим DATABASE_URL если есть
                    if key == "DATABASE_URL" and "postgresql" in value:
                        # postgresql+asyncpg://user:pass@host:port/dbname
                        try:
                            url = value.replace("postgresql+asyncpg://", "").replace("postgresql://", "")
                            auth, rest = url.split("@")
                            user_pass = auth.split(":")
                            config["DB_USER"] = user_pass[0]
                            if len(user_pass) > 1:
                                config["DB_PASSWORD"] = user_pass[1]
                            host_port, dbname = rest.split("/")
                            host_port_split = host_port.split(":")
                            config["DB_HOST"] = host_port_split[0]
                            if len(host_port_split) > 1:
                                config["DB_PORT"] = host_port_split[1]
                            config["DB_NAME"] = dbname
                        except:
                            pass
    
    # Переопределяем из переменных окружения
    for key in config:
        env_val = os.environ.get(key)
        if env_val:
            config[key] = env_val
    
    return config


def ensure_backup_dir(config):
    """Создать директорию для бэкапов если её нет."""
    backup_dir = Path(__file__).parent.parent / config["BACKUP_DIR"]
    backup_dir.mkdir(parents=True, exist_ok=True)
    return backup_dir


def create_backup(config):
    """Создать резервную копию базы данных."""
    backup_dir = ensure_backup_dir(config)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = backup_dir / f"eurobot_backup_{timestamp}.sql"
    
    print(f"🔄 Создание бэкапа базы данных {config['DB_NAME']}...")
    print(f"   Хост: {config['DB_HOST']}:{config['DB_PORT']}")
    print(f"   Файл: {backup_file}")
    
    # Устанавливаем пароль через переменную окружения
    env = os.environ.copy()
    env["PGPASSWORD"] = config["DB_PASSWORD"]
    
    # Команда pg_dump
    cmd = [
        "pg_dump",
        "-h", config["DB_HOST"],
        "-p", config["DB_PORT"],
        "-U", config["DB_USER"],
        "-d", config["DB_NAME"],
        "-F", "p",  # plain SQL format
        "--no-owner",
        "--no-acl",
        "-f", str(backup_file)
    ]
    
    try:
        result = subprocess.run(cmd, env=env, capture_output=True, text=True)
        
        if result.returncode == 0:
            size = backup_file.stat().st_size
            size_mb = size / (1024 * 1024)
            print(f"✅ Бэкап создан успешно!")
            print(f"   Размер: {size_mb:.2f} MB")
            print(f"   Путь: {backup_file}")
            return backup_file
        else:
            print(f"❌ Ошибка при создании бэкапа:")
            print(result.stderr)
            return None
            
    except FileNotFoundError:
        print("❌ Ошибка: pg_dump не найден!")
        print("   Убедитесь, что PostgreSQL установлен и pg_dump доступен в PATH")
        print("   Windows: добавьте C:\\Program Files\\PostgreSQL\\XX\\bin в PATH")
        return None
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        return None


def restore_backup(config, backup_file):
    """Восстановить базу данных из бэкапа."""
    backup_path = Path(backup_file)
    
    if not backup_path.exists():
        # Проверяем в директории бэкапов
        backup_dir = ensure_backup_dir(config)
        backup_path = backup_dir / backup_file
        
    if not backup_path.exists():
        print(f"❌ Файл бэкапа не найден: {backup_file}")
        return False
    
    print(f"⚠️  ВНИМАНИЕ: Это действие перезапишет текущую базу данных!")
    print(f"   База: {config['DB_NAME']}")
    print(f"   Файл: {backup_path}")
    
    confirm = input("   Продолжить? (yes/no): ")
    if confirm.lower() != "yes":
        print("   Отменено.")
        return False
    
    print(f"🔄 Восстановление базы данных...")
    
    env = os.environ.copy()
    env["PGPASSWORD"] = config["DB_PASSWORD"]
    
    # Команда psql для восстановления
    cmd = [
        "psql",
        "-h", config["DB_HOST"],
        "-p", config["DB_PORT"],
        "-U", config["DB_USER"],
        "-d", config["DB_NAME"],
        "-f", str(backup_path)
    ]
    
    try:
        result = subprocess.run(cmd, env=env, capture_output=True, text=True)
        
        if result.returncode == 0:
            print(f"✅ База данных восстановлена успешно!")
            return True
        else:
            print(f"❌ Ошибка при восстановлении:")
            print(result.stderr)
            return False
            
    except FileNotFoundError:
        print("❌ Ошибка: psql не найден!")
        return False
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        return False


def list_backups(config):
    """Показать список всех бэкапов."""
    backup_dir = ensure_backup_dir(config)
    backups = sorted(backup_dir.glob("eurobot_backup_*.sql"), reverse=True)
    
    if not backups:
        print("📁 Бэкапы не найдены")
        return
    
    print(f"📁 Найдено бэкапов: {len(backups)}")
    print(f"   Директория: {backup_dir}")
    print()
    
    for backup in backups:
        size = backup.stat().st_size
        size_mb = size / (1024 * 1024)
        mtime = datetime.fromtimestamp(backup.stat().st_mtime)
        print(f"   📄 {backup.name}")
        print(f"      Размер: {size_mb:.2f} MB | Дата: {mtime.strftime('%Y-%m-%d %H:%M:%S')}")


def clean_old_backups(config, days):
    """Удалить бэкапы старше указанного количества дней."""
    backup_dir = ensure_backup_dir(config)
    cutoff_date = datetime.now() - timedelta(days=days)
    
    backups = list(backup_dir.glob("eurobot_backup_*.sql"))
    deleted = 0
    
    print(f"🧹 Очистка бэкапов старше {days} дней...")
    
    for backup in backups:
        mtime = datetime.fromtimestamp(backup.stat().st_mtime)
        if mtime < cutoff_date:
            print(f"   Удаление: {backup.name}")
            backup.unlink()
            deleted += 1
    
    print(f"✅ Удалено бэкапов: {deleted}")


def main():
    parser = argparse.ArgumentParser(
        description="Резервное копирование базы данных EUROBOT",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Примеры:
  python backup_db.py                     # Создать бэкап
  python backup_db.py --restore backup.sql   # Восстановить
  python backup_db.py --list              # Список бэкапов
  python backup_db.py --clean 7           # Удалить старше 7 дней
        """
    )
    
    parser.add_argument(
        "--restore", "-r",
        metavar="FILE",
        help="Восстановить базу из указанного файла бэкапа"
    )
    parser.add_argument(
        "--list", "-l",
        action="store_true",
        help="Показать список всех бэкапов"
    )
    parser.add_argument(
        "--clean", "-c",
        type=int,
        metavar="DAYS",
        help="Удалить бэкапы старше указанного количества дней"
    )
    
    args = parser.parse_args()
    config = get_config()
    
    print("=" * 50)
    print("🗄️  EUROBOT Database Backup Tool")
    print("=" * 50)
    print()
    
    if args.list:
        list_backups(config)
    elif args.restore:
        restore_backup(config, args.restore)
    elif args.clean:
        clean_old_backups(config, args.clean)
    else:
        # По умолчанию - создать бэкап
        create_backup(config)


if __name__ == "__main__":
    main()
