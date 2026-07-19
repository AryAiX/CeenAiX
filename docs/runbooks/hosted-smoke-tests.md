# Hosted Smoke Tests

Use the hosted smoke runner after each dev or prod deployment to verify real browser login and primary portal routes against the deployed app and Supabase project.

## Commands

```bash
npm run smoke:dev
npm run smoke:prod
```

For custom targets:

```bash
SMOKE_BASE_URL=https://preview.example.com npm run smoke:hosted
```

## Required Environment

Set the preview PIN when the deployed domain is gated:

```bash
export SMOKE_PREVIEW_PIN=6969
```

For each role under test, provide credentials. By default the runner tests all hosted portal roles:

```bash
export SMOKE_PATIENT_EMAIL=
export SMOKE_PATIENT_PASSWORD=
export SMOKE_DOCTOR_EMAIL=
export SMOKE_DOCTOR_PASSWORD=
export SMOKE_INSURANCE_EMAIL=
export SMOKE_INSURANCE_PASSWORD=
export SMOKE_LAB_EMAIL=
export SMOKE_LAB_PASSWORD=
export SMOKE_PHARMACY_EMAIL=
export SMOKE_PHARMACY_PASSWORD=
export SMOKE_ADMIN_EMAIL=
export SMOKE_ADMIN_PASSWORD=
export SMOKE_CLINIC_EMAIL=
export SMOKE_CLINIC_PASSWORD=
```

To test a subset:

```bash
SMOKE_ROLES=patient,doctor npm run smoke:dev
```

To include a real LiveKit join/leave check, provide a current virtual appointment ID shared by the smoke patient and doctor:

```bash
export SMOKE_TELEMEDICINE_APPOINTMENT_ID=
```

## Coverage

The runner signs in through the deployed login UI and checks safe, read-oriented routes:

- Patient: dashboard, appointments, insurance, documents
- Doctor: dashboard, appointments, imaging
- Insurance: dashboard, pre-authorizations, claims
- Lab: dashboard, queue, imaging queue
- Pharmacy: dashboard, dispensing, inventory
- Admin: dashboard, users, insurance
- Clinic: dashboard, appointments, patients
- Optional telemedicine: patient and doctor join and leave the same LiveKit room

The smoke fails on empty pages, access-denied states, application error text, browser page errors, or wrong final route paths.
