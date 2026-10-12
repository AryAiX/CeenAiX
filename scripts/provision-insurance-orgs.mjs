#!/usr/bin/env node
/**
 * One-off provisioning of insurance company accounts on the DEV project only.
 *
 * For each company in INSURERS it creates (or reuses):
 *   - organizations row (kind = 'insurance', status = 'active')
 *   - a confirmed login + user_profiles(role = 'insurance', onboarding done)
 *   - exactly one organization_members row linking the login to its company
 *
 * Safe to re-run: existing rows are reused, never duplicated.
 * Dry run by default. Nothing is written unless --apply is passed.
 *
 * Usage (PowerShell):
 *   $env:SUPABASE_URL="https://lgfaucsfiyxvmsghnpey.supabase.co"
 *   $env:SUPABASE_SERVICE_ROLE_KEY="<service role key, dev project>"
 *   $env:INSURANCE_PASSWORD="<shared password>"
 *   node scripts/provision-insurance-orgs.mjs
 *   node scripts/provision-insurance-orgs.mjs --apply
 *
 * No keys or passwords are stored in this file.
 */
import { createClient } from '@supabase/supabase-js';

const DEV_PROJECT_REF = 'lgfaucsfiyxvmsghnpey';
const EMAIL_DOMAIN = 'insurance.ceenaix.test';
const CITY = 'Dubai';
const ROLE_TITLE = 'Insurance Operator';

// name: display name; slug: organizations.slug and email local part source
const INSURERS = [
  { name: 'Almadallah', slug: 'almadallah' },
  { name: 'Dubai Care', slug: 'dubai-care' },
  { name: 'HTH', slug: 'hth' },
  { name: 'Inayah', slug: 'inayah' },
  { name: 'Khat Al Haya', slug: 'khat-al-haya' },
  { name: 'MedNet', slug: 'mednet' },
  { name: 'MetLife', slug: 'metlife' },
  { name: 'MSH', slug: 'msh' },
  { name: 'NAS', slug: 'nas' },
  { name: 'Neuron', slug: 'neuron' },
  { name: 'NextCare', slug: 'nextcare' },
  { name: 'SAICO', slug: 'saico' },
];

// ---------- arguments and environment ----------
const apply = process.argv.slice(2).includes('--apply');
const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.INSURANCE_PASSWORD;

function fail(message) {
  console.error(`\nSTOPPED: ${message}\n`);
  process.exit(1);
}

if (!url || !serviceKey) fail('set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
let urlHost = '';
try { urlHost = new URL(url).hostname; } catch { fail('SUPABASE_URL is not a valid address.'); }
if (urlHost !== `${DEV_PROJECT_REF}.supabase.co`) {
  fail(`SUPABASE_URL is not the dev project (${DEV_PROJECT_REF}). This script only runs against dev.`);
}
if (apply && (!password || password.length < 8)) fail('set INSURANCE_PASSWORD (8+ characters) before --apply.');

const db = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const summary = { orgsCreated: 0, orgsReused: 0, loginsCreated: 0, loginsReused: 0, linked: 0, skipped: [] };

async function must(promise, what) {
  const { data, error } = await promise;
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
}

const emailFor = (slug) => `${slug.replace(/-/g, '')}@${EMAIL_DOMAIN}`;

// Supabase's "list users" admin call fails on dev ("Database error finding
// users"), so existing logins are found through user_profiles by email.
async function findProfileByEmail(email) {
  const rows = await must(
    db.from('user_profiles').select('user_id, role').ilike('email', email).limit(2),
    `looking up ${email}`,
  );
  if (rows.length > 1) throw new Error(`${email} matches more than one profile. Left unchanged.`);
  return rows[0] ?? null;
}

async function ensureOrganization(insurer) {
  const existing = await must(
    db.from('organizations').select('id, kind, status').eq('slug', insurer.slug).maybeSingle(),
    `reading organization ${insurer.slug}`,
  );
  if (existing) {
    if (existing.kind !== 'insurance') {
      throw new Error(`organization "${insurer.slug}" already exists as kind "${existing.kind}". Left unchanged.`);
    }
    summary.orgsReused += 1;
    return existing.id;
  }
  if (!apply) { summary.orgsCreated += 1; return null; }
  const created = await must(
    db.from('organizations').insert({
      slug: insurer.slug,
      name: insurer.name,
      kind: 'insurance',
      city: CITY,
      country: 'AE',
      primary_contact_email: emailFor(insurer.slug),
      status: 'active',
      notes: 'Dev test account created by scripts/provision-insurance-orgs.mjs',
    }).select('id').single(),
    `creating organization ${insurer.slug}`,
  );
  summary.orgsCreated += 1;
  return created.id;
}

async function ensureLogin(insurer, email) {
  const profile = await findProfileByEmail(email);
  if (profile) {
    if (profile.role !== 'insurance') {
      throw new Error(`${email} already exists with role "${profile.role}", not "insurance". Left unchanged.`);
    }
    summary.loginsReused += 1;
    return profile.user_id;
  }
  if (!apply) { summary.loginsCreated += 1; return null; }

  const fullName = `${insurer.name} Admin`;
  const { data, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: 'insurance' },
    user_metadata: { role: 'insurance', full_name: fullName, first_name: insurer.name, last_name: 'Admin' },
  });
  if (error) {
    if (/already|registered|exists/i.test(error.message)) {
      throw new Error(`a login for ${email} already exists but has no profile. Left unchanged.`);
    }
    throw new Error(`creating login ${email}: ${error.message}`);
  }
  const userId = data.user.id;
  await must(
    db.from('user_profiles').insert({
      user_id: userId,
      role: 'insurance',
      full_name: fullName,
      first_name: insurer.name,
      last_name: 'Admin',
      email,
      city: CITY,
      profile_completed: true,
      terms_accepted: true,
      account_status: 'active',
    }),
    `creating profile ${email}`,
  );
  summary.loginsCreated += 1;
  return userId;
}

async function ensureMembership(orgId, userId, email) {
  const memberships = await must(
    db.from('organization_members').select('organization_id').eq('user_id', userId),
    `reading memberships ${email}`,
  );
  const others = memberships.filter((m) => m.organization_id !== orgId);
  if (others.length) {
    throw new Error(`${email} already belongs to another organization; the portal needs exactly one. Left unchanged.`);
  }
  if (memberships.length === 0) {
    await must(
      db.from('organization_members').insert({ organization_id: orgId, user_id: userId, role_title: ROLE_TITLE }),
      `linking ${email}`,
    );
  }
  summary.linked += 1;
}

async function main() {
  console.log(`\n${apply ? 'APPLYING' : 'DRY RUN (nothing will be written)'} on ${url}`);
  console.log(`${INSURERS.length} insurance companies\n`);

  for (const insurer of INSURERS) {
    const email = emailFor(insurer.slug);
    try {
      const orgId = await ensureOrganization(insurer);
      const userId = await ensureLogin(insurer, email);
      if (!apply) { console.log(`  would set up  ${insurer.name.padEnd(14)} ${email}`); continue; }
      await ensureMembership(orgId, userId, email);
      console.log(`  ok  ${insurer.name.padEnd(14)} ${email}`);
    } catch (err) {
      summary.skipped.push(`${insurer.name}: ${err.message}`);
      console.log(`  SKIPPED  ${insurer.name}: ${err.message}`);
    }
  }

  console.log('\nSummary');
  console.log(`  companies ${apply ? 'created' : 'to create'}: ${summary.orgsCreated}`);
  console.log(`  companies already existing: ${summary.orgsReused}`);
  console.log(`  logins ${apply ? 'created' : 'to create'}: ${summary.loginsCreated}`);
  console.log(`  logins already existing: ${summary.loginsReused}`);
  if (apply) console.log(`  logins linked to their company: ${summary.linked}`);
  console.log(`  skipped: ${summary.skipped.length}`);
  for (const s of summary.skipped) console.log(`    - ${s}`);
  if (!apply) console.log('\nDry run only. Re-run with --apply to write.');
  process.exit(summary.skipped.length ? 2 : 0);
}

main().catch((err) => fail(err.message));
