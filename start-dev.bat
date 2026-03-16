@echo off
chcp 65001 > nul
echo ============================================
echo   PDF Tools - Запуск в режиме разработки
echo ============================================
echo.
echo [INFO] Сервер запускается на http://localhost:5000
echo [INFO] Нажми Ctrl+C для остановки
echo.
set NODE_ENV=development
npx tsx server/index.ts
pause
