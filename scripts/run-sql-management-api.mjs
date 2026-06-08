/**
 * Run a single SQL file against a Supabase project via Management API (no DB password).
 *
 * Env:
 *   SUPABASE_ACCESS_TOKEN
 *   SUPABASE_PROD_PROJECT_REF or SUPABASE_DEV_PROJECT_REF (or --project-ref)
 *
 * Usage:
 *   node scripts/run-sql-management-api.mjs path/to/file.sql
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const API_BASE = 'https://api.supabase.com/v1';
const TRANSIENT_API_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504, 544]);
const MAX_API_ATTEMPTS = 4;
const RETRY_DELAYS_MS = [5000, 15000, 30000];

const sqlPath = process.argv.find((arg) => arg.endsWith('.sql'));
const projectRef =
  process.argv.find((arg, index) => process.argv[index - 1] === '--project-ref') ||
  process.env.SUPABASE_PROD_PROJECT_REF?.trim() ||
  process.env.SUPABASE_DEV_PROJECT_REF?.trim();

const accessToken = process.env.SUPABASE_ACCESS_TOKEN?.trim();

if (!accessToken) {
  console.error('SUPABASE_ACCESS_TOKEN is required');
  process.exit(1);
}

if (!projectRef) {
  console.error('Set SUPABASE_PROD_PROJECT_REF / SUPABASE_DEV_PROJECT_REF or pass --project-ref');
  process.exit(1);
}

if (!sqlPath) {
  console.error('Usage: node scripts/run-sql-management-api.mjs <file.sql>');
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

const runQuery = async (sql) => {
  for (let attempt = 1; attempt <= MAX_API_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(`${API_BASE}/projects/${projectRef}/database/query`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql }),
      });

      const text = await response.text();
      if (!response.ok) {
        const error = new Error(
          `Management API query failed (${response.status}) on ${projectRef}: ${text.slice(0, 4000)}`,
        );
        error.status = response.status;
        error.body = text;
        throw error;
      }

      try {
        return text ? JSON.parse(text) : null;
      } catch {
        return text;
      }
    } catch (error) {
      if (attempt < MAX_API_ATTEMPTS && isTransientApiError(error)) {
        const delayMs = RETRY_DELAYS_MS[attempt - 1] ?? RETRY_DELAYS_MS.at(-1);
        console.warn(
          `Management API query failed transiently ` +
            `(attempt ${attempt}/${MAX_API_ATTEMPTS}); retrying in ${Math.round(delayMs / 1000)}s: ${error.message}`,
        );
        await sleep(delayMs);
        continue;
      }

      throw error;
    }
  }
};

const main = async () => {
  const absolutePath = resolve(process.cwd(), sqlPath);
  const sql = await readFile(absolutePath, 'utf8');
  console.log(`Running ${sqlPath} on ${projectRef} (${sql.length} bytes) …`);
  const result = await runQuery(sql);
  if (result !== null && result !== undefined && result !== '') {
    console.log(JSON.stringify(result, null, 2));
  }
  console.log('SQL complete.');
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
