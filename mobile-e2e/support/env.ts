import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const envFile = join(dirname(fileURLToPath(import.meta.url)), '..', '.env');

if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!match?.[1] || process.env[match[1]] !== undefined) continue;
    process.env[match[1]] = (match[2] ?? '').replace(/^['"]|['"]$/g, '');
  }
}

export const SMOKE_PATIENT = {
  email: process.env.SMOKE_PATIENT_EMAIL ?? 'smoke.patient@ceenaix.test',
  password: process.env.SMOKE_PATIENT_PASSWORD ?? '',
};

export const SMOKE_VIRTUAL_APPOINTMENT_ID = process.env.SMOKE_VIRTUAL_APPOINTMENT_ID ?? '22222222-3333-4333-8444-000000000901';

export const PATIENT_STATE = join(dirname(fileURLToPath(import.meta.url)), '..', '.auth', 'patient.json');
