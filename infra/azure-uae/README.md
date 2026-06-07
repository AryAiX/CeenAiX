# infra/azure-uae — Self-hosted Supabase on Azure UAE North

This folder holds the **thin overrides** that turn the official Supabase docker
stack into the CeenAiX "Azure UAE" environment (Path A from the 2026-05-31
infrastructure analysis): a single Azure VM in **UAE North** running the
open-source Supabase services behind a Caddy TLS reverse proxy.

> Full step-by-step (provisioning, secrets, migrations, function deploy, app
> wiring, backups, upgrade path) lives in
> [`docs/runbooks/azure-uae-environment.md`](../../docs/runbooks/azure-uae-environment.md).
> This README is just a map of the files here.

## Why overrides instead of a vendored compose file

The upstream `supabase/docker/docker-compose.yml` is ~400 lines and changes
often. Vendoring it would rot. Instead we **clone the official stack** and layer
these small, auditable files on top with `-f docker-compose.override.yml`.

## Files

| File | Purpose |
| --- | --- |
| `.env.example` | CeenAiX-tailored env for the official stack. Copy to the supabase/docker checkout as `.env`, then fill with generated secrets. **Never commit a filled copy.** |
| `docker-compose.override.yml` | Adds the Caddy TLS proxy, keeps Kong off the public internet, hardens restart policies. Applied on top of the upstream compose. |
| `Caddyfile` | Caddy reverse proxy with automatic HTTPS (Let's Encrypt). Terminates TLS for the public API host and proxies to Kong. |

The bootstrap automation that ties these together is
[`scripts/azure-uae-bootstrap.sh`](../../scripts/azure-uae-bootstrap.sh)
(idempotent; copy it onto the VM and run there).

## Quick flow (see runbook for the real thing)

```bash
# On the VM (Ubuntu LTS, Azure UAE North), as a sudo-capable user:
scp -r infra/azure-uae scripts/azure-uae-bootstrap.sh azureuser@<vm-ip>:~/
ssh azureuser@<vm-ip>
./azure-uae-bootstrap.sh          # installs Docker, fetches stack, generates secrets, starts it
```

Then apply this repo's migrations and deploy the Edge Functions against the new
endpoint, and point the apps at it via env vars — all documented in the runbook.

## App wiring (summary)

Self-host generates its **own** keys (different from Supabase Cloud):

```
# web (.env.production.local / CI)
VITE_SUPABASE_URL=https://api.uae.ceenaix.com
VITE_SUPABASE_ANON_KEY=<self-generated anon JWT>
# VITE_SUPABASE_FUNCTIONS_URL only if functions are on a separate host;
# default is ${VITE_SUPABASE_URL}/functions/v1

# mobile (mobile/.env)
EXPO_PUBLIC_SUPABASE_URL=https://api.uae.ceenaix.com
EXPO_PUBLIC_SUPABASE_ANON_KEY=<self-generated anon JWT>
```
