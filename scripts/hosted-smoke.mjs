#!/usr/bin/env node
import { chromium } from '@playwright/test';

const DEFAULT_ROLES = ['patient', 'doctor', 'insurance', 'lab', 'pharmacy', 'admin', 'clinic'];
const DEFAULT_TIMEOUT_MS = 45_000;

const ROLE_CONFIG = {
  patient: {
    loginRole: 'patient',
    envPrefix: 'PATIENT',
    entryPath: '/patient/dashboard',
    routes: [
      ['/patient/dashboard', 'dashboard'],
      ['/patient/appointments', 'appointments'],
      ['/patient/insurance', 'insurance'],
      ['/patient/documents', 'documents'],
    ],
  },
  doctor: {
    loginRole: 'doctor',
    envPrefix: 'DOCTOR',
    entryPath: '/doctor/dashboard',
    routes: [
      ['/doctor/dashboard', 'dashboard'],
      ['/doctor/appointments', 'appointments'],
      ['/doctor/imaging', 'imaging'],
    ],
  },
  insurance: {
    loginRole: 'insurance',
    envPrefix: 'INSURANCE',
    entryPath: '/insurance/dashboard',
    routes: [
      ['/insurance/dashboard', 'dashboard'],
      ['/insurance/pre-authorizations', 'pre-authorizations'],
      ['/insurance/claims', 'claims'],
    ],
  },
  lab: {
    loginRole: 'lab',
    envPrefix: 'LAB',
    entryPath: '/lab/dashboard',
    routes: [
      ['/lab/dashboard', 'dashboard'],
      ['/lab/queue', 'queue'],
      ['/lab/imaging/queue', 'imaging queue'],
    ],
  },
  pharmacy: {
    loginRole: 'pharmacy',
    envPrefix: 'PHARMACY',
    entryPath: '/pharmacy/dashboard',
    routes: [
      ['/pharmacy/dashboard', 'dashboard'],
      ['/pharmacy/dispensing', 'dispensing'],
      ['/pharmacy/inventory', 'inventory'],
    ],
  },
  admin: {
    loginRole: 'admin',
    envPrefix: 'ADMIN',
    entryPath: '/admin/dashboard',
    routes: [
      ['/admin/dashboard', 'dashboard'],
      ['/admin/users', 'users'],
      ['/admin/insurance', 'insurance'],
    ],
  },
  clinic: {
    loginRole: 'clinic',
    envPrefix: 'CLINIC',
    entryPath: '/clinic/dashboard',
    routes: [
      ['/clinic/dashboard', 'dashboard'],
      ['/clinic/appointments', 'appointments'],
      ['/clinic/patients', 'patients'],
    ],
  },
};

const IGNORED_BROWSER_ERROR_PATTERNS = [
  /^TypeError: Failed to fetch\b/,
];

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name) {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : null;
}

function normalizeBaseUrl(value) {
  return value.replace(/\/+$/, '');
}

function parseRoles() {
  const raw = optionalEnv('SMOKE_ROLES');
  if (!raw) return DEFAULT_ROLES;

  const roles = raw.split(',').map((role) => role.trim()).filter(Boolean);
  for (const role of roles) {
    if (!ROLE_CONFIG[role]) {
      throw new Error(`Unknown SMOKE_ROLES entry "${role}". Valid roles: ${DEFAULT_ROLES.join(', ')}`);
    }
  }
  return roles;
}

function credentialsForRole(role) {
  const prefix = ROLE_CONFIG[role].envPrefix;
  return {
    email: requiredEnv(`SMOKE_${prefix}_EMAIL`),
    password: requiredEnv(`SMOKE_${prefix}_PASSWORD`),
  };
}

function isUnexpectedBody(bodyText) {
  return /Application error|Unhandled Runtime Error|Cannot read properties|Access denied|Something went wrong/i.test(bodyText);
}

function isIgnoredBrowserError(message) {
  return IGNORED_BROWSER_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

async function maybePassPreviewGate(page, pin) {
  if (!pin) return;

  const gate = page.getByText(/preview access/i).first();
  if (!(await gate.isVisible({ timeout: 3_000 }).catch(() => false))) {
    return;
  }

  await page.locator('input[type="password"]').fill(pin);
  await page.getByRole('button', { name: /continue/i }).click();
}

async function assertUsablePage(page, path, label) {
  await page.waitForLoadState('domcontentloaded', { timeout: DEFAULT_TIMEOUT_MS });
  await page.locator('body').waitFor({ state: 'visible', timeout: DEFAULT_TIMEOUT_MS });
  await page.waitForFunction(
    () => document.body.innerText.trim().length > 20,
    undefined,
    { timeout: DEFAULT_TIMEOUT_MS }
  );

  const bodyText = ((await page.locator('body').innerText({ timeout: DEFAULT_TIMEOUT_MS })) ?? '').trim();
  if (bodyText.length < 20) {
    throw new Error(`${label} rendered too little content at ${path}.`);
  }

  if (isUnexpectedBody(bodyText)) {
    throw new Error(`${label} rendered an error or access-denied state at ${path}.`);
  }

  const currentUrl = new URL(page.url());
  if (currentUrl.pathname !== path) {
    throw new Error(`${label} expected ${path}, got ${currentUrl.pathname}.`);
  }
}

async function signIn(page, baseUrl, pin, role, credentials) {
  const config = ROLE_CONFIG[role];
  const redirect = encodeURIComponent(config.entryPath);
  await page.goto(`${baseUrl}/auth/login?role=${config.loginRole}&redirect=${redirect}`, {
    waitUntil: 'domcontentloaded',
    timeout: DEFAULT_TIMEOUT_MS,
  });
  await maybePassPreviewGate(page, pin);

  await page.locator('input[type="email"]').waitFor({ state: 'visible', timeout: DEFAULT_TIMEOUT_MS });
  await page.locator('input[type="email"]').fill(credentials.email);
  await page.locator('input[type="password"]').fill(credentials.password);
  await page.getByRole('button', { name: /^sign in$/i }).click();
  await page.waitForURL(new RegExp(`${config.entryPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[?#].*)?$`), {
    timeout: DEFAULT_TIMEOUT_MS,
  });
  await assertUsablePage(page, config.entryPath, `${role} entry`);
}

async function smokeRole(browser, baseUrl, pin, role) {
  const credentials = credentialsForRole(role);
  const config = ROLE_CONFIG[role];
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];

  page.on('pageerror', (error) => {
    if (isIgnoredBrowserError(error.message)) {
      console.warn(`warn ${role}: ignored browser error: ${error.message}`);
      return;
    }
    errors.push(error.message);
  });
  page.on('console', (message) => {
    if (message.type() === 'error') {
      const text = message.text();
      if (isIgnoredBrowserError(text)) {
        console.warn(`warn ${role}: ignored console error: ${text}`);
        return;
      }
      errors.push(text);
    }
  });

  try {
    await signIn(page, baseUrl, pin, role, credentials);
    console.log(`ok ${role}: signed in`);

    for (const [path, label] of config.routes) {
      await page.goto(`${baseUrl}${path}`, { waitUntil: 'domcontentloaded', timeout: DEFAULT_TIMEOUT_MS });
      await assertUsablePage(page, path, `${role} ${label}`);
      console.log(`ok ${role}: ${label}`);
    }

    if (errors.length > 0) {
      throw new Error(`${role} browser errors:\n${errors.join('\n')}`);
    }
  } finally {
    await context.close();
  }
}

async function joinTelemedicineRoom(page, baseUrl, pin, role, appointmentId) {
  const path = `/${role}/telemedicine/${appointmentId}`;
  await page.goto(`${baseUrl}${path}`, { waitUntil: 'domcontentloaded', timeout: DEFAULT_TIMEOUT_MS });
  await maybePassPreviewGate(page, pin);
  await assertUsablePage(page, path, `${role} telemedicine waiting room`);
  await page.getByRole('button', { name: /join video session/i }).click();
  await page.locator('[data-lk-theme="default"]').waitFor({ state: 'visible', timeout: 60_000 });
}

async function leaveTelemedicineRoom(page) {
  const leaveButtons = [
    page.getByRole('button', { name: /leave/i }).last(),
    page.getByRole('button', { name: /disconnect/i }).last(),
    page.getByRole('button', { name: /end/i }).last(),
  ];

  for (const button of leaveButtons) {
    if (await button.isVisible().catch(() => false)) {
      await button.click();
      await page.locator('[data-lk-theme="default"]').waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => {});
      return;
    }
  }

  throw new Error('Unable to find LiveKit leave/disconnect control.');
}

async function smokeTelemedicine(browser, baseUrl, pin, appointmentId) {
  const patientCredentials = credentialsForRole('patient');
  const doctorCredentials = credentialsForRole('doctor');
  const patientContext = await browser.newContext({ permissions: ['camera', 'microphone'] });
  const doctorContext = await browser.newContext({ permissions: ['camera', 'microphone'] });
  const patient = await patientContext.newPage();
  const doctor = await doctorContext.newPage();

  try {
    await signIn(patient, baseUrl, pin, 'patient', patientCredentials);
    await signIn(doctor, baseUrl, pin, 'doctor', doctorCredentials);
    await Promise.all([
      joinTelemedicineRoom(patient, baseUrl, pin, 'patient', appointmentId),
      joinTelemedicineRoom(doctor, baseUrl, pin, 'doctor', appointmentId),
    ]);
    console.log('ok telemedicine: patient and doctor joined');

    await Promise.all([leaveTelemedicineRoom(patient), leaveTelemedicineRoom(doctor)]);
    console.log('ok telemedicine: patient and doctor left');
  } finally {
    await patientContext.close();
    await doctorContext.close();
  }
}

async function main() {
  const baseUrl = normalizeBaseUrl(requiredEnv('SMOKE_BASE_URL'));
  const roles = parseRoles();
  const pin = optionalEnv('SMOKE_PREVIEW_PIN');
  const appointmentId = optionalEnv('SMOKE_TELEMEDICINE_APPOINTMENT_ID');

  const browser = await chromium.launch({
    headless: process.env.SMOKE_HEADLESS !== 'false',
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--autoplay-policy=no-user-gesture-required',
    ],
  });

  try {
    for (const role of roles) {
      await smokeRole(browser, baseUrl, pin, role);
    }

    if (appointmentId && roles.includes('patient') && roles.includes('doctor')) {
      await smokeTelemedicine(browser, baseUrl, pin, appointmentId);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(`Hosted smoke failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
