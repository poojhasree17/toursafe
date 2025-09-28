@echo off
echo 🌐 Starting TourSafe Web App...
echo.
echo This will start the Next.js web application on http://localhost:3000
echo.
cd /d "%~dp0"
pnpm --filter web dev
pause
