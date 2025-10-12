# TourSafe AI Anomaly Detection Demo - Simple Version
# Demonstrates AI service detecting tourist behavior anomalies

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host " TourSafe AI Anomaly Detection Demo" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$WEB_API = "http://localhost:3000"
$AI_API = "http://localhost:8000"
$TOURIST_ID = "33333333-3333-3333-3333-333333333333"

# Check AI service
Write-Host "[1/2] Checking AI Service..." -ForegroundColor Yellow
try {
    $null = Invoke-WebRequest -Uri "$AI_API/health" -TimeoutSec 5
    Write-Host "  SUCCESS: AI Service is running" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: AI Service not running! Run: .\start-ai.bat" -ForegroundColor Red
    exit 1
}

# Check Web service
Write-Host "[2/2] Checking Web Service..." -ForegroundColor Yellow
$webTest = Test-NetConnection -ComputerName localhost -Port 3000 -WarningAction SilentlyContinue
if ($webTest.TcpTestSucceeded) {
    Write-Host "  SUCCESS: Web Service is running" -ForegroundColor Green
} else {
    Write-Host "  ERROR: Web Service not running!" -ForegroundColor Red
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
        Write-Host "  WARNING: Ping failed" -ForegroundColor Yellow
        return $false
    }
}

# DEMO 1: Normal Movement
Write-Host "==================================================================" -ForegroundColor DarkGray
Write-Host " DEMO 1: Normal Tourist Movement (Walking)" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor DarkGray
Write-Host "Simulating tourist walking normally..."
Write-Host ""

$startLat = 18.9200
$startLng = 72.8300

for ($i = 0; $i -lt 6; $i++) {
    $lat = $startLat + ($i * 0.001)
    $lng = $startLng + ($i * 0.001)
    $speed = 1.2
    $bearing = 45
    
    Write-Host "  Ping $($i+1)/6: Moving normally (speed: $speed m/s)" -ForegroundColor Gray
    Send-Ping $lat $lng $speed $bearing | Out-Null
    
    if ($i -eq 4) {
        Write-Host "  >> AI service analyzing after 5th ping..." -ForegroundColor Yellow
    }
    
    Start-Sleep -Seconds 2
}

Write-Host ""
Write-Host "  EXPECTED: AI should detect NORMAL movement (OK)" -ForegroundColor Green
Write-Host "  CHECK YOUR AI SERVICE WINDOW FOR LOGS!" -ForegroundColor Green -BackgroundColor Black
Write-Host ""
Start-Sleep -Seconds 3

# DEMO 2: Immobile Tourist
Write-Host "==================================================================" -ForegroundColor DarkGray
Write-Host " DEMO 2: Immobile Tourist (DANGER - Medical/Kidnapping)" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor DarkGray
Write-Host "Simulating tourist stuck in one place..."
Write-Host ""

$fixedLat = 18.9250
$fixedLng = 72.8350

for ($i = 0; $i -lt 8; $i++) {
    $lat = $fixedLat
    $lng = $fixedLng
    $speed = 0.01
    $bearing = 45
    
    Write-Host "  Ping $($i+1)/8: STATIONARY (not moving)" -ForegroundColor Red
    Send-Ping $lat $lng $speed $bearing | Out-Null
    
    if ($i -eq 4) {
        Write-Host "  >> AI service analyzing pattern..." -ForegroundColor Yellow
    }
    
    if ($i -eq 5) {
        Write-Host "  >> AI should detect IMMOBILE pattern!" -ForegroundColor Red
    }
    
    Start-Sleep -Seconds 1
}

Write-Host ""
Write-Host "  EXPECTED: AI should detect IMMOBILE (score: 0.8)" -ForegroundColor Red
Write-Host "  CHECK YOUR AI SERVICE WINDOW FOR LOGS!" -ForegroundColor Red -BackgroundColor Black
Write-Host "  Auto-incident should be created!" -ForegroundColor Red
Write-Host ""
Start-Sleep -Seconds 3

# DEMO 3: Erratic Movement
Write-Host "==================================================================" -ForegroundColor DarkGray
Write-Host " DEMO 3: Erratic Movement (Deviation Pattern)" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor DarkGray
Write-Host "Simulating tourist with zigzag movement..."
Write-Host ""

$centerLat = 18.9300
$centerLng = 72.8400

$currentLat = $centerLat
$currentLng = $centerLng

$movements = @(
    @(0.002, 0.001, 45),
    @(-0.001, 0.003, 120),
    @(0.003, -0.002, 200),
    @(-0.002, -0.001, 300),
    @(0.001, 0.004, 80),
    @(-0.003, 0.002, 160),
    @(0.002, -0.003, 250)
)

for ($i = 0; $i -lt $movements.Count; $i++) {
    $currentLat += $movements[$i][0]
    $currentLng += $movements[$i][1]
    $bearing = $movements[$i][2]
    $speed = 3.0
    
    Write-Host "  Ping $($i+1)/7: Erratic (bearing: $bearing degrees)" -ForegroundColor Yellow
    Send-Ping $currentLat $currentLng $speed $bearing | Out-Null
    
    if ($i -eq 4) {
        Write-Host "  >> AI service analyzing erratic pattern..." -ForegroundColor Yellow
    }
    
    Start-Sleep -Seconds 1
}

Write-Host ""
Write-Host "  EXPECTED: AI may detect DEVIATION" -ForegroundColor Yellow
Write-Host "  CHECK YOUR AI SERVICE WINDOW FOR LOGS!" -ForegroundColor Yellow -BackgroundColor Black
Write-Host ""
Start-Sleep -Seconds 2

# Summary
Write-Host ""
Write-Host "==================================================================" -ForegroundColor DarkGray
Write-Host " Demo Complete - Summary" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  [OK] Demo 1: Normal movement   -> Expected: OK" -ForegroundColor Green
Write-Host "  [!!] Demo 2: Immobile tourist  -> Expected: IMMOBILE" -ForegroundColor Red
Write-Host "  [!]  Demo 3: Erratic movement  -> Expected: DEVIATION" -ForegroundColor Yellow
Write-Host ""
Write-Host "Total pings sent: 21" -ForegroundColor Gray
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Cyan
Write-Host "  1. Check AI service window for analysis logs" -ForegroundColor Gray
Write-Host "  2. Open http://localhost:3000/admin/incidents (see AI incidents)" -ForegroundColor Gray
Write-Host "  3. Open http://localhost:8000/docs (API documentation)" -ForegroundColor Gray
Write-Host "  4. Open http://localhost:8000/model-info (model details)" -ForegroundColor Gray
Write-Host ""

# Show model info
Write-Host "AI Model Information:" -ForegroundColor Cyan
try {
    $modelInfo = Invoke-WebRequest -Uri "$AI_API/model-info" | ConvertFrom-Json
    Write-Host "  Algorithm: $($modelInfo.model_type)" -ForegroundColor Gray
    Write-Host "  Training Samples: $($modelInfo.training_samples)" -ForegroundColor Gray
    Write-Host "  Status: $($modelInfo.status)" -ForegroundColor Gray
} catch {
    Write-Host "  Could not fetch model info" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Demo complete!" -ForegroundColor Cyan
Write-Host ""

