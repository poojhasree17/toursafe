"""
TourSafe AI Microservice for Tourist Anomaly Detection
Analyzes GPS ping patterns to detect immobility, route deviation, and other anomalies.
"""

import logging
from datetime import datetime, timezone
from typing import List, Optional
import time

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

# Configure logging with immediate flush
import sys

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stdout,
    force=True
)
logger = logging.getLogger(__name__)

# Force flush after each log
class FlushHandler(logging.StreamHandler):
    def emit(self, record):
        super().emit(record)
        self.flush()

# Replace default handler with flush handler
logger.handlers = []
flush_handler = FlushHandler(sys.stdout)
flush_handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
logger.addHandler(flush_handler)
logger.setLevel(logging.INFO)

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

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests and responses"""
    start_time = time.time()
    
    # Log incoming request
    logger.info(f"🌐 Incoming {request.method} request to {request.url.path}")
    if request.client:
        logger.info(f"   Client: {request.client.host}:{request.client.port}")
    
    # Process request
    response = await call_next(request)
    
    # Log response
    duration = time.time() - start_time
    logger.info(f"✓ Response: {response.status_code} | Duration: {duration:.3f}s")
    
    return response

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

# Startup event
@app.on_event("startup")
async def startup_event():
    """Log startup information"""
    logger.info("=" * 80)
    logger.info("🚀 TourSafe AI Service Starting Up")
    logger.info("=" * 80)
    logger.info(f"   Service: TourSafe AI Microservice v1.0.0")
    logger.info(f"   Purpose: Tourist Anomaly Detection")
    logger.info(f"   Model: IsolationForest with contamination=0.1")
    logger.info(f"   Features: speed, bearing_change, step_distance, acceleration")
    logger.info(f"   Timestamp: {datetime.now(timezone.utc).isoformat()}")
    logger.info("=" * 80)

# Initialize on startup
initialize_anomaly_detector()
logger.info("✅ Service initialization complete - Ready to accept requests")

@app.on_event("shutdown")
async def shutdown_event():
    """Log shutdown information"""
    logger.info("=" * 80)
    logger.info("🛑 TourSafe AI Service Shutting Down")
    logger.info(f"   Timestamp: {datetime.now(timezone.utc).isoformat()}")
    logger.info("=" * 80)

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
    logger.info(f"   🔍 analyze_pings_rules: Processing {len(pings)} pings")
    
    if len(pings) < 3:
        logger.info("   ⏸️  Insufficient data (< 3 pings)")
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
    distances = []
    for i in range(1, len(df)):
        if df.iloc[i]['speed'] == 0.0:  # If speed not provided, calculate it
            distance = calculate_distance(
                df.iloc[i-1]['lat'], df.iloc[i-1]['lng'],
                df.iloc[i]['lat'], df.iloc[i]['lng']
            )
            distances.append(distance)
            time_diff = df.iloc[i]['time_diff']
            if time_diff > 0:
                df.iloc[i, df.columns.get_loc('speed')] = distance / time_diff
    
    # Rule 1: Check for immobility
    median_speed = df['speed'].median()
    max_speed = df['speed'].max()
    time_span_minutes = (df['ts'].max() - df['ts'].min()).total_seconds() / 60
    
    # Calculate spatial extent
    lat_range = df['lat'].max() - df['lat'].min()
    lng_range = df['lng'].max() - df['lng'].min()
    spatial_radius = np.sqrt(lat_range**2 + lng_range**2) * 111000  # Rough conversion to meters
    
    # Calculate max distance between any two consecutive points
    max_movement = max(distances) if distances else 0
    
    logger.info(f"   📊 Immobility Analysis:")
    logger.info(f"      • Time span: {time_span_minutes:.1f} minutes")
    logger.info(f"      • Median speed: {median_speed:.2f} m/s")
    logger.info(f"      • Max speed: {max_speed:.2f} m/s")
    logger.info(f"      • Spatial radius: {spatial_radius:.1f}m")
    logger.info(f"      • Max movement: {max_movement:.1f}m")
    
    # IMPROVED: More sensitive immobility detection
    # Detect if tourist is stationary or moving very slowly in a small area
    if time_span_minutes >= 4:  # Lowered from 6 to 4 minutes
        # Check for true immobility (very small movements)
        if spatial_radius < 20 and median_speed < 0.3:  # Relaxed thresholds
            score = min(0.9, 0.6 + (time_span_minutes / 20))  # Higher score for longer periods
            logger.info(f"   🚨 IMMOBILITY DETECTED: Stationary in {spatial_radius:.1f}m area for {time_span_minutes:.1f} min")
            return "IMMOBILE", score, f"Tourist stationary for {time_span_minutes:.1f} minutes in {spatial_radius:.1f}m radius (median speed: {median_speed:.2f} m/s)"
        
        # Check for prolonged slow movement
        elif spatial_radius < 50 and median_speed < 0.5 and max_speed < 1.0:
            score = min(0.8, 0.5 + (time_span_minutes / 30))
            logger.info(f"   ⚠️  SLOW MOVEMENT: Very slow movement detected over {time_span_minutes:.1f} min")
            return "IMMOBILE", score, f"Prolonged slow movement detected: {spatial_radius:.1f}m in {time_span_minutes:.1f} minutes (max speed: {max_speed:.2f} m/s)"
    
    # Rule 2: Check for sudden location jumps (teleportation/GPS errors/drop-offs)
    logger.info(f"   🔍 Checking for sudden location changes...")
    if len(distances) > 0:
        # Check for sudden large movements that are unrealistic
        for i, distance in enumerate(distances):
            time_diff = df.iloc[i+1]['time_diff']
            if time_diff > 0:
                implied_speed = distance / time_diff  # m/s
                implied_speed_kmh = implied_speed * 3.6
                
                # Detect unrealistic jumps (>150 km/h) or very large sudden movements (>500m in <30s)
                if implied_speed_kmh > 150:  # Faster than highway speed
                    logger.info(f"   🚨 SUDDEN JUMP: {distance:.0f}m in {time_diff:.0f}s = {implied_speed_kmh:.0f} km/h")
                    return "DEVIATION", 0.85, f"Sudden location jump detected: {distance:.0f}m in {time_diff:.0f}s (impossible speed: {implied_speed_kmh:.0f} km/h)"
                elif distance > 500 and time_diff < 30:  # 500m in less than 30 seconds
                    logger.info(f"   ⚠️  LARGE MOVEMENT: {distance:.0f}m in {time_diff:.0f}s")
                    return "DEVIATION", 0.75, f"Large unexpected movement: {distance:.0f}m in {time_diff:.0f}s"
    
    # Rule 3: Check for unusual route deviation (erratic movement)
    if len(df) >= 5:
        logger.info(f"   🔍 Checking for erratic movement patterns...")
        # Calculate bearing changes
        bearing_changes = []
        for i in range(2, len(df)):
            # Only calculate bearing if points are far enough apart (>5m)
            dist1 = calculate_distance(
                df.iloc[i-2]['lat'], df.iloc[i-2]['lng'],
                df.iloc[i-1]['lat'], df.iloc[i-1]['lng']
            )
            dist2 = calculate_distance(
                df.iloc[i-1]['lat'], df.iloc[i-1]['lng'],
                df.iloc[i]['lat'], df.iloc[i]['lng']
            )
            
            if dist1 > 5 and dist2 > 5:  # Only if there's actual movement
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
        
        if len(bearing_changes) >= 2:
            bearing_variance = np.var(bearing_changes)
            mean_bearing_change = np.mean(bearing_changes)
            
            logger.info(f"   📊 Movement Pattern:")
            logger.info(f"      • Bearing variance: {bearing_variance:.1f}")
            logger.info(f"      • Mean bearing change: {mean_bearing_change:.1f}°")
            
            # Check for erratic movement patterns (reduced thresholds)
            if bearing_variance > 3000 and mean_bearing_change > 50:
                logger.info(f"   ⚠️  DEVIATION DETECTED: Erratic movement pattern")
                return "DEVIATION", 0.7, f"Erratic movement detected (bearing variance: {bearing_variance:.1f}°, avg change: {mean_bearing_change:.1f}°)"
    
    logger.info("   ✅ No anomalies detected by rule-based analysis")
    return "OK", 0.1, "Normal movement pattern detected"

def analyze_pings_ml(pings: List[PingData]) -> tuple[str, float, str]:
    """ML-based anomaly detection"""
    logger.info(f"   🤖 analyze_pings_ml: Processing {len(pings)} pings")
    
    if len(pings) < 5:
        logger.info("   ⏸️  Insufficient data (< 5 pings) for ML")
        return "OK", 0.0, "Insufficient data for ML analysis"
    
    try:
        # Extract features
        logger.info("   🔧 Extracting features for ML analysis...")
        features = []
        
        for i in range(1, len(pings)):
            prev_ping = pings[i-1]
            curr_ping = pings[i]
            
            # Time difference
            prev_time = datetime.fromisoformat(prev_ping.ts.replace('Z', '+00:00'))
            curr_time = datetime.fromisoformat(curr_ping.ts.replace('Z', '+00:00'))
            time_diff = (curr_time - prev_time).total_seconds()
            
            if time_diff <= 0:
                logger.info(f"   ⚠️  Skipping ping {i}: invalid time difference")
                continue
                
            # Distance
            distance = calculate_distance(prev_ping.lat, prev_ping.lng, curr_ping.lat, curr_ping.lng)
            
            # Speed (calculated or provided)
            speed = curr_ping.speed if curr_ping.speed is not None else distance / time_diff
            
            # Bearing change
            if i > 1:
                prev_prev_ping = pings[i-2]
                # Only calculate bearing if there's actual movement
                dist1 = calculate_distance(prev_prev_ping.lat, prev_prev_ping.lng, prev_ping.lat, prev_ping.lng)
                if dist1 > 1:  # At least 1 meter movement
                    bearing1 = calculate_bearing(prev_prev_ping.lat, prev_prev_ping.lng, prev_ping.lat, prev_ping.lng)
                    bearing2 = calculate_bearing(prev_ping.lat, prev_ping.lng, curr_ping.lat, curr_ping.lng)
                    bearing_change = abs(bearing2 - bearing1)
                    if bearing_change > 180:
                        bearing_change = 360 - bearing_change
                else:
                    bearing_change = 0
            else:
                bearing_change = 0
            
            # Acceleration (speed change)
            if i > 1:
                # Calculate previous speed
                prev_prev_ping = pings[i-2]
                prev_prev_time = datetime.fromisoformat(prev_prev_ping.ts.replace('Z', '+00:00'))
                prev_time_diff = (prev_time - prev_prev_time).total_seconds()
                
                if prev_time_diff > 0:
                    prev_distance = calculate_distance(prev_prev_ping.lat, prev_prev_ping.lng, prev_ping.lat, prev_ping.lng)
                    prev_speed = prev_ping.speed if prev_ping.speed is not None else prev_distance / prev_time_diff
                    acceleration = (speed - prev_speed) / time_diff
                else:
                    acceleration = 0
            else:
                acceleration = 0
            
            features.append([speed, bearing_change, distance, abs(acceleration)])
            logger.info(f"      Feature {i}: speed={speed:.2f}, bearing_Δ={bearing_change:.1f}°, dist={distance:.1f}m, accel={abs(acceleration):.3f}")
        
        if len(features) < 2:
            logger.info(f"   ⏸️  Only {len(features)} features extracted (need ≥2)")
            return "OK", 0.0, f"Insufficient features for ML analysis (only {len(features)} extracted)"
        
        # Scale features and predict
        features_array = np.array(features)
        logger.info(f"   📊 Extracted {len(features)} feature vectors for ML")
        features_scaled = scaler.transform(features_array)
        
        # Get anomaly scores
        anomaly_scores = anomaly_detector.decision_function(features_scaled)
        predictions = anomaly_detector.predict(features_scaled)
        
        # Calculate aggregate anomaly score
        avg_anomaly_score = np.mean(anomaly_scores)
        min_anomaly_score = np.min(anomaly_scores)
        anomaly_count = np.sum(predictions == -1)  # -1 indicates anomaly
        anomaly_ratio = anomaly_count / len(predictions)
        
        # Convert to 0-1 scale (lower decision function values indicate higher anomaly)
        normalized_score = max(0.0, min(1.0, (0.5 - avg_anomaly_score) * 2))
        
        logger.info(f"   📊 ML Analysis Results:")
        logger.info(f"      • Anomaly ratio: {anomaly_ratio:.1%} ({anomaly_count}/{len(predictions)} points)")
        logger.info(f"      • Avg anomaly score: {avg_anomaly_score:.3f}")
        logger.info(f"      • Min anomaly score: {min_anomaly_score:.3f}")
        logger.info(f"      • Normalized score: {normalized_score:.3f}")
        
        # Lowered threshold from 0.3 to 0.25 for better sensitivity
        if anomaly_ratio > 0.25:  # If >25% of points are anomalous
            logger.info(f"   🚨 ML ANOMALY DETECTED: {anomaly_ratio:.1%} anomalous points")
            return "DEVIATION", max(0.6, normalized_score), f"ML detected anomalous movement pattern ({anomaly_ratio:.1%} anomalous points, score: {normalized_score:.2f})"
        
        logger.info("   ✅ ML analysis: movement appears normal")
        return "OK", normalized_score, f"ML analysis indicates normal movement (anomaly ratio: {anomaly_ratio:.1%})"
        
    except Exception as e:
        logger.error(f"   ❌ ML analysis failed: {e}", exc_info=True)
        return "OK", 0.0, f"ML analysis error: {str(e)}"

@app.get("/", response_model=HealthResponse)
async def root():
    """Root endpoint for health check"""
    logger.info("Root endpoint accessed - health check")
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now(timezone.utc).isoformat()
    )

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    logger.info("Health check endpoint accessed")
    return HealthResponse(
        status="healthy", 
        timestamp=datetime.now(timezone.utc).isoformat()
    )

@app.post("/score", response_model=ScoreResponse)
async def score_pings(request: ScoreRequest):
    """Analyze GPS pings for anomalies"""
    try:
        logger.info("=" * 80)
        logger.info(f"📍 NEW ANALYSIS REQUEST - Received {len(request.pings)} GPS pings")
        
        # Log first and last ping details
        if len(request.pings) > 0:
            first_ping = request.pings[0]
            last_ping = request.pings[-1]
            logger.info(f"   First ping: {first_ping.ts} @ ({first_ping.lat:.6f}, {first_ping.lng:.6f})")
            logger.info(f"   Last ping:  {last_ping.ts} @ ({last_ping.lat:.6f}, {last_ping.lng:.6f})")
            
            # Calculate time span
            try:
                first_time = datetime.fromisoformat(first_ping.ts.replace('Z', '+00:00'))
                last_time = datetime.fromisoformat(last_ping.ts.replace('Z', '+00:00'))
                time_span = (last_time - first_time).total_seconds() / 60
                logger.info(f"   Time span: {time_span:.2f} minutes")
            except Exception as e:
                logger.warning(f"   Could not calculate time span: {e}")
        
        # Run rule-based analysis first
        logger.info("🔍 Running rule-based analysis...")
        rule_verdict, rule_score, rule_reason = analyze_pings_rules(request.pings)
        logger.info(f"   Rule-based result: {rule_verdict} (score: {rule_score:.3f})")
        logger.info(f"   Reason: {rule_reason}")
        
        # If rules detect an anomaly, prioritize that
        if rule_verdict != "OK":
            logger.info(f"⚠️  ANOMALY DETECTED by rules - returning {rule_verdict}")
            return ScoreResponse(
                verdict=rule_verdict,
                score=rule_score,
                reason=rule_reason
            )
        
        # Otherwise, run ML analysis
        logger.info("🤖 Running ML-based analysis...")
        ml_verdict, ml_score, ml_reason = analyze_pings_ml(request.pings)
        logger.info(f"   ML result: {ml_verdict} (score: {ml_score:.3f})")
        logger.info(f"   Reason: {ml_reason}")
        
        # Combine results (rules take precedence)
        final_verdict = rule_verdict if rule_verdict != "OK" else ml_verdict
        final_score = max(rule_score, ml_score)
        final_reason = rule_reason if rule_verdict != "OK" else ml_reason
        
        if final_verdict != "OK":
            logger.info(f"⚠️  FINAL RESULT: {final_verdict} - Anomaly Score: {final_score:.3f}")
        else:
            logger.info(f"✅ FINAL RESULT: {final_verdict} - Normal movement (score: {final_score:.3f})")
        logger.info(f"   {final_reason}")
        logger.info("=" * 80)
        
        return ScoreResponse(
            verdict=final_verdict,
            score=final_score,
            reason=final_reason
        )
        
    except Exception as e:
        logger.error(f"❌ ERROR analyzing pings: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.get("/model-info")
async def model_info():
    """Get information about the trained model"""
    logger.info("Model info endpoint accessed")
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
