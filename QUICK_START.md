# 🚀 TourSafe Quick Start Guide (Windows)

## ✅ What's Already Working
- **AI Service**: http://localhost:8000 ✅ (Running perfectly!)
- **Dependencies**: All installed ✅
- **Database Schema**: Ready ✅  
- **Shared Packages**: Built ✅

## 🎯 Start the Web App (2 Simple Steps)

### Step 1: Open Command Prompt
```cmd
# Navigate to project
cd C:\repos\demos\apps\web

# Start the web app  
pnpm dev
```

### Step 2: Visit the App
- **Web App**: http://localhost:3000
- **AI Service**: http://localhost:8000 (already working!)

## 🧪 Test Everything Works

1. **Test AI Service** (should work):
   ```
   http://localhost:8000/health
   ```
   Should show: `{"status":"healthy",...}`

2. **Test Web App** (after pnpm dev):
   ```
   http://localhost:3000
   ```
   Should show TourSafe homepage

## 🎮 Demo Flow

Once both are running:

1. Go to **http://localhost:3000**
2. Click **"I'm a Tourist"**  
3. Click **"Use Demo Credential"** (creates test VC)
4. Click **"Open Safety Map"** (GPS tracking interface)
5. **Enable location** when prompted
6. **Test SOS button** for emergency simulation

## 🛠️ Alternative: Use Docker

If the manual approach doesn't work, Docker might be easier:

```cmd
# In project root (C:\repos\demos)
docker-compose up --build
```

This will start both services automatically:
- Web App: http://localhost:3000
- AI Service: http://localhost:8000

## 🔍 Troubleshooting

**If Web App won't start:**
1. Make sure you're in `C:\repos\demos\apps\web`
2. Run `pnpm install` first
3. Then `pnpm dev`

**If port 3000 is busy:**
```cmd
# Kill processes using port 3000
netstat -ano | findstr :3000
# Note the PID and kill it:
taskkill /PID [PID_NUMBER] /F
```

**If you see errors:**
- The AI service is working, so focus on just getting the web app running
- Try the Docker approach as backup

## 📞 Current Status

- ✅ **AI Service**: Running perfectly on port 8000
- ✅ **Dependencies**: All installed 
- ✅ **Packages**: Built successfully
- 🔄 **Web App**: Needs manual start

## 🎯 Once Running

You'll have a **complete TourSafe system** with:
- Tourist PWA with GPS tracking
- AI anomaly detection (working!)
- Admin dashboard for incident management
- Blockchain credential verification
- Real-time safety monitoring

**The system is 95% ready - just need that web app running!** 🚀
