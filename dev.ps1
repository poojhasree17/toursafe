# PowerShell script for Windows development
Write-Host "🚀 Starting TourSafe Development Environment..." -ForegroundColor Green

# Check dependencies
try {
    pnpm --version | Out-Null
    Write-Host "✅ pnpm found" -ForegroundColor Green
} catch {
    Write-Host "❌ pnpm is not installed. Please install it first:" -ForegroundColor Red
    Write-Host "npm install -g pnpm" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

try {
    python --version | Out-Null
    Write-Host "✅ Python found" -ForegroundColor Green
} catch {
    Write-Host "❌ Python is not installed. Please install Python 3.11+" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Install dependencies
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing Node.js dependencies..." -ForegroundColor Yellow
    pnpm install
}

if (-not (Test-Path "apps/ai/venv")) {
    Write-Host "🐍 Setting up Python virtual environment..." -ForegroundColor Yellow
    Set-Location "apps/ai"
    python -m venv venv
    & "venv/Scripts/Activate.ps1"
    pip install -r requirements.txt
    Set-Location "../.."
}

Write-Host "🔥 Starting all services..." -ForegroundColor Cyan

# Start Next.js in background
$webJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    pnpm dev:web
}

# Start AI service in background  
$aiJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    Set-Location "apps/ai"
    & "venv/Scripts/Activate.ps1"
    python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
}

Write-Host "✅ All services started!" -ForegroundColor Green
Write-Host "🌐 Web App: http://localhost:3000" -ForegroundColor Cyan
Write-Host "🤖 AI Service: http://localhost:8000" -ForegroundColor Cyan
Write-Host "📊 AI Health: http://localhost:8000/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop all services..." -ForegroundColor Yellow

# Wait for user to stop
try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    Write-Host "🛑 Stopping services..." -ForegroundColor Red
    Stop-Job $webJob, $aiJob -ErrorAction SilentlyContinue
    Remove-Job $webJob, $aiJob -ErrorAction SilentlyContinue
    Write-Host "✅ Services stopped" -ForegroundColor Green
}
