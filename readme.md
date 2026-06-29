# TourSafe - Smart Tourist Safety & Incident Response

> **AI-powered tourist safety system with blockchain-verified credentials**

A comprehensive solution for smart tourist safety monitoring with real-time GPS tracking, AI anomaly detection, geofencing alerts, and blockchain audit trails. Originally built for Hackthon.

---

## 🚀 Quick Start (Windows)

### Prerequisites
- Node.js 18+
- Python 3.11+
- Docker Desktop
- Git

### Run Locally

**Step 1 — Clone the repository:**
```bash
git clone https://github.com/poojhasree1711-design/toursafe.git
cd toursafe
```

**Step 2 — Set up environment:**
```bash
copy .env.example .env.local
# Fill in your API keys in .env.local
```

**Step 3 — Start Docker Desktop, then run:**
```bash
docker-compose up --build
```

**Step 4 — Start Supabase database (new terminal):**
```bash
npx supabase start
npx supabase db reset
```

**Step 5 — Open in browser:**
```
http://localhost:3000
```

### Demo Credentials
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@toursafe.demo | admin123 |
| Operator | operator@toursafe.demo | operator123 |

---

## 🎯 Key Features

### Tourist Safety App (PWA)
- **📱 Progressive Web App** — Installable, works offline
- **🔐 Verifiable Credentials** — Blockchain-anchored digital identity
- **📍 GPS Tracking** — Real-time location with privacy controls
- **🆘 SOS Button** — One-tap emergency alerts
- **🗺️ Interactive Map** — Live safety zones and location info
- **🔔 Push Notifications** — Geofence warnings and alerts
- **🌐 Multilingual** — English, Hindi, Tamil support

### Admin / Operator Dashboard
- **📊 Real-time Monitoring** — Live tourist locations and incidents
- **⚡ Incident Management** — Triage, assign, and resolve alerts
- **🗺️ Zone Management** — Create and edit geofenced areas
- **🔍 AI Analytics** — Anomaly detection and pattern analysis
- **🔗 Blockchain Audit** — Verify credentials and incident integrity
- **📈 Reporting** — Export data and incident reports

### Police & Tourism Department Dashboard
- **🚔 Real-time Visualizations** — Comprehensive live monitoring
- **👥 Tourist Clusters** — Grid-based clustering with density analysis
- **🗺️ Risk Heat Maps** — Geographic visualization of high-risk zones
- **🔍 Digital ID Records** — Advanced search, filtering, and tracking
- **📍 Last Known Locations** — Real-time location tracking for all tourists
- **📋 Alert History** — Complete incident log with full details
- **⚡ Automated E-FIR** — One-click E-FIR generation for missing persons
- **📊 Analytics Dashboard** — Statistics, trends, and insights
- **📤 Data Export** — Export complete dashboard data for reports

### AI Anomaly Detection
- **🤖 Machine Learning** — IsolationForest for movement analysis
- **📊 Rule-based Detection** — Immobility and deviation patterns
- **⚡ Real-time Processing** — Sub-30-second analysis
- **🎯 Configurable Alerts** — Tunable sensitivity and thresholds

### Blockchain Integration
- **🔗 Polygon Amoy Testnet** — Cost-effective proof anchoring
- **📄 W3C Verifiable Credentials** — Standards-compliant credentials
- **🔒 Tamper-proof** — Cryptographic integrity verification
- **⚡ Fast Settlement** — 2-second block times

---

## 🏗️ Architecture

```
Tourist PWA  ──→  Next.js API  ──→  Supabase (PostgreSQL)
                      │
                      ├──→  FastAPI AI Service (Python)
                      │
                      └──→  Polygon Amoy (Blockchain)
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, shadcn/ui |
| Maps | MapLibre GL, MapTiler |
| Backend | Next.js API Routes, Supabase |
| Database | PostgreSQL + PostGIS (via Supabase) |
| AI Service | Python, FastAPI, scikit-learn |
| Blockchain | Polygon Amoy, ethers.js, W3C VCs |
| Notifications | Firebase Cloud Messaging (FCM) |
| Deployment | Vercel (web), Render (AI), Supabase Cloud (DB) |

---

## 📁 Project Structure

```
toursafe/
├── apps/
│   ├── web/          # Next.js PWA + Admin Dashboard
│   └── ai/           # Python FastAPI AI Microservice
├── packages/
│   ├── ui/           # Shared React components
│   ├── lib/          # Shared TypeScript utilities
│   └── config/       # Shared configurations
├── scripts/          # Seeding and simulation tools
├── supabase/         # Database migrations and config
├── docker-compose.yml
└── README.md
```

---

## 🎭 Demo Scenarios

### Scenario 1: Normal Tourism
1. Tourist imports Verifiable Credential → ✅ Verified on blockchain
2. Walks through safe zones → ✅ No alerts triggered
3. AI detects normal movement → ✅ No incidents created

### Scenario 2: Restricted Area Alert
1. Tourist approaches restricted area → ⚠️ Geofence warning sent
2. Crosses boundary → 🚨 Incident auto-created
3. Operator receives notification → 🔔 Dashboard alert shown

### Scenario 3: Immobility Detection
1. Tourist stops moving for 6+ minutes → 🤖 AI detects anomaly
2. Incident auto-created → 📞 Emergency protocol triggered
3. Operator acknowledges → ✅ Response initiated

### Scenario 4: SOS Emergency
1. Tourist taps SOS button → 🆘 Manual alert sent
2. GPS location captured → 📍 Precise coordinates logged
3. Push notification sent to operator → ⚡ Real-time response

---

## 🔧 Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Maps
NEXT_PUBLIC_MAPTILER_KEY=your_maptiler_key

# Firebase (Push Notifications)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_key
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_vapid_key

# Blockchain (Polygon Amoy)
AMOY_RPC_URL=https://rpc-amoy.polygon.technology
CHAIN_PRIVATE_KEY=your_wallet_private_key

# AI Service
AI_SERVICE_URL=http://localhost:8000

# App
NEXT_PUBLIC_APP_NAME=TourSafe
NEXT_PUBLIC_DEFAULT_LOCALE=en
```

---

## 🚀 Deployment

| Service | Platform | Purpose |
|---------|----------|---------|
| Web App | Vercel | Frontend + API routes |
| AI Service | Render | Python FastAPI microservice |
| Database | Supabase Cloud | PostgreSQL + Auth + Realtime |

> ⚠️ This is a demo system built for SIH HACKTHON 2025.
> It is not a real emergency service. Do not use for actual emergencies.

---

## 📄 License

This project is licensed under the MIT License.

---

## 📞 Contact

- **GitHub:** [poojhasree1711-design](https://github.com/poojhasree1711-design)
- **Project:** TourSafe — Smart Tourist Safety System
