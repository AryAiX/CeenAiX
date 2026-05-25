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

const runQuery = async (sql) => {
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
    throw new Error(
      `Management API query failed (${response.status}) on ${projectRef}: ${text.slice(0, 4000)}`,
    );
  }

  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
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
