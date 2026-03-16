@echo off
chcp 65001 > nul
echo ============================================
echo   PDF Tools - Сборка и запуск (production)
echo ============================================
echo.

echo [INFO] Собираем проект...
npm run build

if %errorlevel% neq 0 (
    echo [ОШИБКА] Сборка завершилась с ошибкой!
    pause
    exit /b 1
)

echo.
echo [INFO] Запускаем сервер на http://localhost:5000
echo [INFO] Нажми Ctrl+C для остановки
echo.
set NODE_ENV=production
node dist/index.cjs
pause
