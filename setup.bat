@echo off
chcp 65001 > nul
echo ============================================
echo   PDF Tools - Установка зависимостей
echo ============================================
echo.

:: Проверка Node.js
node -v > nul 2>&1
if %errorlevel% neq 0 (
    echo [ОШИБКА] Node.js не найден!
    echo Скачай и установи с https://nodejs.org/ (версия 18+)
    pause
    exit /b 1
)

echo [OK] Node.js найден:
node -v
echo.

:: Установка зависимостей
echo [INFO] Устанавливаем зависимости...
npm install

if %errorlevel% neq 0 (
    echo [ОШИБКА] npm install завершился с ошибкой!
    pause
    exit /b 1
)

echo.
echo ============================================
echo   Установка завершена успешно!
echo   Запусти start-dev.bat для старта
echo ============================================
pause
