@echo off
echo ============================================
echo 🚀 TOURSAFE QUICK START (Fixed VC Service)
echo ============================================
echo.

cd /d %~dp0\apps\web

echo 📦 Installing dependencies...
call pnpm install --silent

echo.
echo 🌐 Starting web server...
echo Open http://localhost:3000 in your browser
echo.
echo ✨ The "Use Demo Credentials" button should work now!
echo.

call pnpm dev
