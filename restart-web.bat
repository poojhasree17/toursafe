@echo off
echo 🔄 Restarting TourSafe Web App...
echo.
echo Building shared packages first...
cd /d "%~dp0"
pnpm --filter @toursafe/lib build
pnpm --filter @toursafe/ui build
echo.
echo Starting web application...
pnpm --filter web dev
pause
