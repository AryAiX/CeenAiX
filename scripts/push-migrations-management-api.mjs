/**
 * Apply pending SQL migrations via Supabase Management API (no DB password required).
 *
 * Env:
 *   SUPABASE_ACCESS_TOKEN
 *   SUPABASE_DEV_PROJECT_REF or SUPABASE_PROD_PROJECT_REF (or --project-ref)
 */

import { readFile, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const API_BASE = 'https://api.supabase.com/v1';
const TRANSIENT_API_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504, 544]);
const MAX_API_ATTEMPTS = 4;
const RETRY_DELAYS_MS = [5000, 15000, 30000];

const dryRun = process.argv.includes('--dry-run');

const projectRef =
  process.argv.find((arg, index) => process.argv[index - 1] === '--project-ref') ||
  process.env.SUPABASE_DEV_PROJECT_REF ||
  process.env.SUPABASE_PROD_PROJECT_REF;

const accessToken = process.env.SUPABASE_ACCESS_TOKEN?.trim();
const migrationsDir = resolve(process.cwd(), 'supabase/migrations');

if (!accessToken) {
  console.error('SUPABASE_ACCESS_TOKEN is required');
  process.exit(1);
}

if (!projectRef) {
  console.error('Set SUPABASE_DEV_PROJECT_REF or pass --project-ref <ref>');
  process.exit(1);
}

const sleep = (ms) => new Promise((resolveDelay) => setTimeout(resolveDelay, ms));

const isTransientApiError = (error) => {
  const message = String(error.body ?? error.message ?? '').toLowerCase();
  return (
    TRANSIENT_API_STATUSES.has(error.status) ||
    message.includes('timeout') ||
    message.includes('connection terminated') ||
    message.includes('temporarily unavailable')
  );
};

const api = async (path, options = {}) => {
  for (let attempt = 1; attempt <= MAX_API_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          ...(options.headers ?? {}),
        },
      });

      const text = await response.text();
      let body;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = text;
      }

      if (!response.ok) {
        const message =
          typeof body === 'string' ? body : JSON.stringify(body);
        const error = new Error(
          `Management API ${options.method ?? 'GET'} ${path} failed (${response.status}): ${message}`,
        );
        error.status = response.status;
        error.body = message;
        throw error;
      }

      return body;
    } catch (error) {
      if (attempt < MAX_API_ATTEMPTS && isTransientApiError(error)) {
        const delayMs = RETRY_DELAYS_MS[attempt - 1] ?? RETRY_DELAYS_MS.at(-1);
        console.warn(
          `Management API ${options.method ?? 'GET'} ${path} failed transiently ` +
            `(attempt ${attempt}/${MAX_API_ATTEMPTS}); retrying in ${Math.round(delayMs / 1000)}s: ${error.message}`,
        );
        await sleep(delayMs);
        continue;
      }

      throw error;
    }
  }
};

const isBenignMigrationError = (error) => {
  const text = String(error.body ?? error.message ?? '').toLowerCase();
  return (
    text.includes('already exists') ||
    text.includes('duplicate key') ||
    text.includes('already been registered')
  );
};

const listRemoteMigrations = async () => {
  const data = await api(`/projects/${projectRef}/database/migrations`);
  return Array.isArray(data) ? data : [];
};

const listLocalMigrations = async () => {
  const files = (await readdir(migrationsDir))
    .filter((name) => name.endsWith('.sql'))
    .sort();

  return files.map((filename) => {
    const match = /^(\d{14})_(.+)\.sql$/.exec(filename);
    if (!match) {
      throw new Error(`Unexpected migration filename: ${filename}`);
    }
    return {
      filename,
      version: match[1],
      name: match[2],
      path: join(migrationsDir, filename),
    };
  });
};

const applyMigration = async (migration) => {
  const query = await readFile(migration.path, 'utf8');
  console.log(`Applying ${migration.filename} …`);
  try {
    await api(`/projects/${projectRef}/database/migrations`, {
      method: 'POST',
      body: JSON.stringify({
        query,
        name: migration.name,
      }),
    });
    console.log(`  ✓ ${migration.version} ${migration.name}`);
  } catch (error) {
    if (isBenignMigrationError(error)) {
      console.warn(`  ↷ skipped ${migration.filename} (schema already present on remote)`);
      return;
    }
    throw error;
  }
};

const main = async () => {
  console.log(`Listing remote migrations on ${projectRef} …`);
  const remote = await listRemoteMigrations();
  const remoteVersions = new Set(remote.map((row) => String(row.version)));
  const remoteNames = new Set(remote.map((row) => String(row.name)));

  const local = await listLocalMigrations();
  const pending = local.filter(
    (migration) =>
      !remoteVersions.has(migration.version) && !remoteNames.has(migration.name),
  );

  if (pending.length === 0) {
    console.log('No pending migrations to apply.');
    return;
  }

  if (dryRun) {
    console.log(`Dry-run: ${pending.length} pending migration(s) would be applied:`);
    for (const migration of pending) {
      console.log(`  - ${migration.filename}`);
    }
    return;
  }

  console.log(`Applying ${pending.length} pending migration(s) …`);
  for (const migration of pending) {
    await applyMigration(migration);
  }
  console.log('Migration apply complete.');
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
