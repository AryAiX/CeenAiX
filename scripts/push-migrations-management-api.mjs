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

const api = async (path, options = {}) => {
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
    throw new Error(
      `Management API ${options.method ?? 'GET'} ${path} failed (${response.status}): ${
        typeof body === 'string' ? body : JSON.stringify(body)
      }`,
    );
  }

  return body;
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
  await api(`/projects/${projectRef}/database/migrations`, {
    method: 'POST',
    body: JSON.stringify({
      query,
      name: migration.name,
    }),
  });
  console.log(`  ✓ ${migration.version} ${migration.name}`);
};

const main = async () => {
  console.log(`Listing remote migrations on ${projectRef} …`);
  const remote = await listRemoteMigrations();
  const remoteVersions = new Set(remote.map((row) => String(row.version)));

  const local = await listLocalMigrations();
  const pending = local.filter((migration) => !remoteVersions.has(migration.version));

  if (pending.length === 0) {
    console.log('No pending migrations to apply.');
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
