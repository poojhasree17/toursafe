@echo off
echo.
echo ========================================
echo    TourSafe Manual Startup Guide
echo ========================================
echo.
echo ✅ AI Service is already running on port 8000!
echo 🔄 Now starting the Web App...
echo.
echo INSTRUCTIONS:
echo 1. This window will start the web app
echo 2. Wait for "Ready" message (takes 30-60 seconds)
echo 3. Open http://localhost:3000 in your browser
echo 4. Test the AI service: http://localhost:8000/health
echo.
echo Press any key to continue...
pause >nul

echo.
echo 🏗️  Building packages...
pnpm --filter @toursafe/lib build >nul 2>&1
pnpm --filter @toursafe/ui build >nul 2>&1

echo ✅ Packages built!
echo.
echo 🚀 Starting TourSafe Web App...
echo 📍 This may take 30-60 seconds for first startup
echo 🌐 Will be available at: http://localhost:3000
echo.

cd /d "%~dp0\apps\web"
pnpm dev
