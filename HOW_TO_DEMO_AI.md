# 🎬 How to Demo TourSafe AI Service

## ⚠️ Important: When AI Service is Called

The AI service is **NOT** called when you:
- ❌ Click SOS button (manual incident)
- ❌ Browse tourist portal
- ❌ View admin portal
- ❌ Create manual incidents

The AI service **IS** called when:
- ✅ Tourist enables GPS tracking on `/tourist/map`
- ✅ GPS pings are sent automatically (every 10-30 seconds)
- ✅ After 5+ pings are collected (takes 1-3 minutes)
- ✅ Web API analyzes the pattern using AI

---

## 🚀 Quick Demo (2 Methods)

### Method 1: Automated Demo Script ⭐ **RECOMMENDED**

This is the **easiest way** to show AI functionality:

```powershell
# Run the automated demo
.\demo-ai-detection.ps1
```

**What it does:**
1. ✅ Sends GPS pings simulating normal movement → AI says "OK"
2. 🚨 Sends pings simulating immobile tourist → AI detects "IMMOBILE"
3. ⚠️ Sends pings simulating erratic movement → AI detects "DEVIATION"
4. 📊 Shows you where to find AI logs and incidents

**Duration:** ~60 seconds

---

### Method 2: Manual Browser Demo

If you want to show it working in the browser:

#### Step 1: Open AI Service Window
```powershell
.\start-ai.bat
```
**Position this window visibly** so audience can see logs.

#### Step 2: Open Tourist Map
1. Go to: http://localhost:3000/tourist/map
2. Click **"Start Tracking"** button
3. Allow browser location permissions

#### Step 3: Wait & Watch
- GPS pings sent **every 10-30 seconds** automatically
- After **5th ping** (~2-3 minutes), watch AI service window
- You'll see: `INFO:main:Analyzing 5 pings`
- Result: `INFO:main:Analysis result: OK` (or IMMOBILE/DEVIATION)

**Problem with this method:**
- ⏱️ Takes 2-3 minutes of waiting
- 📍 Requires browser geolocation
- 🤷 Movement pattern is based on your actual location (might be boring)

---

## 🎯 Best Demo Flow for Presentation

### 1. Show the AI Service Running
```powershell
.\start-ai.bat
```

Point out:
- "This is our FastAPI-based AI service"
- "It uses IsolationForest ML model + Rule-based detection"
- "Let me show you it working..."

### 2. Run Automated Demo
```powershell
.\demo-ai-detection.ps1
```

**What audience sees:**
```
📊 DEMO 1: Normal Tourist Movement
  Ping 1/6: lat=18.92, lng=72.83, speed=1.2m/s
  ...
  👀 CHECK YOUR AI SERVICE WINDOW NOW!
     You should see: INFO:main:Analysis result: OK

🚨 DEMO 2: Immobile Tourist Detection (DANGER)
  Ping 1/8: STATIONARY at (18.925, 72.835)
  ...
  👀 CHECK YOUR AI SERVICE WINDOW NOW!
     You should see: INFO:main:Analysis result: IMMOBILE (score: 0.8)
```

**Point to AI service window** showing the actual FastAPI logs.

### 3. Show Auto-Generated Incidents

Open: http://localhost:3000/admin/incidents

**Point out:**
- Incidents with `auto_generated: true` in metadata
- Shows AI score and reason
- Created automatically without human intervention

### 4. Show Model Details

Open: http://localhost:8000/docs

**Show:**
- Interactive API documentation
- `/score` endpoint
- Try it out with sample data

**Or show:** http://localhost:8000/model-info

```json
{
  "model_type": "IsolationForest",
  "contamination": 0.1,
  "features": ["speed", "bearing_change", "step_distance", "acceleration"],
  "training_samples": 1000,
  "status": "ready"
}
```

---

## 📊 What to Highlight About AI Service

### 1. Real-Time Analysis
- Analyzes GPS patterns in real-time
- No need for manual incident reporting
- Proactive detection (finds problems before tourist reports them)

### 2. Dual Detection System
**Rule-Based Detection:**
- Immobility: Tourist stationary >6 minutes
- Erratic Movement: High bearing variance + frequent direction changes

**ML-Based Detection:**
- IsolationForest algorithm
- Trained on 1000 samples of normal tourist behavior
- Detects anomalous patterns

### 3. Automatic Incident Creation
- When anomaly detected → Auto-create incident
- Includes AI score, reason, metadata
- Sends notification to tourist

### 4. API Integration
```
Tourist → GPS Tracking → Web API → AI Service → Anomaly Detection → Incident
```

---

## 🔍 Where to Find AI Service Logs

### During Demo
**Always keep the `start-ai.bat` PowerShell window visible!**

Logs appear as:
```
INFO:main:Analyzing 5 pings
INFO:main:Analysis result: OK (score: 0.100)
```

Or when anomaly detected:
```
INFO:main:Analyzing 7 pings
INFO:main:Analysis result: IMMOBILE (score: 0.800)
```

### Log Format
```
INFO:main:Analyzing <N> pings
INFO:main:Analysis result: <VERDICT> (score: <0.0-1.0>)
```

**Verdicts:**
- `OK` - Normal behavior
- `IMMOBILE` - Tourist stuck/stationary (danger)
- `DEVIATION` - Erratic/unusual movement

---

## 🎬 Demo Script (What to Say)

### Opening
> "We have an AI microservice that monitors tourist GPS patterns in real-time to detect anomalies that might indicate danger."

### Show Architecture
> "When tourists enable tracking, their GPS pings flow through our API to this AI service, which uses machine learning and rule-based detection to analyze behavior."

### Run Demo
> "Let me show you three scenarios: normal movement, an immobile tourist who might be in danger, and erratic movement patterns."

*(Run `demo-ai-detection.ps1`)*

### Point to Logs
> "You can see here in real-time, the AI service is analyzing the patterns. For normal movement, it says OK. But when it detects the tourist hasn't moved for 6 minutes, it automatically flags it as IMMOBILE with high confidence."

### Show Results
> "These incidents are automatically created in our system, no human intervention needed. This allows authorities to respond proactively to tourists in danger."

---

## 🚨 Troubleshooting

### "I don't see any logs!"

**Cause:** AI service is only called after 5+ GPS pings.

**Solution:** 
1. Use the automated demo script: `.\demo-ai-detection.ps1`
2. OR wait 2-3 minutes with GPS tracking enabled in browser

### "Logs say 'DEVIATION' for normal movement"

**Explanation:** The ML model is intentionally conservative. Adjust the `contamination` parameter in `apps/ai/main.py` if needed:

```python
anomaly_detector = IsolationForest(contamination=0.1, random_state=42)
                                              # ^^^ Lower = less sensitive
```

### "AI service not responding"

**Check:**
1. Is `start-ai.bat` running?
2. Is port 8000 free? (no conflicts)
3. Test: `curl http://localhost:8000/health`

---

## 📱 Alternative: Browser DevTools Demo

If you want to show AI calls in browser:

1. Open: http://localhost:3000/tourist/map
2. Open DevTools (F12) → Network tab
3. Filter: `ping`
4. Start GPS tracking
5. Watch for `POST /api/v1/ping` requests
6. After 5th ping, check response JSON for `aiAnalysis` field

---

## 🎓 Key Talking Points

1. **Proactive Safety** - Detects danger before tourist reports it
2. **Machine Learning** - IsolationForest trained on normal behavior
3. **Real-Time** - Analysis happens within milliseconds
4. **Automatic** - No manual intervention needed
5. **Scalable** - Microservice architecture, can handle many tourists
6. **Explainable** - Provides reason for each detection

---

## ⚡ Quick Commands Reference

```powershell
# Start AI service
.\start-ai.bat

# Run automated demo
.\demo-ai-detection.ps1

# Test AI health
curl http://localhost:8000/health

# View API docs
# Open: http://localhost:8000/docs

# View model info
curl http://localhost:8000/model-info

# View incidents
# Open: http://localhost:3000/admin/incidents
```

---

## 🎉 That's It!

The key is: **Use the automated demo script** (`demo-ai-detection.ps1`) for reliable, fast demonstration of AI capabilities.

Don't rely on manual GPS tracking in browser - it takes too long and may not trigger interesting patterns.

