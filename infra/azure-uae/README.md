# infra/azure-uae — Self-hosted Supabase on Azure UAE North

This folder holds the **thin overrides** that turn the official Supabase docker
stack into the CeenAiX "Azure UAE" environment: an approved `Standard_D2_v4`
Azure VM in **UAE North** running the open-source Supabase services and the
static web bundle behind Caddy.

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
| `docker-compose.override.yml` | Adds Caddy, mounts `/var/www/ceenaix` for the web bundle, keeps Kong off the public internet, and hardens restart policies. Applied on top of the upstream compose. |
| `Caddyfile` | Caddy reverse proxy with automatic HTTPS for DNS-backed hosts plus an HTTP public-IP pilot mode for first validation before DNS/TLS. |

The bootstrap automation that ties these together is
[`scripts/azure-uae-bootstrap.sh`](../../scripts/azure-uae-bootstrap.sh)
(idempotent; copy it onto the VM and run there).

## Quick flow (see runbook for the real thing)

```bash
# On the VM (Ubuntu LTS, Azure UAE North), as a sudo-capable user:
scp -r infra/azure-uae scripts/azure-uae-bootstrap.sh azureuser@<vm-ip>:~/
ssh azureuser@<vm-ip>
API_EXTERNAL_URL=http://<public-ip> SITE_URL=http://<public-ip> \
  ./azure-uae-bootstrap.sh        # installs Docker, fetches stack, generates secrets, starts it
```

Then apply this repo's migrations with `scripts/azure-uae-apply-migrations.sh`
through an SSH tunnel and deploy the web bundle/function source with
`scripts/azure-uae-deploy-vm.sh` — all documented in the runbook.

## App wiring (summary)

Self-host generates its **own** keys (different from Supabase Cloud):

```
# web (.env.production.local / CI)
VITE_SUPABASE_URL=https://api.uae.ceenaix.com
VITE_SUPABASE_ANON_KEY=<self-generated anon JWT>
VITE_SUPABASE_FUNCTIONS_URL=https://api.uae.ceenaix.com/functions/v1

# Public-IP pilot before DNS/TLS:
VITE_SUPABASE_URL=http://<public-ip>
VITE_SUPABASE_ANON_KEY=<self-generated anon JWT>
VITE_SUPABASE_FUNCTIONS_URL=http://<public-ip>/functions/v1

# mobile (mobile/.env)
EXPO_PUBLIC_SUPABASE_URL=https://api.uae.ceenaix.com
EXPO_PUBLIC_SUPABASE_ANON_KEY=<self-generated anon JWT>
```
