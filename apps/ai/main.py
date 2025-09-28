"""
TourSafe AI Microservice for Tourist Anomaly Detection
Analyzes GPS ping patterns to detect immobility, route deviation, and other anomalies.
"""

import logging
from datetime import datetime, timezone
from typing import List, Optional

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="TourSafe AI Service",
    description="Tourist safety anomaly detection using GPS tracking data",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class PingData(BaseModel):
    """Individual GPS ping data point"""
    ts: str = Field(..., description="ISO timestamp")
    lat: float = Field(..., ge=-90, le=90, description="Latitude")
    lng: float = Field(..., ge=-180, le=180, description="Longitude") 
    speed: Optional[float] = Field(None, ge=0, description="Speed in m/s")
    bearing: Optional[float] = Field(None, ge=0, le=360, description="Bearing in degrees")

class ScoreRequest(BaseModel):
    """Request to analyze GPS pings for anomalies"""
    pings: List[PingData] = Field(..., min_items=1, description="List of GPS pings to analyze")

class ScoreResponse(BaseModel):
    """Response with anomaly analysis results"""
    verdict: str = Field(..., description="OK, IMMOBILE, or DEVIATION")
    score: float = Field(..., ge=0, le=1, description="Anomaly confidence score")
    reason: str = Field(..., description="Human-readable explanation")

class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    timestamp: str

# Global anomaly detector (trained on startup)
anomaly_detector = IsolationForest(contamination=0.1, random_state=42)
scaler = StandardScaler()

def initialize_anomaly_detector():
    """Initialize the anomaly detector with baseline data"""
    # Generate synthetic baseline data for normal tourist behavior
    np.random.seed(42)
    
    normal_data = []
    for _ in range(1000):
        # Normal walking speeds: 0.5 to 2.0 m/s
        speed = np.random.normal(1.2, 0.4)
        speed = max(0.1, min(3.0, speed))
        
        # Normal direction changes: small variations
        bearing_change = np.random.normal(0, 15)
        
        # Step distance: related to speed and time interval (assume 30s intervals)
        step_distance = speed * 30 + np.random.normal(0, 5)
        
        # Acceleration: small changes in normal movement
        acceleration = np.random.normal(0, 0.5)
        
        normal_data.append([speed, abs(bearing_change), step_distance, abs(acceleration)])
    
    # Fit the model
    normal_array = np.array(normal_data)
    scaler.fit(normal_array)
    scaled_data = scaler.transform(normal_array)
    anomaly_detector.fit(scaled_data)
    
    logger.info("Anomaly detector initialized with baseline data")

# Initialize on startup
initialize_anomaly_detector()

def calculate_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance between two GPS points in meters using Haversine formula"""
    R = 6371000  # Earth radius in meters
    
    lat1_rad = np.radians(lat1)
    lat2_rad = np.radians(lat2)
    dlat = np.radians(lat2 - lat1)
    dlng = np.radians(lng2 - lng1)
    
    a = (np.sin(dlat/2)**2 + 
         np.cos(lat1_rad) * np.cos(lat2_rad) * np.sin(dlng/2)**2)
    c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1-a))
    
    return R * c

def calculate_bearing(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate bearing between two GPS points in degrees"""
    lat1_rad = np.radians(lat1)
    lat2_rad = np.radians(lat2)
    dlng_rad = np.radians(lng2 - lng1)
    
    y = np.sin(dlng_rad) * np.cos(lat2_rad)
    x = (np.cos(lat1_rad) * np.sin(lat2_rad) - 
         np.sin(lat1_rad) * np.cos(lat2_rad) * np.cos(dlng_rad))
    
    bearing = np.degrees(np.arctan2(y, x))
    return (bearing + 360) % 360

def analyze_pings_rules(pings: List[PingData]) -> tuple[str, float, str]:
    """Rule-based analysis for specific patterns"""
    if len(pings) < 3:
        return "OK", 0.0, "Insufficient data for analysis"
    
    # Convert to DataFrame for easier analysis
    df = pd.DataFrame([{
        'ts': datetime.fromisoformat(p.ts.replace('Z', '+00:00')),
        'lat': p.lat,
        'lng': p.lng,
        'speed': p.speed or 0.0,
        'bearing': p.bearing or 0.0
    } for p in pings])
    
    df = df.sort_values('ts')
    
    # Calculate time differences
    df['time_diff'] = df['ts'].diff().dt.total_seconds()
    
    # Calculate distances and speeds if not provided
    for i in range(1, len(df)):
        if df.iloc[i]['speed'] == 0.0:  # If speed not provided, calculate it
            distance = calculate_distance(
                df.iloc[i-1]['lat'], df.iloc[i-1]['lng'],
                df.iloc[i]['lat'], df.iloc[i]['lng']
            )
            time_diff = df.iloc[i]['time_diff']
            if time_diff > 0:
                df.iloc[i, df.columns.get_loc('speed')] = distance / time_diff
    
    # Rule 1: Check for immobility
    median_speed = df['speed'].median()
    time_span_minutes = (df['ts'].max() - df['ts'].min()).total_seconds() / 60
    
    # Calculate spatial extent
    lat_range = df['lat'].max() - df['lat'].min()
    lng_range = df['lng'].max() - df['lng'].min()
    spatial_radius = np.sqrt(lat_range**2 + lng_range**2) * 111000  # Rough conversion to meters
    
    if (median_speed < 0.5 and  # Very low speed
        spatial_radius < 15 and  # Small area
        time_span_minutes >= 6):  # Extended period
        return "IMMOBILE", 0.8, f"Tourist stationary for {time_span_minutes:.1f} minutes (median speed: {median_speed:.2f} m/s, radius: {spatial_radius:.1f}m)"
    
    # Rule 2: Check for unusual route deviation
    if len(df) >= 5:
        # Calculate bearing changes
        bearing_changes = []
        for i in range(2, len(df)):
            bearing1 = calculate_bearing(
                df.iloc[i-2]['lat'], df.iloc[i-2]['lng'],
                df.iloc[i-1]['lat'], df.iloc[i-1]['lng']
            )
            bearing2 = calculate_bearing(
                df.iloc[i-1]['lat'], df.iloc[i-1]['lng'],
                df.iloc[i]['lat'], df.iloc[i]['lng']
            )
            
            # Calculate angular difference
            diff = abs(bearing2 - bearing1)
            if diff > 180:
                diff = 360 - diff
            bearing_changes.append(diff)
        
        if bearing_changes:
            bearing_variance = np.var(bearing_changes)
            mean_bearing_change = np.mean(bearing_changes)
            
            # Check for erratic movement patterns
            if (bearing_variance > 5000 and  # High variance in direction
                mean_bearing_change > 60):     # Large average direction changes
                return "DEVIATION", 0.7, f"Erratic movement detected (bearing variance: {bearing_variance:.1f}, avg change: {mean_bearing_change:.1f}°)"
    
    return "OK", 0.1, "Normal movement pattern detected"

def analyze_pings_ml(pings: List[PingData]) -> tuple[str, float, str]:
    """ML-based anomaly detection"""
    if len(pings) < 5:
        return "OK", 0.0, "Insufficient data for ML analysis"
    
    try:
        # Extract features
        features = []
        
        for i in range(1, len(pings)):
            prev_ping = pings[i-1]
            curr_ping = pings[i]
            
            # Time difference
            prev_time = datetime.fromisoformat(prev_ping.ts.replace('Z', '+00:00'))
            curr_time = datetime.fromisoformat(curr_ping.ts.replace('Z', '+00:00'))
            time_diff = (curr_time - prev_time).total_seconds()
            
            if time_diff <= 0:
                continue
                
            # Distance
            distance = calculate_distance(prev_ping.lat, prev_ping.lng, curr_ping.lat, curr_ping.lng)
            
            # Speed (calculated or provided)
            speed = curr_ping.speed if curr_ping.speed is not None else distance / time_diff
            
            # Bearing change
            if i > 1:
                prev_prev_ping = pings[i-2]
                bearing1 = calculate_bearing(prev_prev_ping.lat, prev_prev_ping.lng, prev_ping.lat, prev_ping.lng)
                bearing2 = calculate_bearing(prev_ping.lat, prev_ping.lng, curr_ping.lat, curr_ping.lng)
                bearing_change = abs(bearing2 - bearing1)
                if bearing_change > 180:
                    bearing_change = 360 - bearing_change
            else:
                bearing_change = 0
            
            # Acceleration (speed change)
            if i > 1 and hasattr(pings[i-2], 'speed') and pings[i-2].speed is not None:
                prev_speed = pings[i-2].speed
                acceleration = (speed - prev_speed) / time_diff
            else:
                acceleration = 0
            
            features.append([speed, bearing_change, distance, abs(acceleration)])
        
        if len(features) < 2:
            return "OK", 0.0, "Insufficient features for ML analysis"
        
        # Scale features and predict
        features_array = np.array(features)
        features_scaled = scaler.transform(features_array)
        
        # Get anomaly scores
        anomaly_scores = anomaly_detector.decision_function(features_scaled)
        predictions = anomaly_detector.predict(features_scaled)
        
        # Calculate aggregate anomaly score
        avg_anomaly_score = np.mean(anomaly_scores)
        anomaly_count = np.sum(predictions == -1)  # -1 indicates anomaly
        anomaly_ratio = anomaly_count / len(predictions)
        
        # Convert to 0-1 scale (lower decision function values indicate higher anomaly)
        normalized_score = max(0.0, min(1.0, (0.5 - avg_anomaly_score) * 2))
        
        if anomaly_ratio > 0.3:  # If >30% of points are anomalous
            return "DEVIATION", normalized_score, f"ML detected anomalous movement pattern ({anomaly_ratio:.1%} anomalous points)"
        
        return "OK", normalized_score, "ML analysis indicates normal movement"
        
    except Exception as e:
        logger.warning(f"ML analysis failed: {e}")
        return "OK", 0.0, "ML analysis unavailable"

@app.get("/", response_model=HealthResponse)
async def root():
    """Root endpoint for health check"""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now(timezone.utc).isoformat()
    )

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy", 
        timestamp=datetime.now(timezone.utc).isoformat()
    )

@app.post("/score", response_model=ScoreResponse)
async def score_pings(request: ScoreRequest):
    """Analyze GPS pings for anomalies"""
    try:
        logger.info(f"Analyzing {len(request.pings)} pings")
        
        # Run rule-based analysis first
        rule_verdict, rule_score, rule_reason = analyze_pings_rules(request.pings)
        
        # If rules detect an anomaly, prioritize that
        if rule_verdict != "OK":
            return ScoreResponse(
                verdict=rule_verdict,
                score=rule_score,
                reason=rule_reason
            )
        
        # Otherwise, run ML analysis
        ml_verdict, ml_score, ml_reason = analyze_pings_ml(request.pings)
        
        # Combine results (rules take precedence)
        final_verdict = rule_verdict if rule_verdict != "OK" else ml_verdict
        final_score = max(rule_score, ml_score)
        final_reason = rule_reason if rule_verdict != "OK" else ml_reason
        
        logger.info(f"Analysis result: {final_verdict} (score: {final_score:.3f})")
        
        return ScoreResponse(
            verdict=final_verdict,
            score=final_score,
            reason=final_reason
        )
        
    except Exception as e:
        logger.error(f"Error analyzing pings: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.get("/model-info")
async def model_info():
    """Get information about the trained model"""
    return {
        "model_type": "IsolationForest",
        "contamination": 0.1,
        "features": ["speed", "bearing_change", "step_distance", "acceleration"],
        "training_samples": 1000,
        "status": "ready"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
