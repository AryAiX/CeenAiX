# Azure UAE Environment — Setup & Runbook (self-hosted Supabase)

Last updated: 2026-06-07
Owner: Platform engineering
Status: **Live public-IP pilot.** Azure UAE North bring-up completed on
2026-06-07 after the user approved `Standard_D2_v4` because `Standard_B2ms`
capacity was unavailable. The VM, self-hosted Supabase stack, migrations, Edge
Function source, and static web bundle are deployed and reachable at
`http://20.74.136.137`.

> Companion runbook: [`production-environment.md`](production-environment.md)
> (Supabase Cloud dev/prod inventory + the ref-data-only migration strategy this
> doc reuses). Read it first — the migration/seed discipline is identical here.

## Overview — why Option 1

The AWS UAE region (`me-central-1`) has been down since the March 2026 damage,
and **Supabase Cloud has no UAE region** (it runs only in fixed AWS US/EU/APAC
regions). For data residency we need to leave Supabase Cloud, but CeenAiX is a
**Supabase-native** app (~370 PostgREST `.from()` sites, GoTrue auth + RLS,
Deno Edge Functions, Storage buckets). The cheapest path that keeps all of that
working is to **run the same open-source Supabase stack ourselves in Azure**.

This runbook implements **Path A** from the
[2026-05-31 infrastructure analysis](../weekly-report/weekly-report-2026-05-31-ai-recorder-clinics-landing.md)
in its **least-work shape (Option 1):**

> **Option 1 (this runbook):** the entire Supabase OSS stack — Postgres,
> PostgREST, GoTrue/Auth, Storage, Realtime, Studio, Kong gateway, and the Deno
> Edge runtime — on a **single Azure VM** via Docker Compose, in **Azure UAE
> North**, behind a Caddy TLS reverse proxy.

Because the API contracts are byte-for-byte the same as Supabase Cloud, **app
code is ~95% untouched**: only environment variables, one parameterized Edge
Functions URL (now `VITE_SUPABASE_FUNCTIONS_URL`, defaulting to
`${VITE_SUPABASE_URL}/functions/v1`), and CI/CD targets change. All Edge
Functions in `scripts/non-migration-deployables.manifest.json` deploy unchanged.

### Options considered (and when to graduate)

| Option | What | Effort | When |
| --- | --- | --- | --- |
| **1 — Single VM, full self-host** *(chosen)* | One Azure VM runs the whole Supabase docker stack incl. Postgres. | Lowest. Pure DevOps. | Now — escape AWS / get UAE residency fast. App code ~95% untouched. |
| **2 — VM services + managed Postgres** | Same stack, but point Postgres at **Azure Database for PostgreSQL Flexible Server** (UAE North). Stop the `db` container. | Low-moderate. | When the DB needs real HA, PITR, and managed backups — i.e. before meaningful patient load. **No app rewrite** (still PostgREST/GoTrue on the same SQL). |
| **3 — Azure-native PaaS rewrite (Path B)** | Replace PostgREST/GoTrue/Edge/Storage with Azure-native equivalents. | High, multi-surface rewrite. | Only if mandated off Supabase OSS entirely. Avoid. |

The single VM is the **recommended starting point**. The upgrade to Option 2 is
a config change (`POSTGRES_HOST`) plus a data migration window, not a rewrite —
so we start cheap and graduate when load/compliance demands it.

## Architecture

```
                          Internet (UAE users)
                                  │  443/TLS
                                  ▼
                    ┌──────────────────────────┐
   DNS: api.uae.ceenaix.com ─►   Caddy (auto-HTTPS, Let's Encrypt)
        studio.uae.ceenaix.com   └──────────────┬───────────────┘
                                                 │ :8000 (loopback)
                                                 ▼
                    ┌──────────────────────────────────────────────┐
                    │            Kong API gateway                   │
                    │  /rest/v1  /auth/v1  /storage/v1              │
                    │  /functions/v1  /realtime/v1  (Studio)        │
                    └───┬─────┬──────┬───────┬─────────┬────────────┘
                        │     │      │       │         │
                ┌───────▼┐ ┌──▼───┐ ┌▼──────┐ ┌▼──────┐ ┌▼────────┐
                │PostgREST│ │GoTrue│ │Storage│ │ Edge  │ │ Studio  │
                │ (REST)  │ │(Auth)│ │  API  │ │ Deno  │ │  + Meta │
                └────┬────┘ └──┬───┘ └───┬───┘ └───┬───┘ └────┬────┘
                     │         │         │         │          │
                     └─────────┴────┬────┴─────────┴──────────┘
                                    ▼
                         ┌────────────────────┐
                         │  Postgres (in VM)   │   ◄── Option 2: swap for
                         │  data on data disk  │       Azure DB for PostgreSQL
                         └────────────────────┘       Flexible Server (UAE North)

   Realtime is started by the stack but UNUSED by CeenAiX (no subscriptions /
   no DB webhooks). It can be disabled to save RAM.
```

All of this runs as Docker containers on **one VM**. Only Caddy (80/443) is
exposed to the internet; Kong and every service bind to the Docker network /
loopback. For the low-cost pilot, persistent state (Postgres data, Storage files,
Caddy certs, and the static web bundle) lives on the 128 GiB Standard SSD OS
disk under `/opt/supabase` and `/var/www/ceenaix`. Add a separate data disk when
the environment graduates beyond pilot load.

## Recommended VM sizing

| Item | Recommendation | Notes |
| --- | --- | --- |
| Region | **UAE North** (`uaenorth`) | The operational Azure UAE region. UAE Central has fewer SKUs. |
| VM size | **Standard_D2_v4** (2 vCPU / 8 GiB) | Approved fallback after `Standard_B2ms` returned UAE North capacity errors. Do not create larger sizes without explicit approval. |
| OS | Ubuntu 22.04 / 24.04 LTS | Matches the bootstrap script's Docker apt repo. |
| OS disk | **128 GiB Standard SSD (`StandardSSD_LRS`)** | Keeps the pilot near the reserved-cost target. |
| Data disk | None for the pilot | Add a managed data disk later for cleaner snapshots and isolation. |
| Public IP | Static, Standard SKU | DNS A records point here. |

## Networking / NSG

Lock the Network Security Group down to the minimum:

| Port | Source | Purpose |
| --- | --- | --- |
| 443 | `Internet` | HTTPS API + Studio (via Caddy) |
| 80 | `Internet` | ACME HTTP-01 challenge + HTTP→HTTPS redirect (Caddy) |
| 22 | **Your admin IP / Bastion only** | SSH. Prefer Azure Bastion; never `0.0.0.0/0`. |

Everything else (5432 Postgres, 8000 Kong, service ports) stays **closed** — it
is reachable only inside the Docker network. Restrict `studio.uae.ceenaix.com`
to admin IPs at the NSG in addition to Kong's dashboard basic auth.

## DNS + TLS

1. Create A records for `api.uae.ceenaix.com` and `studio.uae.ceenaix.com`
   pointing at the VM's static public IP **before** bringing Caddy up (ACME
   issuance needs resolvable DNS).
2. Caddy obtains and renews Let's Encrypt certificates automatically based on
   the hostnames in [`infra/azure-uae/Caddyfile`](../../infra/azure-uae/Caddyfile).
   Set the ACME contact `email` there before going live.
3. The web/mobile apps use **one** public host as `VITE_SUPABASE_URL`
   (`https://api.uae.ceenaix.com`); Edge Functions resolve to
   `${VITE_SUPABASE_URL}/functions/v1` with no extra config.

## Step-by-step bring-up

All steps after VM creation are automated (idempotently) by
[`scripts/azure-uae-bootstrap.sh`](../../scripts/azure-uae-bootstrap.sh). The
manual equivalent is shown so you understand what it does.

### 0. Provision the VM (Azure CLI — illustrative)

```bash
# Assumes az login is active on the AryAiX subscription.
az group create -n rg-ceenaix-uae -l uaenorth

az vm create \
  -g rg-ceenaix-uae -n vm-ceenaix-supabase-uae -l uaenorth \
  --image Ubuntu2204 --size Standard_D2_v4 \
  --admin-username azureuser \
  --authentication-type ssh \
  --ssh-key-values ~/.ssh/ceenaix_uae_vm.pub \
  --public-ip-address vm-ceenaix-supabase-uae-ip \
  --public-ip-sku Standard \
  --public-ip-address-allocation static \
  --os-disk-size-gb 128 \
  --storage-sku StandardSSD_LRS \
  --nsg vm-ceenaix-supabase-uae-nsg

# NSG: allow 80/443 from Internet, 22 from your IP only.
az vm open-port -g rg-ceenaix-uae -n vm-ceenaix-supabase-uae --port 80,443 --priority 100
# Keep Postgres closed publicly. Use an SSH tunnel for admin/migrations.
```

### Current live pilot status

| Item | Current value |
| --- | --- |
| Subscription | `d74d37b1-8637-40ba-ad9b-fc53dbf6dfe9` (`Azure subscription 1`) |
| Tenant | `7ebed75a-1cca-4079-a0a2-fcdeff5a8e7c` |
| Resource group | `rg-ceenaix-uae` |
| VM | `vm-ceenaix-supabase-uae` |
| Size | `Standard_D2_v4` |
| Public IP / pilot URL | `20.74.136.137` / `http://20.74.136.137` |
| Private IP | `10.0.0.4` |
| OS disk | 128 GiB root filesystem, `StandardSSD_LRS` managed disk |
| NSG inbound allows | 22, 80, 443 only |
| Supabase health | GoTrue `/auth/v1/health` returns `200 OK` with anon key; PostgREST `/rest/v1/` returns OpenAPI |
| Web health | `http://20.74.136.137/` returns the deployed CeenAiX Vite app shell |
| Migrations | 110 migration versions recorded via private SSH tunnel / psql fallback; demo cleanup completed |
| Reference data | `specializations`: 67 rows; `medication_catalog`: 7 rows; `lab_test_catalog`: 0 rows because current migrations create the catalog schema but do not seed lab-test rows |

The current SSH NSG rule is open from `Internet` because the detected admin IP
changed during provisioning and blocked access. Restrict port 22 to a stable
admin IP or Azure Bastion before treating this pilot as production-accessible.

### 1–5. Bootstrap the stack on the VM

```bash
# From your workstation, copy templates + script to the VM:
scp -r infra/azure-uae scripts/azure-uae-bootstrap.sh azureuser@<vm-ip>:~/
ssh azureuser@<vm-ip>

# On the VM (idempotent — safe to re-run):
# DNS/TLS production mode:
API_EXTERNAL_URL=https://api.uae.ceenaix.com \
SITE_URL=https://uae.ceenaix.com \
  ./azure-uae-bootstrap.sh

# Public-IP pilot mode before DNS/TLS:
API_EXTERNAL_URL=http://<public-ip> \
SITE_URL=http://<public-ip> \
  ./azure-uae-bootstrap.sh
```

The script:

1. **Installs Docker** Engine + compose plugin (skips if present).
2. **Clones the official `supabase/docker`** stack into `/opt/supabase`.
3. **Drops in our overrides** (`docker-compose.override.yml`, `Caddyfile`).
4. **Generates secrets** into `/opt/supabase/.env` on first run only:
   - `JWT_SECRET` (48-byte random),
   - `ANON_KEY` and `SERVICE_ROLE_KEY` — real **HS256 JWTs signed with that
     `JWT_SECRET`** (10-year expiry, matching Supabase Cloud's key shape),
   - `POSTGRES_PASSWORD`, `DASHBOARD_PASSWORD`, `SECRET_KEY_BASE`,
     `VAULT_ENC_KEY`,
   - and stamps `API_EXTERNAL_URL` / `SUPABASE_PUBLIC_URL` / `SITE_URL`.
   It **never overwrites** a filled-in `.env`. It prints the `ANON_KEY` the apps
   must use.
5. **Brings up the stack** (`docker compose up -d`).

Manual secret generation (if you are not using the script) follows the upstream
[Supabase self-hosting guide](https://supabase.com/docs/guides/self-hosting/docker):
set `JWT_SECRET`, then generate the `anon` and `service_role` JWTs from it, set
`POSTGRES_PASSWORD`, the dashboard creds, and `API_EXTERNAL_URL` / `SITE_URL`.

After this, set the two **non-generated** secrets by hand in `/opt/supabase/.env`:

- `SMTP_PASS` — the same Resend API key used by Cloud (host `smtp.resend.com`,
  user `resend`, sender `CeenAiX <no-reply@mail.ceenaix.com>`; see
  [`manual-environment-configuration.md`](manual-environment-configuration.md)).
- The Edge Function `OPENAI_API_KEY` (set as a function secret, step below).

## Applying this repo's migrations to the self-hosted DB

Reuse the **exact** ref-data-only discipline from
[`production-environment.md`](production-environment.md#how-ref-data-only-no-seed-data-is-enforced)
— do not re-invent it. The self-hosted Postgres is just another target the
Supabase CLI can link to.

```bash
# From a checkout of THIS repo, with the supabase CLI installed.
# DB_URL points at the self-hosted Postgres (via SSH tunnel or a temporary
# firewall allowance for your admin IP — never leave 5432 open publicly).
SELF_HOST_DB_URL="postgresql://postgres:<POSTGRES_PASSWORD>@<vm-ip>:5432/postgres"

AZURE_UAE_DB_URL="$SELF_HOST_DB_URL" ./scripts/azure-uae-apply-migrations.sh

# If the Supabase CLI is unavailable or the local `npx supabase` binary cannot
# run on the workstation, use the psql fallback. It applies ordered SQL through
# the same private tunnel and records versions in
# `supabase_migrations.schema_migrations`.
AZURE_UAE_MIGRATION_MODE=psql \
AZURE_UAE_DB_URL="$SELF_HOST_DB_URL" ./scripts/azure-uae-apply-migrations.sh
```

This yields the same shape as prod: reference tables populated where this repo
currently ships seed rows (`specializations`, `medication_catalog`), everything
else empty, no demo auth users. See the prod runbook for the rationale and the
list of intentionally-kept reference rows.

Current pilot note: the repo contains reference rows for `specializations` and
`medication_catalog`, but no `INSERT` seed for `lab_test_catalog`; the table is
present and empty after cleanup.

> Tunnel tip: `ssh -L 5432:localhost:5432 azureuser@<vm-ip>` and target
> `postgresql://postgres:<pw>@localhost:5432/postgres` so Postgres never needs a
> public firewall hole.

## Deploying the web app and Edge Functions to the VM

The functions to deploy are enumerated in
[`scripts/non-migration-deployables.manifest.json`](../../scripts/non-migration-deployables.manifest.json)
(`clinic-doctor-invite`, `leads`, `ai-chat`, `ai-document-analyze`,
`medication-enrich`, `consultation-scribe`). For the self-hosted Docker runtime,
the repeatable path is to copy the function source into
`/opt/supabase/volumes/functions/` and restart the edge runtime. The same deploy
script also installs the static Vite bundle into `/var/www/ceenaix` for Caddy.

```bash
VITE_SUPABASE_URL=http://<public-ip> \
VITE_SUPABASE_ANON_KEY=<anon-key-from-vm-env> \
VITE_SUPABASE_FUNCTIONS_URL=http://<public-ip>/functions/v1 \
VITE_PREVIEW_PIN_GATE=false \
  npm run build

AZURE_UAE_HOST=<public-ip> \
AZURE_UAE_SSH_KEY_PATH=~/.ssh/ceenaix_uae_vm \
  ./scripts/azure-uae-deploy-vm.sh
```

Set `OPENAI_API_KEY` and SMTP secrets in `/opt/supabase/.env` before expecting
AI/email functions to work. The deploy script moves code only; it does not create
or print secrets.

## App wiring

The self-host generates **its own keys** — they differ from the Cloud dev/prod
keys. Point each app at the new endpoint:

### Web (`.env.production.local`, Vercel env, or CI)

```dotenv
VITE_SUPABASE_URL=https://api.uae.ceenaix.com
VITE_SUPABASE_ANON_KEY=<self-generated anon JWT from /opt/supabase/.env>
# Optional — only if you serve functions on a SEPARATE host. Default is
# ${VITE_SUPABASE_URL}/functions/v1, which is correct for this single-VM setup.
# VITE_SUPABASE_FUNCTIONS_URL=https://api.uae.ceenaix.com/functions/v1
```

`VITE_SUPABASE_FUNCTIONS_URL` is the parameterized Edge Functions base URL
introduced with this work (see `src/lib/supabase.ts` → `edgeFunctionUrl()`). It
makes the formerly-hardcoded `/functions/v1` base overridable while keeping the
current behavior as the default.

### Mobile (`mobile/.env`)

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://api.uae.ceenaix.com
EXPO_PUBLIC_SUPABASE_ANON_KEY=<self-generated anon JWT>
# EXPO_PUBLIC_SUPABASE_FUNCTIONS_URL is reserved for parity; mobile does not call
# Edge Functions today, so leave it unset.
```

### CI/CD wiring notes

- The current pipelines target Cloud: **Build** (`ci.yml`) → dev, **Release**
  (`deploy.yml`) → prod, migrations via `migrations.yml`. To add UAE, mirror the
  prod path with a new environment/secret set:
  - `VITE_SUPABASE_UAE_URL` = `https://api.uae.ceenaix.com`
  - `VITE_SUPABASE_UAE_ANON_KEY` = self-host anon JWT
  - `SUPABASE_UAE_DB_URL` = self-host Postgres URL (for migrations) — pass to the
    CLI with `--db-url` instead of `--linked` (there is no Supabase project ref
    to link against for a self-host).
- Migrations to the self-host use `supabase db push --db-url …` (Management API
  is Cloud-only). Function deploys use `supabase functions deploy --db-url …`.
- Keep dev/prod Cloud pipelines unchanged; add UAE as an additional manual
  Release-style target until it becomes primary.

## Backups / HA / ownership trade-offs

A single VM means **we own** what Supabase Cloud used to handle:

- **Backups:** schedule `pg_dump` (or `pg_basebackup`) to Azure Blob Storage in
  UAE North on a cron, plus daily VM/data-disk snapshots. There is **no managed
  PITR** on a single VM — accept a daily RPO or move to Option 2.
- **HA:** none. A VM reboot or host fault = downtime. Acceptable for
  pilot/MVP; not for production patient load.
- **Upgrades:** we patch the OS and bump the Supabase stack (`git pull` in
  `/opt/supabase` + `docker compose pull && up -d`). Test on a clone first.
- **Monitoring:** add Azure Monitor / a uptime check on `api.uae.ceenaix.com`.

### Upgrade path to Option 2 (managed Postgres) — no app rewrite

When HA/PITR matter:

1. Provision **Azure Database for PostgreSQL Flexible Server** in UAE North
   (zone-redundant HA, automated backups/PITR).
2. `pg_dump` the VM Postgres → restore into Flexible Server.
3. In `/opt/supabase/.env`, set `POSTGRES_HOST` to the Flexible Server FQDN
   (and credentials); stop the `db` container in the override.
4. `docker compose up -d` — PostgREST/GoTrue/Storage/Edge now talk to managed
   Postgres. **No application code changes**: the SQL surface is identical.

This is the recommended graduation step before meaningful production load.

## Compliance note (AI / data residency)

Putting the **database** in UAE North satisfies DB residency, but it is **not
the whole residency story**:

- The **AI Consultation Recorder** and other AI features still call **OpenAI
  (US/EU)** for Whisper transcription and GPT-4o generation. Audio and
  transcripts therefore leave UAE during processing.
- **Audio/transcript residency is a separate compliance decision** from the DB
  region and applies regardless of where Postgres lives. Options to evaluate
  later: an in-region transcription provider, a configurable retention purge
  (default 90-day audio is noted as not-yet-implemented), and a BAA/DPA review.
- This runbook scopes **data/API residency only**. Track AI residency
  separately alongside the DHA/NABIDH compliance work.

## Assumptions

1. **Domains** `api.uae.ceenaix.com` / `studio.uae.ceenaix.com` and web origin
   `uae.ceenaix.com` are placeholders — adjust to the real DNS chosen by the
   team. They appear in the Caddyfile, `.env.example`, and this doc.
2. **Single VM, Postgres-in-VM (Option 1)** is the starting topology, per the
   final decision. Option 2 (managed Postgres) is documented as the graduation
   step, not implemented.
3. **Region = UAE North.** UAE Central was not chosen (fewer SKUs).
4. **VM size `Standard_D2_v4`** is the approved fallback after `Standard_B2ms`
   was unavailable; right-size after observing pilot load.
5. **Keys are self-generated** and differ from Cloud dev/prod. The bootstrap
   script signs `anon`/`service_role` JWTs with the generated `JWT_SECRET` using
   HS256 + a 10-year expiry to match Supabase's key shape.
6. **SMTP reuses the existing Resend** credentials; **OpenAI** uses the existing
   `OPENAI_API_KEY` as a function secret — no new vendors.
7. **Realtime is unused** by CeenAiX (no subscriptions/webhooks) and may be
   disabled to save RAM; it is left enabled to match upstream.
8. **CI for UAE is documented, not wired.** Adding it is a follow-up PR once the
   environment is live and a secret set exists.

## Follow-ups

- Restrict SSH (port 22) to a stable admin IP or Azure Bastion.
- Configure DNS/TLS for `api.uae.ceenaix.com`, `uae.ceenaix.com`, and optionally
  `studio.uae.ceenaix.com`; the pilot currently uses public-IP HTTP mode.
- Add a real `lab_test_catalog` reference seed if the UAE environment needs lab
  ordering/search before the catalog import pipeline exists.
- Decide audio/transcript residency for the AI Recorder (separate compliance
  track).
- Wire the live UAE secret set into the manual GitHub Actions target.
- Stand up automated `pg_dump` → Azure Blob backups; evaluate Option 2 timing.
- Purchase any reservation manually after finance confirms the final VM size;
  no reservation has been bought by this runbook or branch.
