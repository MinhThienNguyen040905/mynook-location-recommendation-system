# MyNook demo on Vercel

Public demo: https://mynook-demo.vercel.app

The Vercel demo runs the existing Next.js client and NestJS APIs in one project.
The four downstream services keep separate Nest application contexts and
loopback-only HTTP listeners. Only the gateway is exposed at `/api/*`; its JWT
and admin guards still protect writes and administration.

This is a demo deployment adapter, not independent scaling of the microservices.
The original Nx service commands remain available for deployment on a server.

## Build and deploy

Use Node.js 22 or newer, from the repository root:

```sh
npm ci --include=dev
npm run build:vercel
npx vercel login
npx vercel link
node tools/vercel/configure-env.cjs
npx vercel --prod
```

The environment configuration command is for the first deployment of a newly
linked project. It reads an explicit allowlist from the local `.env`, generates
separate JWT secrets, and sends values to Vercel over stdin. It does not upload
the `.env` file or publish secrets to GitHub. On subsequent deployments, manage
existing values in Vercel's project settings rather than regenerating JWT keys.

The build compiles `packages/serverless-api` before Next.js. The package is kept
external to Next's bundler because Nest has optional transports that this demo
does not use. Server-rendered pages call the gateway in the same function;
browser requests use `/api` on the site's origin.

## Runtime configuration

- `DATABASE_URL`: a working Supabase PostgreSQL transaction-pooler URL (port 6543) with the
  project's migrations already applied. The local password must match.
  Session mode pins connections and can exhaust the free project's pool when
  multiple Vercel functions start. TypeORM uses unnamed parameterized queries.
  See [Supabase's serverless pooling guidance](https://supabase.com/docs/guides/troubleshooting/supavisor-faq-YyP5tI).
- `DB_POOL_MAX=1`: one connection per service per warm function instance.
- `GROQ_API_KEY`, `HUGGINGFACE_API_TOKEN`: server-side AI credentials.
- `GROQ_SEARCH_MODEL`: optional override, defaults to `openai/gpt-oss-20b`.
  The previously configured `llama-3.1-8b-instant` is unavailable to this account.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`: media.
- `JWT_SECRET`, `JWT_REFRESH_SECRET`: generated independently of local development.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`: account email.
- `NEXT_PUBLIC_API_URL=/api`: same-origin browser requests.
- `AUTH_SERVICE_URL=http://127.0.0.1:3002`
- `VENUE_SERVICE_URL=http://127.0.0.1:3003`
- `INTERACTION_SERVICE_URL=http://127.0.0.1:3004`
- `SEARCH_AI_SERVICE_URL=http://127.0.0.1:3005`
- `RMQ_ENABLED=false`, `REDIS_ENABLED=false`: no persistent workers on Vercel.

Never configure `NEXT_PUBLIC_GROQ_API_KEY`. Voice recognition calls the gateway
and provider errors never return the key to the browser.

## Demo scope and limits

### One-click demo accounts

Run `node tools/vercel/seed-demo.cjs` with Node.js 24 before enabling
`DEMO_ENABLED=true` and `NEXT_PUBLIC_DEMO_ENABLED=true` in Vercel production.
Redeploy so the public flag is included in the login page build. The seed is
additive and repeatable: two reserved accounts, one clearly labeled fictional
venue, three menu items and one sample review. It does not reset existing data.
Accounts have no password; `/api/auth/demo` accepts only `customer` or `owner`
and checks the expected account ID, email, role and active status.

The gateway verifies signed tokens and enforces demo restrictions for every
request, including tokens obtained through refresh. No admin access, profile or
password edits, venue changes, uploads, reports or imports. Customers can save
favorites and submit a text review only on the dedicated sample venue. Repeated
submissions replace one fixed demo review, keeping storage bounded. The owner
can view the sample dashboard/menu/analytics but cannot modify them. These
accounts are shared; a banner explains this and links to role switching.

Set `DEMO_ENABLED=false` to disable new demo sessions and access by existing
demo tokens. Auth-service independently protects demo profiles/passwords and
suppresses password reset issuance. No admin credentials are exposed.

Validate the live roles and restrictions with:

```sh
node tools/vercel/verify-demo-accounts.cjs https://mynook-demo.vercel.app
```

This checks login/refresh, forbidden writes, owner data, favorites and a bounded
sample review write. It restores the sample review text/rating and favorite
membership after checking; the demo review timestamp is refreshed.

Visitors can explore venues, use natural-language search and maps, and open
venue details without creating an account. Existing account, favorite, review,
owner and admin APIs retain their authentication requirements.

RabbitMQ consumers are not started inside serverless functions. Automatic AI
processing of newly submitted reviews, description seed tags and event-driven
welcome notifications require the original services and a continuously running
RabbitMQ worker deployment. Existing stored reviews and tags remain available
to search. Fire-and-forget jobs are not guaranteed after a function returns.

Rate limiting falls back to a bounded in-memory counter if Redis is absent.
This is per function instance, not a distributed quota. Vercel's own firewall
and provider limits should also be used for a public demo.

Supabase free projects may pause while inactive. A paused database must be
resumed in Supabase before the demo can load real data. A successful frontend
build alone does not verify database availability.

## Verification

```sh
node tools/vercel/smoke-server.cjs
```

This exposes the same gateway handler at `http://127.0.0.1:3101/api` and uses
the local `.env` with Vercel's HTTP-only settings. Check public venues, search,
venue details, and that `/api/admin/dashboard` returns 401 without a token.
Stop the smoke server before starting the full Next.js demo locally because
both use the internal ports 3002–3005.
