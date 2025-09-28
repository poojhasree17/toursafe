@echo off
echo 🧪 Testing AI Service...
echo.
cd /d "%~dp0\apps\ai"
python -c "
import requests
import json

try:
    # Test health endpoint
    print('Testing AI service health...')
    response = requests.get('http://localhost:8000/health')
    if response.status_code == 200:
        print('✅ AI Service is healthy!')
        print(json.dumps(response.json(), indent=2))
    else:
        print('❌ AI Service health check failed')
        print(f'Status: {response.status_code}')
        
    # Test score endpoint with sample data
    print('\nTesting anomaly detection...')
    sample_data = {
        'pings': [
            {
                'ts': '2024-01-01T12:00:00Z',
                'lat': 18.9220,
                'lng': 72.8350,
                'speed': 1.2,
                'bearing': 45
            },
            {
                'ts': '2024-01-01T12:00:30Z', 
                'lat': 18.9222,
                'lng': 72.8352,
                'speed': 1.1,
                'bearing': 47
            }
        ]
    }
    
    response = requests.post('http://localhost:8000/score', json=sample_data)
    if response.status_code == 200:
        print('✅ AI anomaly detection working!')
        result = response.json()
        print(f'Verdict: {result[\"verdict\"]}')
        print(f'Score: {result[\"score\"]}')
        print(f'Reason: {result[\"reason\"]}')
    else:
        print('❌ AI anomaly detection failed')
        print(f'Status: {response.status_code}')
        
except requests.exceptions.ConnectionError:
    print('❌ Cannot connect to AI service. Make sure it is running on port 8000')
except Exception as e:
    print(f'❌ Test failed: {e}')
"
echo.
pause
