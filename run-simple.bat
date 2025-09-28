@echo off
echo 🚀 Starting TourSafe Simple Mode...
echo.

REM Kill any existing processes
echo Cleaning up processes...
taskkill /f /im node.exe >nul 2>&1

REM Wait a moment
timeout /t 2 >nul

echo Building packages...
pnpm --filter @toursafe/lib build >nul
pnpm --filter @toursafe/ui build >nul

echo.
echo 🌐 Starting Web App on http://localhost:3000
echo 📊 AI Service should already be running on http://localhost:8000
echo.
echo Press Ctrl+C to stop
echo.

cd apps\web
pnpm dev
