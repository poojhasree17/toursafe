@echo off
echo 🚀 Starting TourSafe with Supabase...

REM Start Supabase in background
echo 📦 Starting Supabase...
start "Supabase" cmd /k ".\scripts\bin\supabase.exe start"

REM Wait for Supabase to be ready
echo ⏳ Waiting for Supabase to initialize (30 seconds)...
timeout /t 30 /nobreak >nul

REM Get Supabase credentials and set as environment variables
for /f "tokens=*" %%i in ('.\scripts\bin\supabase.exe status --output json') do set SUPABASE_JSON=%%i

echo 🔥 Starting Next.js and AI services...

REM Start Next.js
start "Next.js Web App" cmd /k "pnpm dev:web"

REM Start AI Service  
start "Python AI Service" cmd /k "cd apps\ai && venv\Scripts\activate.bat && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

echo.
echo ✅ All services started!
echo.
echo 📦 Supabase Studio: http://localhost:54323
echo 🌐 Web App: http://localhost:3000
echo 🤖 AI Service: http://localhost:8000
echo 📊 AI Health: http://localhost:8000/health
echo.
echo Press any key to stop all services...
pause >nul

echo 🛑 Stopping services...
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im python.exe >nul 2>&1
.\scripts\bin\supabase.exe stop
echo ✅ Services stopped

