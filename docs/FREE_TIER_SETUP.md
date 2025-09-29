# Free Tier Setup Guide

This guide will help you set up all the required services using their free tiers for the TourSafe MVP.

## 🔧 Prerequisites

- GitHub account
- Email for service registrations
- MetaMask or similar wallet for blockchain testnet

## 1. 📊 Supabase Database Setup

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project" → "Sign up"
3. Create a new project:
   - **Name:** `toursafe-demo`
   - **Database Password:** (generate a strong password)
   - **Region:** Choose closest to your location
   - **Pricing Plan:** Free (2 projects, 500MB database)

### Step 2: Get API Keys

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy these values to your `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
   ```

### Step 3: Enable PostGIS

1. Go to **SQL Editor** in your Supabase dashboard
2. Click **New Query** and run:
   ```sql
   create extension if not exists postgis;
   ```
3. Click **Run** to enable PostGIS extension

### Step 4: Run Migrations

1. Copy the contents of `supabase/migrations/000_init.sql`
2. Paste into a new SQL query and run
3. Then run `supabase/seed.sql` to populate demo data

## 2. 🗺️ MapTiler Setup

### Step 1: Create Account

1. Go to [maptiler.com](https://maptiler.com)
2. Click **Sign up for free**
3. Complete registration (GitHub login recommended)

### Step 2: Get API Key

1. Go to **Account** → **Keys**
2. Copy the **Default API Key**
3. Add to `.env.local`:
   ```env
   NEXT_PUBLIC_MAPTILER_KEY=your-maptiler-key
   ```

### Limits
- **Free Tier:** 100,000 map requests/month
- **Features:** Street maps, satellite imagery, custom styling

## 3. 🔗 Polygon Amoy Testnet Setup

### Step 1: Setup MetaMask

1. Install [MetaMask browser extension](https://metamask.io)
2. Create or import a wallet
3. Add Polygon Amoy Testnet:
   - **Network Name:** Polygon Amoy Testnet
   - **RPC URL:** `https://rpc-amoy.polygon.technology`
   - **Chain ID:** `80002`
   - **Currency Symbol:** `MATIC`
   - **Block Explorer:** `https://amoy.polygonscan.com`

### Step 2: Get Test MATIC

1. Go to [Polygon Faucet](https://faucet.polygon.technology/)
2. Select **Amoy Testnet**
3. Enter your wallet address
4. Get 0.1 test MATIC (enough for hundreds of transactions)

### Step 3: Export Private Key

1. In MetaMask, click on your account
2. **Account Details** → **Show Private Key**
3. Copy the private key and add to `.env.local`:
   ```env
   AMOY_RPC_URL=https://rpc-amoy.polygon.technology
   CHAIN_PRIVATE_KEY=0x1234567890abcdef...
   ```

⚠️ **Security Warning:** Never use this private key on mainnet or with real funds!

## 4. 🚀 Vercel Deployment Setup

### Step 1: Connect GitHub

1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Click **Import Project** → select your repo
4. Vercel will auto-detect Next.js

### Step 2: Configure Build Settings

1. **Framework Preset:** Next.js
2. **Build Command:** `pnpm build`
3. **Output Directory:** `.next` (auto-detected)
4. **Install Command:** `pnpm install`

### Step 3: Environment Variables

Add all your environment variables from `.env.local` to Vercel:

1. Go to **Settings** → **Environment Variables**
2. Add each variable (exclude `NEXT_PUBLIC_` prefix will be auto-added)

### Limits
- **Free Tier:** 100GB bandwidth, unlimited deployments
- **Features:** Auto-deployments, preview URLs, analytics

## 5. 🐳 Render AI Service Setup

### Step 1: Create Account

1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Connect your repository

### Step 2: Create Web Service

1. Click **New** → **Web Service**
2. Select your repository
3. Configure:
   - **Name:** `toursafe-ai`
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r apps/ai/requirements.txt`
   - **Start Command:** `cd apps/ai && uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Root Directory:** Leave empty

### Step 3: Environment Variables

No additional environment variables needed for AI service.

### Limits
- **Free Tier:** 750 hours/month (enough for demo)
- **Features:** Auto-deploy, custom domains, logs

## 6. 🔔 Firebase Push Notifications (Optional)

### Step 1: Create Firebase Project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. **Add Project** → `toursafe-demo`
3. Disable Google Analytics (not needed)

### Step 2: Enable Cloud Messaging

1. Go to **Project Settings** → **Cloud Messaging**
2. **Web Configuration** → **Generate Key Pair**
3. Copy the keys to `.env.local`:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=...
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=toursafe-demo
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
   NEXT_PUBLIC_FIREBASE_APP_ID=...
   NEXT_PUBLIC_FIREBASE_VAPID_KEY=...
   ```
   
   **Note:** `FIREBASE_SERVER_KEY` is deprecated. Instead, place your Firebase service account JSON file as `travel-safety.json` in the web app root directory.

## 7. ✅ Verification Checklist

Before deploying, verify all services are working:

- [ ] **Supabase:** Can connect and query database
- [ ] **MapTiler:** Map tiles load correctly  
- [ ] **Polygon:** Can send test transactions
- [ ] **Vercel:** Build succeeds locally
- [ ] **Render:** AI service responds to health check
- [ ] **Firebase:** (Optional) Can send test notifications

## 8. 🧪 Testing Your Setup

Run these commands to verify everything works:

```bash
# Test database connection
pnpm seed

# Test VC and blockchain operations
pnpm run test-vc

# Test AI service
curl http://localhost:8000/health

# Test full simulation
pnpm simulate
```

## 🚨 Common Issues

### Database Issues
- **PostGIS not enabled:** Run `create extension postgis;`
- **RLS blocking queries:** Check Row Level Security policies
- **Migration failed:** Verify user has sufficient permissions

### Blockchain Issues  
- **Insufficient funds:** Get more test MATIC from faucet
- **Wrong network:** Verify you're on Amoy testnet (80002)
- **RPC errors:** Use official Polygon RPC endpoint

### Build Issues
- **Module not found:** Run `pnpm install` in workspace root
- **TypeScript errors:** Check package versions in `package.json`
- **Out of memory:** Increase Node.js heap size

## 💡 Tips for Demo Success

1. **Prepare ahead:** Set up all services 24-48 hours before demo
2. **Test end-to-end:** Run full tourist simulation scenarios  
3. **Have backups:** Keep API keys in secure backup location
4. **Monitor limits:** Track free tier usage during development
5. **Optimize performance:** Use CDN and caching for faster loading

## 📞 Support Resources

- **Supabase:** [docs.supabase.com](https://docs.supabase.com)
- **MapTiler:** [docs.maptiler.com](https://docs.maptiler.com)
- **Polygon:** [docs.polygon.technology](https://docs.polygon.technology)
- **Vercel:** [vercel.com/docs](https://vercel.com/docs)
- **Render:** [render.com/docs](https://render.com/docs)

---

**🎯 Goal:** Have all services configured and tested within 2-3 hours of setup time.
