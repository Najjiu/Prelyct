# Prelyct Votes Platform

Modern elections platform built with **Next.js 14 (App Router)**, Supabase, and BulkClix mobile-money payments. Admins can configure elections, collect public votes, monitor status, and process invoices from a unified dashboard.

## Tech Stack

- **Next.js 14 / React 18** with App Router + server actions
- **Tailwind CSS** UI + custom component library
- **Supabase** for auth, storage, and Postgres
- **BulkClix** mobile-money integration (webhooks + polling)
- **WhatsApp + Email hooks** for reminders and alerts

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Create an env file with the variables listed below
cp .env.example .env.local   # if the sample file exists

# 3. Start the local dev server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

> **Note:** if `.env.example` is missing (some hosts restrict committing it), create one manually using the variable list in this README.

## Required Environment Variables

| Key | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key for client ops |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key for secure tasks / encryption |
| `NEXT_PUBLIC_APP_URL` | Base URL of this app (used in emails/links) |
| `NEXT_PUBLIC_PROD_SITE_URL` | Marketing site link used on auth pages |
| `NEXT_PUBLIC_BULKCLIX_API_KEY` | BulkClix API key |
| `NEXT_PUBLIC_BULKCLIX_API_URL` | (Optional) Override BulkClix API base |
| `NEXT_PUBLIC_BULKCLIX_DISABLED` | `"true"` to bypass BulkClix during tests |
| `NEXT_PUBLIC_VOTES_UNAVAILABLE` | `"true"` to enable maintenance mode |
| `CRON_SECRET` | Secret token for `/api/cron/election-reminders` |
| `ENCRYPTION_MASTER_KEY` | AES key for sensitive payloads (falls back to Supabase role key) |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Validate WhatsApp webhook |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp Business number ID |
| `WHATSAPP_ACCESS_TOKEN` | WhatsApp Business API token |
| `BLOCKCHAIN_NETWORK` | (Optional) audit chain network id |
| `BLOCKCHAIN_RPC_URL` | RPC endpoint for vote notarization |
| `BLOCKCHAIN_CONTRACT_ADDRESS` | Contract used for notarizing results |
| `BLOCKCHAIN_PRIVATE_KEY` | Wallet key for signing chain transactions |

Add any other provider-specific secrets (Resend, etc.) if you enable those integrations.

## Production Build & Deploy

```bash
npm run build
npm run start     # serves the compiled build on PORT (default 3000)
```

### Deploying to Vercel
1. Push this repo to GitHub/GitLab/Bitbucket.
2. In Vercel, create a new project from that repo.
3. Add all environment variables under **Project → Settings → Environment Variables**.
4. Deploy – Vercel runs `npm install` + `npm run build` automatically.
5. Attach your domain in Vercel and update DNS (CNAME/A record) to finish.

### Deploying to a VPS / StormerHost Node plan
1. Provision a server with Node 18+.
2. SSH in, clone the repo, and run:  
   `npm install && npm run build`
3. Use `pm2 start npm --name prelyct -- run start` (or systemd) so the app restarts automatically.
4. Configure Nginx/Apache as a reverse proxy (optional) and point your domain’s DNS at the server.

## Project Structure (high level)

```
app/
├─ api/                 # Server routes (payments, cron, webhooks, etc.)
├─ dashboard/           # Admin experience
├─ public-vote/         # Public voting flow
├─ auth/                # Sign-in / sign-up pages
└─ layout.tsx           # Root layout

components/             # Shared UI primitives
lib/                    # Integrations (Supabase, BulkClix, WhatsApp, etc.)
```

## Useful Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start local dev server (with hot reload) |
| `npm run build` | Create production build (used by Vercel/CI) |
| `npm run start` | Run the compiled Next.js server |

Linting and TypeScript checks are disabled during builds in `next.config.js` to keep deployment friction low—turn them back on once you’re ready to address the outstanding warnings.

## Documentation

- **Payment System** - See `/PAYMENT-SYSTEM-DOCUMENTATION.md` for BulkClix integration details
- **Votes Setup** - See `/README-VOTES.md` for voting system setup
- **Supabase Setup** - See `/README-SUPABASE-SETUP.md` for database configuration

## Support

For production issues, ensure:
- Supabase policies are configured correctly
- BulkClix IP addresses are whitelisted
- Webhook URLs match your hosting environment
- All environment variables are set

Happy launching!

