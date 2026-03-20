# TaskLyne

AI-powered SaaS platform for startup teams with three specialized agents: **Research** (market analysis, competitor intel, sentiment), **Build** (PRDs, feature specs, user stories, tech stack), and **Growth** (cold emails, blog content, onboarding flows).

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **AI Agents:** LangGraph (LLM orchestration), LangChain
- **Database & Auth:** Supabase (Postgres, RLS, Row Level Security)
- **Payments:** Stripe (subscriptions: Free/Starter/Pro/Scale)
- **Styling:** Tailwind CSS v4, shadcn/ui, Radix UI
- **State:** TanStack Query
- **Language:** TypeScript

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # Login, signup, password reset
│   ├── (dashboard)/         # Dashboard routes
│   │   └── dashboard/       # Main app pages
│   │       ├── research/     # Research Agent UI
│   │       ├── build/        # Build Agent UI
│   │       ├── growth/       # Growth Agent UI
│   │       ├── tasks/        # Task history
│   │       ├── team/         # Team workspaces
│   │       ├── billing/      # Subscription management
│   │       ├── integrations/ # Apollo/SendGrid
│   │       └── settings/     # Account settings
│   ├── api/                  # API routes
│   │   ├── agents/           # Agent execution endpoints
│   │   ├── tasks/            # Task CRUD
│   │   ├── teams/            # Team management
│   │   ├── share/            # Task/report sharing
│   │   ├── notifications/    # Notification system
│   │   ├── analytics/        # Usage tracking
│   │   ├── integrations/     # Third-party integrations
│   │   ├── account/          # Account management
│   │   ├── keys/             # BYOK API key management
│   │   └── webhooks/         # Stripe webhooks
│   └── share/[token]/       # Public shared task view
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── dashboard/            # Sidebar, header
│   └── *.tsx                # Shared components
├── hooks/                   # React hooks
├── lib/
│   ├── ai/                  # AI providers, routing, streaming
│   ├── agents/              # Agent graphs and executors
│   │   ├── research/        # Research Agent (search + analysis)
│   │   ├── build/           # Build Agent (PRD, specs, stories)
│   │   └── growth/         # Growth Agent (emails, blog, onboarding)
│   ├── supabase/           # Supabase clients
│   ├── stripe/             # Stripe integration
│   └── *.ts                # Utilities, validations, limits
└── types/                  # TypeScript types
supabase/
├── migrations/             # Database schema migrations
└── config.toml            # Supabase CLI config
tests/                      # Unit tests (Vitest)
```

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create `.env.local` with:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_SCALE_PRICE_ID=price_...

# Encryption (for BYOK) — run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=your-64-char-hex-string

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Database Setup

Run migrations against your Supabase project:

```bash
# Using Supabase CLI
supabase db push

# Or manually apply migrations in order:
# 1. 001_initial_schema.sql (main tables, RLS, triggers)
# 2. 00002_team_workspaces.sql (teams, members, invitations)
# 3. 00003_sharing.sql (shared tasks and reports)
# 4. 00004_notifications.sql (notifications)
# 5. 00005_constraints_and_indexes.sql (CHECK constraints, indexes)
```

### 4. Supabase: Enable Email Confirmation

Go to **Supabase Dashboard → Authentication → Email Auth → Confirm email = ON**

### 5. Stripe: Create Products

Create 3 subscription products in Stripe Dashboard and copy their Price IDs into env vars:
- Starter (e.g., $29/mo)
- Pro (e.g., $99/mo)
- Scale (e.g., $299/mo)

### 6. Stripe: Configure Webhook

1. Go to **Stripe Dashboard → Developers → Webhooks**
2. Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
3. Select events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
4. Copy the signing secret (`whsec_...`) into `STRIPE_WEBHOOK_SECRET`

## Deployment

### GitHub Actions + Vercel (Recommended)

1. Push code to GitHub
2. Go to **Vercel Dashboard → Project Settings → Git Integration** → Connect your GitHub repo
3. Add secrets in **GitHub repo → Settings → Secrets → Actions**:
   - `VERCEL_TOKEN` — from vercel.com/account/tokens
   - `VERCEL_ORG_ID` — from `vercel.json` or Vercel project settings
   - `VERCEL_PROJECT_ID` — from Vercel project settings
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID`
   - `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID`
   - `NEXT_PUBLIC_STRIPE_SCALE_PRICE_ID`
   - `ENCRYPTION_KEY`
   - `NEXT_PUBLIC_APP_URL` (e.g., `https://your-app.vercel.app`)
4. Push to `main` — GitHub Actions auto-builds, lints, tests, and deploys

**How it works:**
- Push to `main` → auto-deploys to production
- Open PR → auto-deploys preview URL

### Vercel CLI (manual)

```bash
vercel --prod
```

## Features

### AI Agents

**Research Agent** — Market analysis, competitor research, sentiment analysis. Streaming SSE output with structured JSON reports.

**Build Agent** — Generate PRDs, feature specs, user stories, and tech stack recommendations. Two-step generate + refine pipeline.

**Growth Agent** — Cold email campaigns, blog content generation, onboarding flow creation. Integrates with Apollo for lead discovery.

### Core Features

- **BYOK (Bring Your Own Keys)** — Users bring their own OpenAI/Anthropic/Gemini API keys, encrypted at rest
- **Team Workspaces** — Create teams, invite members with roles (owner/admin/member/viewer), manage shared access
- **Task Sharing** — Share tasks and reports publicly via token-based URLs
- **Notifications** — In-app notifications for task completion, team invites, billing
- **Usage Analytics** — Track task counts, token usage, agent activity
- **Subscription Plans** — Free (5 tasks/month), Starter ($29/mo), Pro ($99/mo), Scale ($299/mo)

## Tests

```bash
npm test
```

## Build

```bash
npm run build
npm start
```

## Development

```bash
# Lint
npm run lint

# Type check
npx tsc --noEmit

# Run tests in watch mode
npm run test:watch
```

## Architecture

### Agent Flow

Each agent uses LangGraph for state management:

```
Research: plan → search → analyze → report → END
Build:    understand → generate → refine → END
Growth:   plan → research → generate → review → END
```

### Database

Supabase with Row Level Security policies enforce:
- Users can only access their own data
- Team members have role-based access to team resources
- Shared tasks/reports respect public/private visibility

### Authentication

Supabase Auth with cookie-based sessions. The proxy (`src/proxy.ts`) handles session refresh, route protection, and email verification enforcement.
