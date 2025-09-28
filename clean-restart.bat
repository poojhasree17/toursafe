@echo off
echo 🔄 TourSafe Clean Restart
echo.

REM Kill any existing processes
echo Cleaning up processes...
taskkill /f /im node.exe >nul 2>&1

echo Waiting for cleanup...
timeout /t 3 >nul

echo.
echo 🏗️ Building shared packages...
pnpm --filter @toursafe/lib build
pnpm --filter @toursafe/ui build

echo.
echo 🌐 Starting Web App (this may take 30-60 seconds)...
echo.
echo Once you see "Ready" message, visit:
echo 📍 http://localhost:3000
echo.
echo Starting...

cd apps\web
pnpm dev
