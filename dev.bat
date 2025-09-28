@echo off
echo 🚀 Starting TourSafe Development Environment...

REM Check if pnpm is installed
pnpm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ pnpm is not installed. Please install it first:
    echo npm install -g pnpm
    pause
    exit /b 1
)

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed. Please install Python 3.11+
    pause
    exit /b 1
)

echo ✅ Dependencies check passed

REM Install dependencies if needed
if not exist node_modules (
    echo 📦 Installing dependencies...
    pnpm install
)

REM Install Python dependencies if needed
if not exist apps\ai\venv (
    echo 🐍 Setting up Python virtual environment...
    cd apps\ai
    python -m venv venv
    call venv\Scripts\activate.bat
    pip install -r requirements.txt
    cd ..\..
)

echo 🔥 Starting all services...

REM Start services in parallel using start command
start "Next.js Web App" cmd /k "pnpm dev:web"
start "Python AI Service" cmd /k "cd apps\ai && venv\Scripts\activate.bat && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

echo ✅ All services started!
echo 🌐 Web App: http://localhost:3000
echo 🤖 AI Service: http://localhost:8000
echo 📊 AI Health: http://localhost:8000/health

echo.
echo Press any key to stop all services...
pause >nul

REM Kill the started processes (optional)
echo 🛑 Stopping services...
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im python.exe >nul 2>&1
echo ✅ Services stopped
