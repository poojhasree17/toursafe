# ✅ Your Question Answered

## Q: "Why don't I see FastAPI logs when I use the tourist portal and raise SOS?"

### A: Because the AI service is NOT called for SOS buttons!

---

## 🚫 When AI Service is NOT Called

The AI service is **NOT** triggered by:
- ❌ Clicking SOS button (that's a manual incident)
- ❌ Browsing tourist portal pages
- ❌ Viewing admin portal
- ❌ Creating manual incidents

These are **human-initiated** actions, not automated AI analysis.

---

## ✅ When AI Service IS Called

The AI service is **ONLY** triggered when:

1. Tourist goes to **/tourist/map** page
2. Clicks **"Start Tracking"** button
3. Browser **sends GPS pings automatically** every 10-30 seconds
4. After **5+ pings** are collected (1-3 minutes of tracking)
5. Web API calls AI service: `POST http://localhost:8000/score`
6. AI analyzes the pattern and returns verdict

### Code Location
See: `apps/web/src/app/api/v1/ping/route.ts` line 117-134

```typescript
if (!recentError && recentPings && recentPings.length >= 5) {
  // Call AI service for anomaly detection
  const aiResponse = await fetch(
    process.env.AI_SERVICE_URL || 'http://localhost:8000/score',
    { ... }
  );
}
```

---

## 🎬 How to See AI Logs (DEMO)

### Method 1: Automated Demo ⭐ **BEST FOR SHOWING FUNCTIONALITY**

Run this script to see AI in action **right now**:

```powershell
.\demo-ai-simple.ps1
```

**What happens:**
- Sends 21 GPS pings simulating 3 scenarios
- AI analyzes patterns in real-time
- **Check your `start-ai.bat` window** to see logs appear!

You should see logs like:
```
INFO:main:Analyzing 6 pings
INFO:main:Analysis result: OK (score: 0.100)

INFO:main:Analyzing 8 pings
INFO:main:Analysis result: IMMOBILE (score: 0.800)
```

### Method 2: Manual Browser Demo (Slower)

1. Go to: http://localhost:3000/tourist/map
2. Click "Start Tracking" button
3. Wait 2-3 minutes (GPS pings sent every 30 seconds)
4. After 5th ping, watch AI service window for logs

**Problem:** Takes 2-3 minutes, requires browser geolocation, boring to watch.

---

## 📊 Where AI Service is Used

### Purpose
**Proactive Safety Monitoring**

The AI monitors GPS tracking patterns to detect:
- **IMMOBILE**: Tourist stuck in one place >6 minutes (danger/medical emergency)
- **DEVIATION**: Erratic movement patterns (distress/confusion)

### Architecture
```
Tourist GPS Tracking
  │
  └─> Web API (/api/v1/ping)
        │
        ├─> Store ping in database
        │
        └─> If ≥5 recent pings:
              └─> AI Service (/score)
                    │
                    ├─> Rule-based detection
                    ├─> ML detection (IsolationForest)
                    │
                    └─> Returns: {verdict, score, reason}
                          │
                          └─> If anomaly: Auto-create incident
```

---

## 🎯 How to Demo AI Functionality

### For Presentation/Stakeholders

**1. Prepare**
```powershell
# Terminal 1: Start AI service (keep visible)
.\start-ai.bat

# Terminal 2: Run demo
.\demo-ai-simple.ps1
```

**2. Point to AI Window**
- "This is our AI service analyzing tourist GPS patterns in real-time"
- Run demo script
- **Point to logs appearing** in the AI service window
- Show detection of IMMOBILE pattern

**3. Show Results**
- Open: http://localhost:3000/admin/incidents
- Show auto-generated incidents with AI metadata
- Highlight: `ai_score`, `ai_reason`, `auto_generated: true`

**4. Show Technical Details**
- Open: http://localhost:8000/docs (Swagger UI)
- Open: http://localhost:8000/model-info
- Show ML model: IsolationForest, 1000 training samples

---

## 📈 How to Show Model Performance

### 1. Model Architecture
```
http://localhost:8000/model-info
```

Shows:
- Algorithm: IsolationForest
- Training samples: 1000
- Features: speed, bearing_change, step_distance, acceleration
- Contamination: 0.1

### 2. Real-Time Analysis
Run the demo script and show:
- **Precision**: Correctly identifies IMMOBILE patterns
- **Speed**: Analyzes in milliseconds
- **Explainability**: Provides reason for each detection

### 3. Detection Examples

**Normal Movement:**
```
Verdict: OK
Score: 0.1
Reason: Normal movement pattern detected
```

**Immobile Pattern:**
```
Verdict: IMMOBILE
Score: 0.8
Reason: Tourist stationary for 6.0 minutes (median speed: 0.01 m/s, radius: 0.0m)
```

**Deviation Pattern:**
```
Verdict: DEVIATION
Score: 0.7
Reason: Erratic movement detected (bearing variance: 5234, avg change: 78°)
```

### 4. Integration Test
```powershell
.\test-ai-integration.ps1
```

Shows end-to-end integration working.

---

## 🔍 Where to Find AI Logs

### In Your AI Service Window

The PowerShell window where you ran `.\start-ai.bat`

**Look for:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:main:Anomaly detector initialized with baseline data
INFO:main:Analyzing 6 pings          <-- AI CALLED HERE
INFO:main:Analysis result: OK (score: 0.100)
INFO:main:Analyzing 8 pings          <-- AI CALLED AGAIN
INFO:main:Analysis result: IMMOBILE (score: 0.800)
```

**If you don't see these:**
- Run `.\demo-ai-simple.ps1` to generate logs
- Or use GPS tracking in browser and wait 2-3 minutes

---

## 🎭 Quick Demo Script (1 Minute)

Say this while running the demo:

> "Our TourSafe platform has an AI microservice that monitors tourist GPS patterns in real-time. Let me show you how it works."
> 
> **[Run demo-ai-simple.ps1]**
> 
> "It's sending GPS pings simulating three scenarios: normal walking, a tourist stuck in one place, and erratic movement."
> 
> **[Point to AI service window]**
> 
> "You can see here in the logs, the AI is analyzing the patterns. For normal movement, it says OK. But when it detects the tourist hasn't moved for 6 minutes..."
> 
> **[Point to IMMOBILE detection]**
> 
> "...it automatically flags this as IMMOBILE with 80% confidence. This creates an incident automatically, allowing authorities to respond before the tourist even calls for help."
> 
> **[Show admin incidents page]**
> 
> "Here you can see the auto-generated incidents, including the AI's confidence score and reasoning."

---

## ✅ Summary

| Question | Answer |
|----------|---------|
| Why no logs when I click SOS? | SOS is manual, AI only analyzes GPS tracking |
| When is AI called? | After 5+ GPS pings during active tracking |
| How to see it work? | Run `.\demo-ai-simple.ps1` |
| Where are logs? | In `start-ai.bat` PowerShell window |
| How to demo it? | Run demo script, point to logs, show incidents |
| Model performance? | http://localhost:8000/model-info + demo results |

---

## 🚀 Try It Now

```powershell
# Make sure AI service is running
.\start-ai.bat

# In another terminal, run demo
.\demo-ai-simple.ps1

# Watch the AI service window for logs!
```

---

**You just ran this demo successfully! Check your `start-ai.bat` window - you should see multiple log entries from the 21 pings we just sent! 🎉**

