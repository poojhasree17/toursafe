# 🚀 API Setup Priorities for TourSafe

## 🎯 **IMMEDIATE ACTION NEEDED** (For Map to Work)

### **Step 1: Create Environment File**
Create `apps/web/.env.local` manually with:

```env
# 🗺️ MapTiler (PRIORITY #1 - Map won't work without this)
NEXT_PUBLIC_MAPTILER_KEY=get-from-maptiler.com

# 📊 Supabase (PRIORITY #2 - For data storage)  
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 🔗 Polygon Amoy (PRIORITY #3 - For blockchain)
AMOY_RPC_URL=https://rpc-amoy.polygon.technology
CHAIN_PRIVATE_KEY=your-test-wallet-private-key

# 🔔 Firebase (Optional)
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_PROJECT_ID=toursafe-demo
FIREBASE_SERVER_KEY=your-firebase-server-key
```

### **Step 2: Quick 15-Minute Setup**

**MapTiler (Most Important):**
1. → [maptiler.com](https://maptiler.com) → Sign up
2. → Account → Keys → Copy key
3. → Paste in `.env.local` as `NEXT_PUBLIC_MAPTILER_KEY=...`

**Supabase (Second Most Important):**
1. → [supabase.com](https://supabase.com) → New project
2. → Settings → API → Copy URL + Keys
3. → SQL Editor → Run: `create extension if not exists postgis;`

**Polygon Testnet (Third):**
1. → Install MetaMask → Add Amoy network
2. → [faucet.polygon.technology](https://faucet.polygon.technology) → Get test MATIC
3. → Export private key → Add to env

### **Step 3: Restart Server**
```bash
# Kill current server
Ctrl+C

# Restart with new env vars
pnpm dev
```

## 📊 **Setup Time Estimates**

- ⚡ **MapTiler**: 5 minutes (CRITICAL for map)
- ⚡ **Supabase**: 15 minutes (CRITICAL for data) 
- ⚡ **Polygon**: 10 minutes (CRITICAL for VCs)
- 🔔 **Firebase**: 10 minutes (Optional)
- 🤖 **AI Service**: Already working locally

## 🎯 **Demo-Ready Minimum**

For SIH 2025 demo, you ONLY need:
1. ✅ **MapTiler** (map displays)
2. ✅ **Supabase** (data works) 
3. ✅ **Polygon** (VCs work)

Total time: **30 minutes** for full setup!

## 🚨 **Why Map Shows "Loading..."**

The map component needs `NEXT_PUBLIC_MAPTILER_KEY` to fetch map tiles. Without it:
- ❌ Map tiles won't load
- ❌ Shows "Map Loading..." forever
- ❌ No satellite/street view data

**Fix**: Get MapTiler key → Add to `.env.local` → Restart server

---

**🎯 Start with MapTiler key - that's the #1 blocker for the map!**
