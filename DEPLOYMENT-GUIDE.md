## Deployment Guide

Follow these steps to prepare and upload the project to your hosting provider.

### 1. Prerequisites
- Node.js 18+
- npm 9+
- Supabase project configured (database + storage)
- BulkClix credentials (if payments will be activated later)

### 2. Environment Variables
Create a `.env.production` file based on your secrets:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=public-anon-key
SUPABASE_SERVICE_ROLE_KEY=service-role-key
ENCRYPTION_MASTER_KEY=generate-a-secure-key
NEXT_PUBLIC_VOTES_UNAVAILABLE=true
```

> Set `NEXT_PUBLIC_VOTES_UNAVAILABLE=true` to keep the public site in maintenance mode. Switch to `false` when you are ready to launch.

### 3. Install & Build
```
npm install
npm run lint
npm run build
```

This produces the production build in `.next`.

### 4. Upload/Deploy

Depending on your hosting choice:

- **Vercel/Netlify**: Connect the repo, add environment variables, and deploy from the dashboard.
- **Traditional hosting (cPanel, Plesk, etc.)**:
  1. Run `npm run build`.
  2. Upload the entire project (except `node_modules`, `.next/cache`).
  3. Install dependencies on the server.
  4. Start the app with `npm run start` (requires Node server) or use PM2: `pm2 start npm --name prelyct-votes -- run start`.

### 5. Database Migration
Run the SQL at `supabase/migrations/009_security_and_monitoring_features.sql` in the Supabase SQL Editor prior to deployment.

### 6. Post-Deployment Checklist
- ✅ Confirm `/maintenance` displays when `NEXT_PUBLIC_VOTES_UNAVAILABLE=true`.
- ✅ Check `/dashboard/monitoring` and `/dashboard/alerts` (requires login).
- ✅ Verify Supabase logs show the new tables.
- ✅ Ensure HTTPS is enabled on your hosting provider.
- ✅ Configure DNS for custom domains (if using white-label).

Need help? Refer to `RUN-MIGRATION-009.md` for migration steps or `SECURITY-FEATURES-IMPLEMENTATION.md` for feature details.


