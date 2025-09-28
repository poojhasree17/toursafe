@echo off
echo 🔍 Checking TourSafe Services...
echo.

echo Checking Web App (port 3000)...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3000' -TimeoutSec 5 -UseBasicParsing; if ($response.StatusCode -eq 200) { Write-Host '✅ Web App is running' -ForegroundColor Green } else { Write-Host '❌ Web App returned status:' $response.StatusCode -ForegroundColor Red } } catch { Write-Host '❌ Web App is not responding' -ForegroundColor Red }"

echo.
echo Checking AI Service (port 8000)...  
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:8000/health' -TimeoutSec 5 -UseBasicParsing; if ($response.StatusCode -eq 200) { Write-Host '✅ AI Service is running' -ForegroundColor Green } else { Write-Host '❌ AI Service returned status:' $response.StatusCode -ForegroundColor Red } } catch { Write-Host '❌ AI Service is not responding' -ForegroundColor Red }"

echo.
echo 📋 Service Status Summary:
echo - Web App: http://localhost:3000
echo - AI Service: http://localhost:8000
echo - AI Health: http://localhost:8000/health
echo - AI Docs: http://localhost:8000/docs
echo.
pause
