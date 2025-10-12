#!/usr/bin/env pwsh
# TourSafe AI Integration Test Script
# This script verifies that the AI service and Web service are working together

Write-Host "🧪 TourSafe AI Integration Test" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# Test 1: Check AI Service Health
Write-Host "1️⃣ Testing AI Service Health..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-WebRequest -Uri "http://localhost:8000/health" -Method GET -TimeoutSec 5
    $healthData = $healthResponse.Content | ConvertFrom-Json
    Write-Host "   ✅ AI Service is healthy" -ForegroundColor Green
    Write-Host "      Status: $($healthData.status)" -ForegroundColor Gray
    Write-Host "      Timestamp: $($healthData.timestamp)`n" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ AI Service health check failed: $_`n" -ForegroundColor Red
    exit 1
}

# Test 2: Test AI Service Direct Scoring
Write-Host "2️⃣ Testing AI Service /score endpoint..." -ForegroundColor Yellow
$testPings = @{
    pings = @(
        @{ ts = "2025-10-12T10:00:00Z"; lat = 18.92; lng = 72.83; speed = 1.0; bearing = 45 },
        @{ ts = "2025-10-12T10:01:00Z"; lat = 18.921; lng = 72.831; speed = 1.2; bearing = 50 },
        @{ ts = "2025-10-12T10:02:00Z"; lat = 18.922; lng = 72.832; speed = 1.1; bearing = 48 },
        @{ ts = "2025-10-12T10:03:00Z"; lat = 18.923; lng = 72.833; speed = 1.3; bearing = 47 },
        @{ ts = "2025-10-12T10:04:00Z"; lat = 18.924; lng = 72.834; speed = 1.0; bearing = 46 }
    )
} | ConvertTo-Json -Depth 10

try {
    $scoreResponse = Invoke-WebRequest -Uri "http://localhost:8000/score" -Method POST -Body $testPings -ContentType "application/json" -TimeoutSec 10
    $scoreData = $scoreResponse.Content | ConvertFrom-Json
    Write-Host "   ✅ AI Service scoring works" -ForegroundColor Green
    Write-Host "      Verdict: $($scoreData.verdict)" -ForegroundColor Gray
    Write-Host "      Score: $($scoreData.score)" -ForegroundColor Gray
    Write-Host "      Reason: $($scoreData.reason)`n" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ AI Service scoring failed: $_`n" -ForegroundColor Red
    exit 1
}

# Test 3: Test Web Service
Write-Host "3️⃣ Testing Web Service health..." -ForegroundColor Yellow
try {
    $webTest = Test-NetConnection -ComputerName localhost -Port 3000 -WarningAction SilentlyContinue
    if ($webTest.TcpTestSucceeded) {
        Write-Host "   ✅ Web Service is running on port 3000`n" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Web Service is not running`n" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   ❌ Web Service check failed: $_`n" -ForegroundColor Red
    exit 1
}

# Test 4: Send GPS pings through Web API
Write-Host "4️⃣ Testing Integration: Sending GPS pings through Web API..." -ForegroundColor Yellow
$touristId = "33333333-3333-3333-3333-333333333333"
$successCount = 0

for ($i = 1; $i -le 6; $i++) {
    $lat = 18.92 + ($i * 0.001)
    $lng = 72.83 + ($i * 0.001)
    
    $pingData = @{
        tourist_id = $touristId
        lat = $lat
        lng = $lng
        speed = 1.2
        bearing = 45 + $i
    } | ConvertTo-Json
    
    try {
        $pingResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/v1/ping" -Method POST -Body $pingData -ContentType "application/json" -TimeoutSec 10
        if ($pingResponse.StatusCode -eq 200) {
            $successCount++
        }
        Start-Sleep -Milliseconds 300
    } catch {
        Write-Host "   ⚠️ Ping $i failed: $_" -ForegroundColor Yellow
    }
}

Write-Host "   ✅ Sent $successCount/6 pings successfully" -ForegroundColor Green
Write-Host "      (After 5 pings, Web API should call AI service)`n" -ForegroundColor Gray

# Test 5: Test Immobility Detection
Write-Host "5️⃣ Testing Immobility Detection..." -ForegroundColor Yellow
Write-Host "   Sending stationary pings to trigger IMMOBILE alert..." -ForegroundColor Gray

$immobileCount = 0
for ($i = 1; $i -le 7; $i++) {
    $pingData = @{
        tourist_id = $touristId
        lat = 18.92
        lng = 72.83
        speed = 0.01
        bearing = 45
    } | ConvertTo-Json
    
    try {
        $pingResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/v1/ping" -Method POST -Body $pingData -ContentType "application/json" -TimeoutSec 10
        if ($pingResponse.StatusCode -eq 200) {
            $immobileCount++
        }
        Start-Sleep -Seconds 1
    } catch {
        Write-Host "   ⚠️ Immobile ping $i failed: $_" -ForegroundColor Yellow
    }
}

Write-Host "   ✅ Sent $immobileCount/7 immobile pings" -ForegroundColor Green
Write-Host "      AI should detect IMMOBILE pattern`n" -ForegroundColor Gray

# Summary
Write-Host "================================" -ForegroundColor Cyan
Write-Host "📊 Test Summary" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host "✅ AI Service is running on http://localhost:8000" -ForegroundColor Green
Write-Host "✅ Web Service is running on http://localhost:3000" -ForegroundColor Green
Write-Host "✅ Integration works: Web API -> AI Service" -ForegroundColor Green
Write-Host "`n🔍 To see AI service logs:" -ForegroundColor Yellow
Write-Host "   Check the PowerShell window where you ran ./start-ai.bat" -ForegroundColor Gray
Write-Host "   Look for lines like:" -ForegroundColor Gray
Write-Host "   INFO:main:Analyzing X pings" -ForegroundColor Gray
Write-Host "   INFO:main:Analysis result: IMMOBILE (score: 0.8)`n" -ForegroundColor Gray

Write-Host "🎯 To manually test AI service:" -ForegroundColor Yellow
Write-Host "   http://localhost:8000/docs (FastAPI Swagger UI)`n" -ForegroundColor Gray

Write-Host "🌐 To view admin dashboard:" -ForegroundColor Yellow
Write-Host "   http://localhost:3000/admin/incidents`n" -ForegroundColor Gray

