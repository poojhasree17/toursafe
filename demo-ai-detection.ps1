#!/usr/bin/env pwsh
# TourSafe AI Anomaly Detection Demo
# This script demonstrates the AI service's real-time tourist behavior analysis

$ErrorActionPreference = "Stop"

Write-Host @"

╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║       🤖 TourSafe AI Anomaly Detection Demo 🎯              ║
║                                                              ║
║  This demo shows the AI service detecting:                  ║
║  • IMMOBILE patterns (tourist stuck/in danger)              ║
║  • DEVIATION patterns (erratic/unusual movement)            ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Cyan

# Configuration
$WEB_API = "http://localhost:3000"
$AI_API = "http://localhost:8000"
$TOURIST_ID = "33333333-3333-3333-3333-333333333333" # Demo tourist Alice

# Check services
Write-Host "📡 Checking Services..." -ForegroundColor Yellow
try {
    $aiHealth = Invoke-WebRequest -Uri "$AI_API/health" -TimeoutSec 5 | ConvertFrom-Json
    Write-Host "  ✅ AI Service: $($aiHealth.status)" -ForegroundColor Green
} catch {
    Write-Host "  ❌ AI Service not running! Run: .\start-ai.bat" -ForegroundColor Red
    exit 1
}

try {
    $webTest = Test-NetConnection -ComputerName localhost -Port 3000 -WarningAction SilentlyContinue
    if ($webTest.TcpTestSucceeded) {
        Write-Host "  ✅ Web Service: running" -ForegroundColor Green
    } else {
        throw "Not running"
    }
} catch {
    Write-Host "  ❌ Web Service not running! Run: .\start-web.bat" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Function to send ping
function Send-Ping($lat, $lng, $speed, $bearing) {
    $body = @{
        tourist_id = $TOURIST_ID
        lat = $lat
        lng = $lng
        speed = $speed
        bearing = $bearing
    } | ConvertTo-Json
    
    try {
        $response = Invoke-WebRequest -Uri "$WEB_API/api/v1/ping" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 10
        return $response.StatusCode -eq 200
    } catch {
        Write-Host "  ⚠️  Ping failed: $_" -ForegroundColor Yellow
        return $false
    }
}

# Demo 1: Normal Movement (AI should say OK)
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host "📊 DEMO 1: Normal Tourist Movement" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host "Simulating tourist walking normally through Mumbai..."
Write-Host ""

$startLat = 18.9200
$startLng = 72.8300

Write-Host "Sending GPS pings (one every 2 seconds):" -ForegroundColor Gray
for ($i = 0; $i -lt 6; $i++) {
    $lat = $startLat + ($i * 0.001)  # Moving ~111 meters each time
    $lng = $startLng + ($i * 0.001)
    $speed = 1.2 + (Get-Random -Minimum -0.2 -Maximum 0.2)  # ~1.2 m/s (walking speed)
    $bearing = 45 + (Get-Random -Minimum -5 -Maximum 5)
    
    Write-Host "  Ping $($i+1)/6: lat=$([math]::Round($lat, 4)), lng=$([math]::Round($lng, 4)), speed=$([math]::Round($speed, 2))m/s" -ForegroundColor Gray
    Send-Ping $lat $lng $speed $bearing | Out-Null
    
    if ($i -eq 4) {
        Write-Host "    → AI service called after 5th ping..." -ForegroundColor Yellow
    }
    
    Start-Sleep -Seconds 2
}

Write-Host ""
Write-Host "👀 CHECK YOUR AI SERVICE WINDOW NOW!" -ForegroundColor Green -BackgroundColor Black
Write-Host "   You should see: INFO:main:Analysis result: OK" -ForegroundColor Green
Write-Host ""
Start-Sleep -Seconds 3

# Demo 2: Immobile Tourist (DANGER!)
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host "🚨 DEMO 2: Immobile Tourist Detection (DANGER)" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host "Simulating tourist stuck in one place (medical emergency/kidnapping)..."
Write-Host ""

$fixedLat = 18.9250
$fixedLng = 72.8350

Write-Host "Sending stationary GPS pings (every 1 second):" -ForegroundColor Gray
for ($i = 0; $i -lt 8; $i++) {
    # Add tiny random variations (GPS drift) but essentially same location
    $lat = $fixedLat + (Get-Random -Minimum -0.00001 -Maximum 0.00001)
    $lng = $fixedLng + (Get-Random -Minimum -0.00001 -Maximum 0.00001)
    $speed = 0.01  # Nearly zero movement
    $bearing = 45
    
    Write-Host "  Ping $($i+1)/8: STATIONARY at ($([math]::Round($fixedLat, 4)), $([math]::Round($fixedLng, 4)))" -ForegroundColor Red
    Send-Ping $lat $lng $speed $bearing | Out-Null
    
    if ($i -eq 4) {
        Write-Host "    → AI service analyzing pattern..." -ForegroundColor Yellow
    }
    
    if ($i -eq 5) {
        Write-Host "    🚨 AI should detect IMMOBILE!" -ForegroundColor Red -BackgroundColor Black
    }
    
    Start-Sleep -Seconds 1
}

Write-Host ""
Write-Host "👀 CHECK YOUR AI SERVICE WINDOW NOW!" -ForegroundColor Red -BackgroundColor Black
Write-Host "   You should see: INFO:main:Analysis result: IMMOBILE (score: 0.8)" -ForegroundColor Red
Write-Host ""
Start-Sleep -Seconds 3

# Demo 3: Erratic Movement (Deviation)
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host "⚠️  DEMO 3: Erratic Movement Detection (DEVIATION)" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host "Simulating tourist with unusual zigzag pattern (distress/confusion)..."
Write-Host ""

$centerLat = 18.9300
$centerLng = 72.8400

Write-Host "Sending erratic GPS pings (rapid direction changes):" -ForegroundColor Gray
$directions = @(
    @{ dlat = 0.002; dlng = 0.001; bearing = 45 },
    @{ dlat = -0.001; dlng = 0.003; bearing = 120 },
    @{ dlat = 0.003; dlng = -0.002; bearing = 200 },
    @{ dlat = -0.002; dlng = -0.001; bearing = 300 },
    @{ dlat = 0.001; dlng = 0.004; bearing = 80 },
    @{ dlat = -0.003; dlng = 0.002; bearing = 160 },
    @{ dlat = 0.002; dlng = -0.003; bearing = 250 }
)

$currentLat = $centerLat
$currentLng = $centerLng

for ($i = 0; $i -lt $directions.Count; $i++) {
    $dir = $directions[$i]
    $currentLat += $dir.dlat
    $currentLng += $dir.dlng
    $speed = Get-Random -Minimum 2.0 -Maximum 4.0  # Faster, erratic
    $bearing = $dir.bearing
    
    Write-Host "  Ping $($i+1)/7: bearing=$($bearing)° (ZIGZAG pattern)" -ForegroundColor Yellow
    Send-Ping $currentLat $currentLng $speed $bearing | Out-Null
    
    if ($i -eq 4) {
        Write-Host "    → AI service analyzing erratic pattern..." -ForegroundColor Yellow
    }
    
    Start-Sleep -Seconds 1
}

Write-Host ""
Write-Host "👀 CHECK YOUR AI SERVICE WINDOW NOW!" -ForegroundColor Yellow -BackgroundColor Black
Write-Host "   You might see: INFO:main:Analysis result: DEVIATION" -ForegroundColor Yellow
Write-Host ""
Start-Sleep -Seconds 3

# Summary
Write-Host ""
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host "📊 Demo Complete! Summary:" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host ""
Write-Host "✅ Demo 1: Normal movement  → AI verdict: OK" -ForegroundColor Green
Write-Host "🚨 Demo 2: Immobile tourist → AI verdict: IMMOBILE (auto-incident created)" -ForegroundColor Red
Write-Host "⚠️  Demo 3: Erratic movement → AI verdict: DEVIATION (possible)" -ForegroundColor Yellow
Write-Host ""
Write-Host "🔍 What Just Happened:" -ForegroundColor Cyan
Write-Host "  • Sent 21 GPS pings total" -ForegroundColor Gray
Write-Host "  • AI service analyzed 3 different patterns" -ForegroundColor Gray
Write-Host "  • ML model (IsolationForest) + Rule-based detection" -ForegroundColor Gray
Write-Host "  • Auto-created incidents for anomalies" -ForegroundColor Gray
Write-Host ""
Write-Host "📈 To View AI Model Performance:" -ForegroundColor Cyan
Write-Host "  1. Open: http://localhost:8000/docs (FastAPI Swagger UI)" -ForegroundColor Gray
Write-Host "  2. Open: http://localhost:8000/model-info (Model details)" -ForegroundColor Gray
Write-Host "  3. Open: http://localhost:3000/admin/incidents (See AI-generated incidents)" -ForegroundColor Gray
Write-Host ""
Write-Host "🎯 AI Service Logs Location:" -ForegroundColor Cyan
Write-Host "  Check the PowerShell window running .\start-ai.bat" -ForegroundColor Gray
Write-Host "  You should see multiple 'Analyzing X pings' messages" -ForegroundColor Gray
Write-Host ""

# Show model info
Write-Host "AI Model Details:" -ForegroundColor Cyan
try {
    $modelInfo = Invoke-WebRequest -Uri "$AI_API/model-info" | ConvertFrom-Json
    Write-Host "  Algorithm: $($modelInfo.model_type)" -ForegroundColor Gray
    Write-Host "  Training Samples: $($modelInfo.training_samples)" -ForegroundColor Gray
    Write-Host "  Status: $($modelInfo.status)" -ForegroundColor Gray
} catch {
    Write-Host "  Could not fetch model info" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✨ Demo complete! Press any key to exit..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

