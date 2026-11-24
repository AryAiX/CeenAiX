/**
 * Run a single SQL file against a Supabase project via Management API (no DB password).
 *
 * Env:
 *   SUPABASE_ACCESS_TOKEN
 *   SUPABASE_DEV_PROJECT_REF   used when no --project-ref is passed
 *   SUPABASE_PROD_PROJECT_REF  only used with --allow-production or SUPABASE_ALLOW_PRODUCTION=true
 *
 * Usage:
 *   node scripts/run-sql-management-api.mjs path/to/file.sql [--project-ref <ref>]
 *
 * QA-109: this script used to resolve the project ref as --project-ref, then
 * SUPABASE_PROD_PROJECT_REF, then SUPABASE_DEV_PROJECT_REF. A bare invocation in a
 * shell that had SUPABASE_PROD_PROJECT_REF set therefore ran arbitrary SQL against
 * production. Production now requires an explicit opt-in.
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const API_BASE = 'https://api.supabase.com/v1';
const TRANSIENT_API_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504, 544]);
const MAX_API_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [5000, 10000];

const sqlPath = process.argv.find((arg) => arg.endsWith('.sql'));
const explicitRef = process.argv
  .find((arg, index) => process.argv[index - 1] === '--project-ref')
  ?.trim();
const allowProduction =
  process.argv.includes('--allow-production') ||
  process.env.SUPABASE_ALLOW_PRODUCTION?.trim() === 'true';

const devProjectRef = process.env.SUPABASE_DEV_PROJECT_REF?.trim();
const prodProjectRef = process.env.SUPABASE_PROD_PROJECT_REF?.trim();

let projectRef;
let projectRefSource;

if (explicitRef) {
  projectRef = explicitRef;
  projectRefSource = '--project-ref';
} else if (allowProduction && prodProjectRef) {
  projectRef = prodProjectRef;
  projectRefSource = 'SUPABASE_PROD_PROJECT_REF (production opt-in)';
} else if (devProjectRef) {
  projectRef = devProjectRef;
  projectRefSource = 'SUPABASE_DEV_PROJECT_REF';
}

const accessToken = process.env.SUPABASE_ACCESS_TOKEN?.trim();

if (!accessToken) {
  console.error('SUPABASE_ACCESS_TOKEN is required');
  process.exit(1);
}

if (!projectRef) {
  if (prodProjectRef && !allowProduction) {
    console.error(
      'Refusing to fall back to SUPABASE_PROD_PROJECT_REF (QA-109). Pass --project-ref <ref>, ' +
        'set SUPABASE_DEV_PROJECT_REF, or opt in to production with --allow-production ' +
        '(or SUPABASE_ALLOW_PRODUCTION=true).',
    );
  } else {
    console.error('Set SUPABASE_DEV_PROJECT_REF or pass --project-ref <ref>');
  }
  process.exit(1);
}

if (!sqlPath) {
  console.error('Usage: node scripts/run-sql-management-api.mjs <file.sql> [--project-ref <ref>]');
  process.exit(1);
}

console.log(`Target project: ${projectRef} (resolved from ${projectRefSource})`);

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
