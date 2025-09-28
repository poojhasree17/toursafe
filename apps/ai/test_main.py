"""
Tests for the AI anomaly detection service
"""

import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from main import app, PingData, analyze_pings_rules

client = TestClient(app)

def test_health_endpoint():
    """Test the health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "timestamp" in data

def test_model_info_endpoint():
    """Test the model info endpoint"""
    response = client.get("/model-info")
    assert response.status_code == 200
    data = response.json()
    assert data["model_type"] == "IsolationForest"
    assert "features" in data

def test_score_endpoint_normal_movement():
    """Test scoring with normal movement pattern"""
    # Generate normal walking pings
    base_time = datetime.now(timezone.utc)
    pings = []
    
    for i in range(10):
        ts = base_time + timedelta(seconds=i*30)
        lat = 18.9220 + i * 0.0001  # Moving north slowly
        lng = 72.8350 + i * 0.0001  # Moving east slowly
        speed = 1.2  # Normal walking speed
        bearing = 45  # Northeast direction
        
        pings.append({
            "ts": ts.isoformat(),
            "lat": lat,
            "lng": lng,
            "speed": speed,
            "bearing": bearing
        })
    
    response = client.post("/score", json={"pings": pings})
    assert response.status_code == 200
    data = response.json()
    assert data["verdict"] in ["OK", "IMMOBILE", "DEVIATION"]
    assert 0 <= data["score"] <= 1
    assert isinstance(data["reason"], str)

def test_score_endpoint_immobile_pattern():
    """Test scoring with immobile pattern"""
    base_time = datetime.now(timezone.utc)
    pings = []
    
    # Tourist staying in the same location for 10 minutes
    for i in range(20):  # 20 pings over 10 minutes
        ts = base_time + timedelta(seconds=i*30)
        lat = 18.9220 + (i % 2) * 0.00001  # Tiny GPS noise
        lng = 72.8350 + (i % 3) * 0.00001  # Tiny GPS noise
        speed = 0.1  # Almost stationary
        bearing = 0
        
        pings.append({
            "ts": ts.isoformat(),
            "lat": lat,
            "lng": lng,
            "speed": speed,
            "bearing": bearing
        })
    
    response = client.post("/score", json={"pings": pings})
    assert response.status_code == 200
    data = response.json()
    # Should detect immobility
    assert data["verdict"] == "IMMOBILE"
    assert data["score"] > 0.5

def test_score_endpoint_erratic_movement():
    """Test scoring with erratic movement pattern"""
    base_time = datetime.now(timezone.utc)
    pings = []
    
    # Tourist moving in random directions with high speed changes
    for i in range(10):
        ts = base_time + timedelta(seconds=i*30)
        lat = 18.9220 + (i % 3 - 1) * 0.001  # Random lat changes
        lng = 72.8350 + (i % 5 - 2) * 0.001  # Random lng changes
        speed = 3.0 if i % 2 == 0 else 0.2     # Alternating high/low speed
        bearing = (i * 90) % 360               # Sharp turns
        
        pings.append({
            "ts": ts.isoformat(),
            "lat": lat,
            "lng": lng,
            "speed": speed,
            "bearing": bearing
        })
    
    response = client.post("/score", json={"pings": pings})
    assert response.status_code == 200
    data = response.json()
    # May detect deviation depending on the exact pattern
    assert data["verdict"] in ["OK", "DEVIATION"]

def test_score_endpoint_insufficient_data():
    """Test scoring with insufficient data"""
    pings = [{
        "ts": datetime.now(timezone.utc).isoformat(),
        "lat": 18.9220,
        "lng": 72.8350,
        "speed": 1.0,
        "bearing": 45
    }]
    
    response = client.post("/score", json={"pings": pings})
    assert response.status_code == 200
    data = response.json()
    assert data["verdict"] == "OK"  # Should handle gracefully
    assert "Insufficient" in data["reason"]

def test_score_endpoint_invalid_data():
    """Test scoring with invalid data"""
    # Invalid latitude (outside -90 to 90)
    pings = [{
        "ts": datetime.now(timezone.utc).isoformat(),
        "lat": 95.0,  # Invalid
        "lng": 72.8350,
        "speed": 1.0,
        "bearing": 45
    }]
    
    response = client.post("/score", json={"pings": pings})
    assert response.status_code == 422  # Validation error

def test_analyze_pings_rules_function():
    """Test the rules analysis function directly"""
    # Test immobile pattern
    base_time = datetime.now(timezone.utc)
    immobile_pings = []
    
    for i in range(15):  # 7.5 minutes of pings
        ts = base_time + timedelta(seconds=i*30)
        ping = PingData(
            ts=ts.isoformat(),
            lat=18.9220,
            lng=72.8350,
            speed=0.2,  # Very slow
            bearing=0
        )
        immobile_pings.append(ping)
    
    verdict, score, reason = analyze_pings_rules(immobile_pings)
    assert verdict == "IMMOBILE"
    assert score > 0.5
    assert "stationary" in reason.lower()

if __name__ == "__main__":
    pytest.main([__file__])
