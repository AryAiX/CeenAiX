# Production Environment — Setup & Runbook

Last updated: 2026-05-10
Owner: Platform engineering

## Inventory

| Resource | Value |
| --- | --- |
| **Supabase project (prod)** | `ceenaix-prod` |
| Project ref | `ziykaxyadcdmyakzvjff` |
| Region | `us-west-2` (West US, Oregon — same as dev) |
| URL | `https://ziykaxyadcdmyakzvjff.supabase.co` |
| Dashboard | https://supabase.com/dashboard/project/ziykaxyadcdmyakzvjff |
| **Supabase project (dev)** | `dev-db` |
| Project ref | `lgfaucsfiyxvmsghnpey` |
| Region | `us-west-2` |
| **Vercel project** | `ceenaix` (team `aryaix`) — `prj_FosTjANr8nLMgGOMCcMX1CoAKXLi` |
| Production web URL | https://www.ceenaix.com |

> **Data residency note:** Supabase does not yet offer a UAE region (`me-central-1`), and AWS UAE is in a multi-month restoration window as of 2026-05. Production is therefore hosted in `us-west-2` matching dev. When Supabase adds UAE, or when we move to self-hosted on G42/eCloud, this runbook needs updating and a DB migration window.

## How "ref data only, no seed data" is enforced

The repo holds 92 migrations as of 2026-05-10. Several are pure demo seeds (patient1, doctor1, lab1, admin1 fixtures). Three more are "mixed" — they create production tables *and* seed demo rows into them.

We use a two-stage strategy:

1. **Skip pure demo migrations** by marking them `--status applied` on the prod project *before* the first push. They never run. The list lives in `scripts/prod-demo-migrations.txt`.
2. **Allow mixed migrations** to run (their schema is needed), then **`TRUNCATE` the demo rows** they inserted. The cleanup SQL lives in `scripts/prod-demo-cleanup.sql` and is idempotent.

Reference tables intentionally kept populated in prod:

- `public.specializations` — 67 rows (DHA specialty lookup)
- `public.medication_catalog` — 7 rows (RxNorm seed; will grow)
- `public.lab_test_catalog` — 0 rows (will grow)

Everything else starts empty: no auth users, no organizations, no lab profiles, no orders.

## First-time bring-up (already done — kept here for re-runs / DR)

```bash
# 1. Create the project (one-time, ~$0/month on free tier)
PROD_PW="$(openssl rand -base64 24 | tr -d '+/=' | head -c 28)Aa1!"
echo "$PROD_PW" > /tmp/ceenaix-prod-db-password.txt && chmod 600 /tmp/ceenaix-prod-db-password.txt
npx supabase projects create ceenaix-prod \
  --org-id woegkxmbdogiakrpueqa \
  --region us-west-2 \
  --db-password "$PROD_PW" --yes

# 2. Link
npx supabase link --project-ref ziykaxyadcdmyakzvjff --password "$PROD_PW"

# 3. Mark demo-only migrations as applied so push skips them
for v in $(grep -E '^[0-9]{14}$' scripts/prod-demo-migrations.txt); do
  npx supabase migration repair --status applied "$v" --password "$PROD_PW"
done

# Also skip the 3 buggy 413* migrations (referenced a column added later)
for v in 20260413120000 20260413120100 20260413120200; do
  npx supabase migration repair --status applied "$v" --password "$PROD_PW"
done

# 4. Push the rest
echo 'Y' | npx supabase db push --linked --include-all --password "$PROD_PW"

# 5. Wipe any demo rows the mixed migrations inserted
npx supabase db query --linked --file scripts/prod-demo-cleanup.sql --output csv
```

If you ever need to rebuild the prod project from scratch (DR scenario), follow the same sequence after creating a new project.

## Ongoing migrations (CI-driven)

GitHub Actions handles migrations automatically:

- **`.github/workflows/migrations.yml` job `dry-run`** runs on every PR that touches `supabase/migrations/**` and reports which migrations would apply.
- **`.github/workflows/migrations.yml` job `apply`** runs on push to `main` when `supabase/migrations/**` changes. It links to prod, runs `supabase db push --linked --include-all`, re-runs `prod-demo-cleanup.sql` (idempotent — no-op on clean state), and deploys edge functions.

The workflow uses the `production` GitHub environment so you can require approvals on it (Settings → Environments → production → Required reviewers).

## Required GitHub secrets

These are configured in **Repository → Settings → Secrets and variables → Actions**:

| Secret | Purpose | Where to get it |
| --- | --- | --- |
| `SUPABASE_ACCESS_TOKEN` | Lets the CLI authenticate non-interactively | Configured from the logged-in Supabase CLI token |
| `SUPABASE_PROD_PROJECT_REF` | Identifies the prod project to migrations.yml | `ziykaxyadcdmyakzvjff` |
| `SUPABASE_PROD_DB_PASSWORD` | Lets `supabase db push` authenticate | Configured from the generated prod DB password |
| `VITE_SUPABASE_PROD_URL` | Injected into the production Vite build in deploy.yml | `https://ziykaxyadcdmyakzvjff.supabase.co` |
| `VITE_SUPABASE_PROD_ANON_KEY` | Injected into the production Vite build in deploy.yml | Prod anon / publishable key |
| `VITE_SUPABASE_URL` | Used by the `Build` step in `ci.yml` | `https://lgfaucsfiyxvmsghnpey.supabase.co` (dev — CI builds use dev) |
| `VITE_SUPABASE_ANON_KEY` | Used by the `Build` step in `ci.yml` | dev project anon key |
| `VERCEL_TOKEN_B64`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | Used by `deploy.yml` to deploy to Vercel | Already configured |

## Vercel production wiring

The production deployment is functional without changing Vercel dashboard env vars because `.github/workflows/deploy.yml` injects prod Supabase values into `vercel build --prod` from GitHub secrets:

```yaml
VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_PROD_URL }}
VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_PROD_ANON_KEY }}
VITE_PREVIEW_PIN_GATE: "false"
```

This is important because the local Vercel project link is stale and the Vercel dashboard environment had previously pointed production at the dev Supabase project. For GitHub-driven production deploys, the static Vite bundle is compiled against prod regardless of the dashboard env.

For **Preview** and **Development** Vercel environments, leave them pointing at dev if you edit them later:

```
VITE_SUPABASE_URL          = https://lgfaucsfiyxvmsghnpey.supabase.co
VITE_SUPABASE_ANON_KEY     = <dev anon key>
```

This way PR preview deployments hit dev and never accidentally write to prod.

Manual production deploys are available via GitHub Actions → **Release** →
**Run workflow**. Pushes to `main` still deploy automatically. Verified manual
deploy on 2026-05-11: `https://www.ceenaix.com` aliased to the new prod build.

## Local development against prod (rare, read-only debugging)

```bash
# Copy .env.production.local to .env.local temporarily
cp .env.production.local .env.local.prod-snapshot   # back up current .env.local
cp .env.production.local .env.local
npm run dev
# When done:
mv .env.local.prod-snapshot .env.local
```

> **Never** point dev Supabase auth callbacks at prod, and never commit a `.env.local` containing prod values. `.env.*` is git-ignored except `.env.example`.

## Day-2 operations

### Adding a new migration

```bash
# 1. Author the SQL file in supabase/migrations/.
#    Use a fresh timestamp prefix > the latest existing one.
# 2. Test locally:
supabase start
supabase db reset --linked=false   # local only
# 3. Commit + open PR. CI will dry-run migrations.yml.
# 4. On merge, migrations.yml auto-applies to prod.
```

### Rotating the prod DB password

```bash
# 1. Dashboard → Project Settings → Database → Reset database password.
# 2. Update GitHub secret SUPABASE_PROD_DB_PASSWORD with the new value.
# 3. Update your local link:
PROD_PW="<new-password>"
npx supabase link --project-ref ziykaxyadcdmyakzvjff --password "$PROD_PW"
```

### Rolling back a bad migration

Supabase has no first-class rollback. The recovery path is:

1. Take a fresh dump first: `pg_dump "$PROD_DB_URL" -Fc -f prod-pre-rollback.dump`
2. Author a **forward-fix migration** that reverses the bad change.
3. Merge it. CI will apply it.

For truly catastrophic schema corruption, restore from Supabase's automated daily backups (Dashboard → Database → Backups).

### Promoting dev seed data to prod (deliberate copy)

If product wants specific dev rows promoted to prod (e.g. a curated lab catalog), don't run the dev seed migrations — those reference dev-only auth UUIDs. Instead:

1. Export the rows from dev:
   ```bash
   supabase db dump --linked --data-only \
     --table public.lab_test_catalog \
     --table public.medication_catalog > /tmp/curated-ref.sql
   ```
2. Review the file. Strip any `ALTER OWNER`, demo UUIDs, dev-only role grants.
3. Apply to prod:
   ```bash
   npx supabase link --project-ref ziykaxyadcdmyakzvjff --password "$PROD_PW"
   npx supabase db query --linked --file /tmp/curated-ref.sql
   ```

## Verification after any prod change

```bash
# Row counts should still show 0 for demo tables and stable counts for refs.
npx supabase db query --linked --file scripts/prod-counts.sql --output csv
```

(`scripts/prod-counts.sql` is intentionally not committed; reuse `/tmp/prod-counts.sql` or check the latest counts in this runbook's history.)

## Known gaps / follow-ups

- **UAE residency**: see top of doc. No path on Supabase managed today; needs self-host on G42/eCloud for DHA strict residency.
- **Migration history drift between dev and prod**: dev has 22 migrations that pre-date 2026-02 and aren't in this repo (legacy). Recommend `supabase db pull --linked --project-ref lgfaucsfiyxvmsghnpey` in a separate cleanup PR.
- **Mixed migrations remain a hazard**: any future migration that mixes schema and demo inserts will land in prod and need a new entry in `scripts/prod-demo-cleanup.sql`. **Discipline:** keep schema and demo seeds in separate migration files going forward.
- **Edge functions** are deployed automatically by `migrations.yml`. Make sure they read env vars (not hard-coded keys) when port-forwarded.
- **DB password location**: the generated prod password is stored in GitHub secret `SUPABASE_PROD_DB_PASSWORD` and locally in `/tmp/ceenaix-prod-db-password.txt` on the dev machine for CLI maintenance.
