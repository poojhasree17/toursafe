# Deployment Guide

Complete deployment guide for TourSafe MVP to free-tier cloud services.

## 🎯 Deployment Overview

Our deployment strategy uses multiple free tiers to minimize costs:

| Component | Service | Free Tier | Deployment Method |
|-----------|---------|-----------|-------------------|
| **Frontend + API** | Vercel | 100GB bandwidth | Git integration |
| **Database** | Supabase | 500MB + 2GB transfer | Cloud hosted |
| **AI Service** | Render | 750 hours/month | Docker container |
| **Blockchain** | Polygon Amoy | Testnet (free) | RPC connection |
| **Maps** | MapTiler | 100k requests/month | API key |

## 🔄 Deployment Order

**Follow this order to avoid dependency issues:**

1. [Database Setup](#1-database-deployment) (Supabase)
2. [AI Service](#2-ai-service-deployment) (Render)  
3. [Frontend + API](#3-frontend-api-deployment) (Vercel)
4. [Testing & Verification](#4-testing--verification)

---

## 1. 📊 Database Deployment

### Deploy to Supabase

1. **Create Production Project:**
   ```bash
   # Create project at supabase.com/dashboard
   # Name: toursafe-production  
   # Region: Choose closest to users
   # Plan: Free tier
   ```

2. **Run Migrations:**
   ```bash
   # Get connection string from Supabase dashboard
   # Settings → Database → Connection string
   
   # Run via SQL Editor or CLI
   supabase db push --db-url "postgresql://..."
   ```

3. **Configure Environment:**
   ```env
   # Production Supabase credentials
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
   ```

4. **Seed Production Data:**
   ```bash
   # Run seed script against production
   tsx scripts/seed.ts
   ```

### Enable PostGIS Extension

```sql
-- Run in Supabase SQL Editor
create extension if not exists postgis;

-- Verify installation
select postgis_version();
```

### Configure Row Level Security

RLS policies are automatically applied from migration. Verify:

```sql
-- Check policies are active
select schemaname, tablename, rowsecurity 
from pg_tables 
where schemaname = 'public';
```

---

## 2. 🤖 AI Service Deployment

### Deploy to Render

1. **Create Web Service:**
   - Go to [render.com/dashboard](https://render.com/dashboard)
   - **New** → **Web Service**  
   - Connect GitHub repository
   - **Root Directory:** `apps/ai`
   - **Environment:** `Python 3`

2. **Configure Build:**
   ```yaml
   # render.yaml (optional)
   services:
     - type: web
       name: toursafe-ai
       env: python
       buildCommand: "pip install -r requirements.txt"
       startCommand: "uvicorn main:app --host 0.0.0.0 --port $PORT"
       plan: free
   ```

3. **Environment Variables:**
   ```env
   # Add in Render dashboard
   PYTHON_VERSION=3.11
   PORT=8000
   ```

4. **Health Check:**
   ```bash
   # Test deployment
   curl https://your-ai-service.onrender.com/health
   ```

### Alternative: Docker Deployment

```dockerfile
# Dockerfile already provided in apps/ai/
# For manual Docker deployment:

docker build -t toursafe-ai apps/ai/
docker run -p 8000:8000 toursafe-ai
```

---

## 3. 🌐 Frontend + API Deployment

### Deploy to Vercel

1. **Connect Repository:**
   ```bash
   # Install Vercel CLI (optional)
   npm i -g vercel
   
   # Or use Vercel dashboard:
   # Import Git Repository → Select your repo
   ```

2. **Configure Build:**
   ```json
   {
     "buildCommand": "cd apps/web && pnpm build",
     "outputDirectory": "apps/web/.next",
     "installCommand": "pnpm install",
     "framework": "nextjs"
   }
   ```

3. **Environment Variables:**
   Add all variables to Vercel dashboard:
   ```env
   # Database
   NEXT_PUBLIC_SUPABASE_URL=https://...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   
   # Maps
   NEXT_PUBLIC_MAPTILER_KEY=...
   
   # AI Service
   AI_SERVICE_URL=https://your-ai-service.onrender.com
   
   # Blockchain
   AMOY_RPC_URL=https://rpc-amoy.polygon.technology
   CHAIN_PRIVATE_KEY=0x...
   
   # App
   NEXT_PUBLIC_APP_NAME=TourSafe
   NEXT_PUBLIC_DEFAULT_LOCALE=en
   ```

4. **Custom Domain (Optional):**
   ```bash
   # Add custom domain in Vercel dashboard
   # Settings → Domains → Add Domain
   ```

### Configure PWA

PWA configuration is automatic via `next-pwa`. Verify:

```bash
# Check PWA files are generated
ls apps/web/public/sw.js
ls apps/web/public/manifest.json
```

---

## 4. 🧪 Testing & Verification

### End-to-End Testing

1. **Database Connectivity:**
   ```bash
   # Test from production environment
   curl -X GET "https://your-app.vercel.app/api/v1/zones"
   ```

2. **AI Service Integration:**
   ```bash
   # Test AI endpoint
   curl -X POST "https://your-ai-service.onrender.com/score" \
     -H "Content-Type: application/json" \
     -d '{"pings":[{"ts":"2024-01-01T12:00:00Z","lat":18.92,"lng":72.83,"speed":1.0,"bearing":45}]}'
   ```

3. **Blockchain Connection:**
   ```bash
   # Test VC issuance
   curl -X POST "https://your-app.vercel.app/api/v1/vc/issue" \
     -H "Content-Type: application/json" \
     -d '{"displayName":"Test User","emergencyContact":"+1234567890"}'
   ```

4. **PWA Installation:**
   - Visit your deployed app
   - Look for "Install" button in browser
   - Verify offline functionality

### Load Testing

```bash
# Simple load test
for i in {1..10}; do
  curl -s "https://your-app.vercel.app/api/v1/zones" &
done
wait
```

### Performance Monitoring

Set up monitoring for production:

```javascript
// Add to apps/web/src/app/layout.tsx
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  // Add analytics tracking
  console.log('TourSafe loaded in production');
}
```

---

## 5. 🔧 Production Configuration

### Security Hardening

1. **Environment Variables:**
   ```env
   # Never commit these to Git!
   # Use Vercel/Render secret management
   NODE_ENV=production
   ```

2. **CORS Configuration:**
   ```typescript
   // Restrict CORS in production
   const allowedOrigins = [
     'https://your-app.vercel.app',
     'https://your-custom-domain.com'
   ];
   ```

3. **Rate Limiting:**
   ```typescript
   // Add rate limiting to API routes
   import { rateLimit } from 'express-rate-limit';
   ```

### Performance Optimization

1. **Database Indexing:**
   ```sql
   -- Critical indexes already included in migration
   -- Monitor slow queries in Supabase dashboard
   ```

2. **CDN Configuration:**
   ```javascript
   // Vercel automatically provides global CDN
   // Static assets cached at edge locations
   ```

3. **Image Optimization:**
   ```javascript
   // Use Next.js Image component
   import Image from 'next/image';
   ```

---

## 6. 📊 Monitoring & Maintenance

### Health Checks

Create health check endpoints:

```typescript
// apps/web/src/app/api/health/route.ts
export async function GET() {
  const checks = {
    database: await testDatabaseConnection(),
    ai: await testAIService(),
    blockchain: await testBlockchainConnection()
  };
  
  return Response.json(checks);
}
```

### Logging

```typescript
// Use structured logging
console.log(JSON.stringify({
  level: 'info',
  message: 'User action',
  userId: 'xxx',
  timestamp: new Date().toISOString()
}));
```

### Error Tracking

```bash
# Monitor errors in:
# - Vercel Functions logs
# - Render application logs  
# - Supabase database logs
```

---

## 7. 🚀 Deployment Checklist

### Pre-Deployment

- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] AI service health check passing
- [ ] Free tier limits verified
- [ ] SSL certificates active

### Post-Deployment

- [ ] End-to-end user flow tested
- [ ] PWA installation verified
- [ ] Push notifications working
- [ ] Geofencing triggers properly
- [ ] SOS alerts delivered
- [ ] Dashboard updates in real-time
- [ ] Blockchain transactions confirmed

### Performance Verification

- [ ] Page load times < 2 seconds
- [ ] API response times < 500ms
- [ ] GPS ping processing < 1 second
- [ ] Map tiles loading smoothly
- [ ] Mobile responsiveness verified

---

## 8. 🔄 CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy TourSafe

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: pnpm install
      - run: pnpm test
      - run: pnpm typecheck

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Vercel
        uses: vercel/action@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
```

### Automated Testing

```bash
# Set up automated testing
# Run before each deployment
pnpm test
pnpm build
pnpm run test-e2e
```

---

## 9. 📈 Scaling Considerations

### Free Tier Limits

Monitor usage and plan upgrades:

| Service | Limit | Next Tier |
|---------|-------|-----------|
| Vercel | 100GB bandwidth | $20/month Pro |
| Supabase | 500MB database | $25/month Pro |
| Render | 750 hours/month | $7/month Starter |

### Database Scaling

```sql
-- Monitor database size
select 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
from pg_tables 
where schemaname = 'public'
order by pg_total_relation_size(schemaname||'.'||tablename) desc;
```

---

## 📞 Deployment Support

### Rollback Strategy

```bash
# Vercel automatic rollback
vercel rollback

# Manual database rollback
supabase db reset --db-url "..."
```

### Troubleshooting

**Common Issues:**
- **Build failures:** Check pnpm workspace configuration
- **API errors:** Verify environment variables
- **Database connection:** Check Supabase project status
- **AI service timeout:** Render free tier cold starts

**Support Resources:**
- Vercel: [vercel.com/support](https://vercel.com/support)
- Render: [render.com/docs](https://render.com/docs)
- Supabase: [supabase.com/docs](https://supabase.com/docs)

---

**🎉 Deployment complete! Your TourSafe MVP is now live and ready for demo.**
