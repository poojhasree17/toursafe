@echo off
echo 🤖 Starting TourSafe AI Service...
echo.
echo This will start the Python AI service on http://localhost:8000
echo.
cd /d "%~dp0\apps\ai"
python -u -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload --log-level info
pause
