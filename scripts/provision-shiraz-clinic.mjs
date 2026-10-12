#!/usr/bin/env node
/**
 * One-off provisioning for Shiraz Medical Center on the DEV project only.
 *
 * Creates (or reuses):
 *   - the clinic login + user_profiles(role = 'clinic')
 *   - the "Shiraz Medical Center" facility + clinic_portal_members(clinic_admin)
 *   - one confirmed login per row of the CSV, with user_profiles(role = 'doctor'),
 *     doctor_profiles (license, expiry, specialization), doctor_specializations
 *     and facility_staff linking the doctor to the clinic.
 *
 * Safe to re-run: existing accounts and rows are reused, never duplicated.
 * Dry run by default. Nothing is written unless --apply is passed.
 *
 * Usage (PowerShell):
 *   $env:SUPABASE_URL="https://lgfaucsfiyxvmsghnpey.supabase.co"
 *   $env:SUPABASE_SERVICE_ROLE_KEY="<service role key, dev project>"
 *   $env:SHIRAZ_PASSWORD="<shared password>"
 *   node scripts/provision-shiraz-clinic.mjs --csv C:\path\to\shiraz_doctors_dev.csv
 *   node scripts/provision-shiraz-clinic.mjs --csv C:\path\to\shiraz_doctors_dev.csv --apply
 *
 * No data, keys or passwords are stored in this file.
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const DEV_PROJECT_REF = 'lgfaucsfiyxvmsghnpey';
const CLINIC = {
  email: 'admin@shirazmedical.ae',
  fullName: 'Shiraz Medical Center Admin',
  firstName: 'Shiraz',
  lastName: 'Admin',
  facilityName: 'Shiraz Medical Center',
  facilityNameAr: 'مركز شيراز الطبي',
  city: 'Dubai',
  address: 'Dubai, UAE',
};
// Positions that are not physicians or dentists: no "Dr." title for these.
const NON_DOCTOR_POSITIONS = [
  'allied health technologist',
  'radiology technologist',
  'sonographer',
  'aesthetician',
];

// ---------- arguments and environment ----------
const args = process.argv.slice(2);
const apply = args.includes('--apply');
const csvIndex = args.indexOf('--csv');
const csvPath = csvIndex >= 0 ? args[csvIndex + 1] : null;

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.SHIRAZ_PASSWORD;

function fail(message) {
  console.error(`\nSTOPPED: ${message}\n`);
  process.exit(1);
}

if (!csvPath) fail('pass the doctors file with --csv <path>.');
if (!url || !serviceKey) fail('set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
let urlHost = '';
try { urlHost = new URL(url).hostname; } catch { fail('SUPABASE_URL is not a valid address.'); }
if (urlHost !== `${DEV_PROJECT_REF}.supabase.co`) {
  fail(`SUPABASE_URL is not the dev project (${DEV_PROJECT_REF}). This script only runs against dev.`);
}
if (apply && (!password || password.length < 8)) fail('set SHIRAZ_PASSWORD (8+ characters) before --apply.');

// ---------- CSV ----------
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field); field = '';
      if (row.some((v) => v !== '')) rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field !== '' || row.length) { row.push(field); if (row.some((v) => v !== '')) rows.push(row); }
  const [header, ...body] = rows;
  return body.map((values) => Object.fromEntries(header.map((h, i) => [h.trim(), (values[i] ?? '').trim()])));
}

const doctors = parseCsv(readFileSync(csvPath, 'utf8').replace(/^\uFEFF/, ''));
const required = ['full_name', 'position', 'specialization', 'dha_license_number', 'dha_license_expiry', 'email'];
for (const [i, d] of doctors.entries()) {
  for (const key of required) if (!d[key]) fail(`row ${i + 2}: missing "${key}".`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.dha_license_expiry)) fail(`row ${i + 2}: expiry must be YYYY-MM-DD.`);
}
const emails = doctors.map((d) => d.email.toLowerCase());
if (new Set(emails).size !== emails.length) fail('the CSV has duplicate emails.');

// ---------- Supabase ----------
const db = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const today = new Date().toISOString().slice(0, 10);
const summary = { createdLogins: 0, reusedLogins: 0, skipped: [], linked: 0 };

async function must(promise, what) {
  const { data, error } = await promise;
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
}

// Existing accounts are found through user_profiles by email. Supabase's
// "list users" admin call is not used: on dev it fails with
// "Database error finding users" because of older seeded logins.
async function findUserIdByEmail(email) {
  const rows = await must(
    db.from('user_profiles').select('user_id').ilike('email', email).limit(2),
    `looking up ${email}`,
  );
  if (rows.length > 1) throw new Error(`${email} matches more than one profile. Left unchanged.`);
  return rows[0]?.user_id ?? null;
}

async function ensureLogin({ email, role, fullName, firstName, lastName }) {
  const existingId = await findUserIdByEmail(email);
  if (existingId) { summary.reusedLogins += 1; return existingId; }
  if (!apply) { summary.createdLogins += 1; return null; }
  const { data, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role },
    user_metadata: { role, full_name: fullName, first_name: firstName, last_name: lastName },
  });
  if (error) {
    if (/already|registered|exists/i.test(error.message)) {
      throw new Error(`a login for ${email} already exists but has no profile. Left unchanged.`);
    }
    throw new Error(`creating login ${email}: ${error.message}`);
  }
  summary.createdLogins += 1;
  return data.user.id;
}

async function ensureUserProfile(userId, { email, role, fullName, firstName, lastName }) {
  const existing = await must(
    db.from('user_profiles').select('user_id, role').eq('user_id', userId).maybeSingle(),
    `reading profile ${email}`,
  );
  if (existing) {
    if (existing.role !== role) throw new Error(`${email} already exists with role "${existing.role}", not "${role}". Left unchanged.`);
    return;
  }
  await must(
    db.from('user_profiles').insert({
      user_id: userId,
      role,
      full_name: fullName,
      first_name: firstName,
      last_name: lastName,
      email,
      city: CLINIC.city,
      profile_completed: true,
      terms_accepted: true,
      account_status: 'active',
    }),
    `creating profile ${email}`,
  );
}

function titleFor(position) {
  const p = position.toLowerCase();
  return NON_DOCTOR_POSITIONS.some((n) => p.includes(n)) ? '' : 'Dr. ';
}

async function main() {
  console.log(`\n${apply ? 'APPLYING' : 'DRY RUN (nothing will be written)'} on ${url}`);
  console.log(`${doctors.length} doctors in ${csvPath}\n`);

  // Specializations lookup
  const specs = await must(db.from('specializations').select('id, name').eq('is_active', true), 'reading specializations');
  const specByName = new Map(specs.map((s) => [s.name.toLowerCase(), s.id]));
  const unknown = [...new Set(doctors.map((d) => d.specialization))].filter((n) => !specByName.has(n.toLowerCase()));
  if (unknown.length) fail(`specializations not found in the app: ${unknown.join(', ')}`);

  // The expiry column must exist (migration applied first)
  const { error: expiryColumnError } = await db.from('doctor_profiles').select('dha_license_expiry').limit(1);
  if (expiryColumnError) fail('doctor_profiles.dha_license_expiry is missing. Apply the migration on dev first.');

  // ----- Clinic login, facility, membership -----
  const clinicUserId = await ensureLogin({
    email: CLINIC.email, role: 'clinic', fullName: CLINIC.fullName, firstName: CLINIC.firstName, lastName: CLINIC.lastName,
  });
  let facilityId = null;
  const existingFacility = await must(
    db.from('facilities').select('id').eq('name', CLINIC.facilityName).eq('is_deleted', false).maybeSingle(),
    'reading facility',
  );
  if (existingFacility) facilityId = existingFacility.id;

  if (apply) {
    await ensureUserProfile(clinicUserId, {
      email: CLINIC.email, role: 'clinic', fullName: CLINIC.fullName, firstName: CLINIC.firstName, lastName: CLINIC.lastName,
    });
    if (!facilityId) {
      const created = await must(
        db.from('facilities').insert({
          name: CLINIC.facilityName,
          name_en: CLINIC.facilityName,
          name_ar: CLINIC.facilityNameAr,
          facility_type: 'clinic',
          address: CLINIC.address,
          city: CLINIC.city,
          email: CLINIC.email,
          is_active: true,
        }).select('id').single(),
        'creating facility',
      );
      facilityId = created.id;
    }
    await must(
      db.from('clinic_portal_members').upsert(
        { facility_id: facilityId, user_id: clinicUserId, portal_role: 'clinic_admin', is_active: true },
        { onConflict: 'facility_id,user_id' },
      ),
      'linking clinic admin',
    );
  }
  console.log(`Clinic: ${CLINIC.facilityName} (${facilityId ?? 'to be created'}), login ${CLINIC.email}`);

  // ----- Doctors -----
  for (const d of doctors) {
    const email = d.email.toLowerCase();
    const [firstName, ...rest] = d.full_name.split(/\s+/);
    const lastName = rest.join(' ');
    const fullName = `${titleFor(d.position)}${d.full_name}`;
    const verified = d.dha_license_expiry >= today;
    try {
      const userId = await ensureLogin({ email, role: 'doctor', fullName, firstName, lastName });
      if (!apply) { console.log(`  would set up  ${email}  (${d.specialization})`); continue; }

      await ensureUserProfile(userId, { email, role: 'doctor', fullName, firstName, lastName });

      const doctorFields = {
        license_number: d.dha_license_number,
        dha_license_expiry: d.dha_license_expiry,
        specialization: d.specialization,
        dha_license_verified: verified,
        dha_verified_at: verified ? new Date().toISOString() : null,
      };
      const existingDoctor = await must(
        db.from('doctor_profiles').select('id').eq('user_id', userId).maybeSingle(),
        `reading doctor profile ${email}`,
      );
      if (existingDoctor) {
        await must(db.from('doctor_profiles').update(doctorFields).eq('id', existingDoctor.id), `updating doctor profile ${email}`);
      } else {
        await must(db.from('doctor_profiles').insert({ user_id: userId, ...doctorFields }), `creating doctor profile ${email}`);
      }

      await must(
        db.from('doctor_specializations').upsert(
          { doctor_user_id: userId, specialization_id: specByName.get(d.specialization.toLowerCase()) },
          { onConflict: 'doctor_user_id,specialization_id', ignoreDuplicates: true },
        ),
        `linking specialization ${email}`,
      );

      await must(
        db.from('facility_staff').upsert(
          {
            facility_id: facilityId,
            doctor_user_id: userId,
            invitation_status: 'active',
            invitation_email: email,
            clinic_managed_pricing: true,
            is_available: true,
            is_active: true,
          },
          { onConflict: 'facility_id,doctor_user_id' },
        ),
        `linking ${email} to the clinic`,
      );
      summary.linked += 1;
      console.log(`  ok  ${email}`);
    } catch (err) {
      summary.skipped.push(`${email}: ${err.message}`);
      console.log(`  SKIPPED  ${email}: ${err.message}`);
    }
  }

  console.log('\nSummary');
  console.log(`  logins ${apply ? 'created' : 'to create'}: ${summary.createdLogins}`);
  console.log(`  logins already existing: ${summary.reusedLogins}`);
  if (apply) console.log(`  doctors linked to the clinic: ${summary.linked}`);
  console.log(`  skipped: ${summary.skipped.length}`);
  for (const s of summary.skipped) console.log(`    - ${s}`);
  if (!apply) console.log('\nDry run only. Re-run with --apply to write.');
  process.exit(summary.skipped.length ? 2 : 0);
}

main().catch((err) => fail(err.message));
