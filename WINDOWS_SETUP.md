# Windows Setup Guide for TourSafe

## 🚨 Quick Fix for Windows Users

The `make dev` command doesn't work on Windows because `make` isn't available by default. Here are **3 easy ways** to run TourSafe on Windows:

---

## ⚡ **Option 1: Use Our Windows Scripts (Recommended)**

We've created Windows-specific scripts for you:

### **Method A: Batch Script (.bat)**
```cmd
# Double-click this file or run in Command Prompt:
dev.bat
```

### **Method B: PowerShell Script (.ps1)**
```powershell
# Right-click → "Run with PowerShell" or:
.\dev.ps1
```

Both scripts will:
- ✅ Check if pnpm and Python are installed
- ✅ Install dependencies automatically
- ✅ Set up Python virtual environment
- ✅ Start both web app (port 3000) and AI service (port 8000)

---

## 🐳 **Option 2: Docker (Easiest for Complex Setups)**

If you have Docker Desktop installed:

```cmd
# Start all services with one command
docker-compose up --build

# Or run in background
docker-compose up -d --build
```

**Services will be available at:**
- 🌐 Web App: http://localhost:3000
- 🤖 AI Service: http://localhost:8000

---

## 🔧 **Option 3: Manual Setup (Step by Step)**

### **Step 1: Install Prerequisites**

1. **Install Node.js 18+**
   - Download from: https://nodejs.org/
   - Choose "LTS" version

2. **Install pnpm**
   ```cmd
   npm install -g pnpm
   ```

3. **Install Python 3.11+**
   - Download from: https://python.org/downloads/
   - ✅ Check "Add Python to PATH" during installation

### **Step 2: Install Dependencies**

```cmd
# In project root directory
pnpm install

# Set up Python virtual environment
cd apps\ai
python -m venv venv
venv\Scripts\activate.bat
pip install -r requirements.txt
cd ..\..
```

### **Step 3: Set Up Environment**

```cmd
# Copy the template
copy .env.template .env.local

# Edit .env.local and add your API keys (see FREE_TIER_SETUP.md)
notepad .env.local
```

### **Step 4: Start Services**

**Terminal 1 - Web App:**
```cmd
pnpm dev:web
```

**Terminal 2 - AI Service:**
```cmd
cd apps\ai
venv\Scripts\activate.bat
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 🚨 **Common Windows Issues & Fixes**

### **Issue 1: "make: command not found"**
```
✅ Solution: Use our Windows scripts (dev.bat or dev.ps1) instead of make commands
```

### **Issue 2: "pnpm: command not found"**
```
✅ Solution: Install pnpm globally:
npm install -g pnpm
```

### **Issue 3: "python: command not found"**
```
✅ Solution: Install Python and add to PATH:
1. Download Python from python.org
2. During installation, check "Add Python to PATH"
3. Restart Command Prompt
```

### **Issue 4: PowerShell Execution Policy Error**
```
✅ Solution: Run this command in PowerShell as Administrator:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### **Issue 5: Port Already in Use**
```
✅ Solution: Kill processes using the ports:
netstat -ano | findstr :3000
taskkill /PID [PID_NUMBER] /F

netstat -ano | findstr :8000
taskkill /PID [PID_NUMBER] /F
```

---

## 🎯 **Verify Everything is Working**

After starting the services, check these URLs:

1. **Web App:** http://localhost:3000
   - Should show TourSafe homepage

2. **AI Service:** http://localhost:8000/health
   - Should return: `{"status": "healthy", "timestamp": "..."}`

3. **AI Documentation:** http://localhost:8000/docs
   - Should show FastAPI interactive docs

---

## 📱 **Next Steps After Setup**

1. **Get API Keys** (follow `docs/FREE_TIER_SETUP.md`):
   - Supabase (database)
   - MapTiler (maps)
   - Polygon wallet (blockchain)

2. **Seed Database:**
   ```cmd
   pnpm seed
   ```

3. **Test Tourist Simulation:**
   ```cmd
   pnpm simulate
   ```

4. **Access the Demo:**
   - Tourist App: http://localhost:3000/tourist
   - Admin Dashboard: http://localhost:3000/admin

---

## 🛠️ **Windows Development Tips**

### **Recommended Tools:**
- **Terminal:** Windows Terminal (from Microsoft Store)
- **Editor:** VS Code with recommended extensions
- **Git:** Git for Windows (includes Git Bash)

### **VS Code Extensions:**
```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "ms-python.python",
    "ms-vscode.vscode-json"
  ]
}
```

### **Environment Variables Helper:**
Create a `setenv.bat` file for easy environment setup:
```bat
@echo off
set NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
set NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
set NEXT_PUBLIC_MAPTILER_KEY=your_maptiler_key
echo Environment variables set!
```

---

## 🔄 **Alternative: Windows Subsystem for Linux (WSL)**

If you prefer a Linux-like experience:

```cmd
# Install WSL2 with Ubuntu
wsl --install -d Ubuntu

# Inside WSL, you can use the original make commands:
make dev
make seed
make simulate
```

---

## 💡 **Pro Tips for Windows Development**

1. **Use Windows Terminal** instead of Command Prompt
2. **Run as Administrator** if you get permission errors
3. **Disable Windows Defender** for your project folder (speeds up npm installs)
4. **Use PowerShell** for better Unicode support
5. **Keep paths short** to avoid Windows path length limits

---

## 📞 **Still Having Issues?**

If you're still having trouble:

1. **Check Prerequisites:**
   - Node.js 18+ installed?
   - Python 3.11+ installed?
   - Both added to PATH?

2. **Try Docker Option:**
   - Often easier for complex setups
   - Isolates dependencies

3. **Check Windows Version:**
   - Windows 10/11 recommended
   - Update to latest version

---

**🎉 Once you get it running, you'll have a full TourSafe development environment on Windows!**

**Next:** Follow `docs/FREE_TIER_SETUP.md` to get your API keys and deploy to production.
