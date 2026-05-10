# Bug Fixes — `bugs` branch

This document tracks bugs identified and fixed during a systematic codebase audit.
Each bug includes a short identifier, the file affected, a description, and the fix.

## Logical Areas Audited

1. Auth flows (login, register, OTP, forgot password, onboarding)
2. Patient portal pages
3. Doctor portal pages
4. Lab portal pages
5. Pharmacy portal pages
6. Admin & Insurance portals
7. Public pages (Home, FindDoctor, FindClinic, etc.)
8. Hooks and data-fetching layer
9. Shared components (Header, Layout, ErrorBoundary, etc.)
10. Libraries (i18n, supabase, ai, messaging, router)

## Assumptions Made (please review)

- Where a previously truthy fallback (`||`) silently swallowed legitimate `0` / `""` / `false` values, switched to `??` to preserve falsy-but-valid values.
- Where a `.toFixed(2)` or `Number(x)` was applied to potentially `null/undefined`, defaulted to `0` and rendered "—" / "N/A" instead of `NaN`.
- Where dates were parsed without a timezone, treated stored values as ISO UTC strings (matching Supabase defaults).
- Where currency or fee values were used, treated the stored value as the smallest natural unit already in AED (no minor units).
- Where Supabase tables/columns referenced by Bolt code didn't match the canonical schema, the fix only touched obvious null/undefined bugs and left the schema mismatch for the migration tracked in `bolt-code-audit.md`.
- Where i18n strings were missing, added the English string as the default rather than blocking the UI.

## Bugs Fixed

<!-- BUG ENTRIES BELOW -->

### Area 1 — Auth flows

1. **Login: hard-coded English password validation strings.** `src/pages/auth/Login.tsx#handlePasswordRecovery` set `"Use at least 8 characters..."` and `"The new password and confirmation do not match."` directly. Replaced with `t('auth.login.errors.passwordShort')` / `passwordMismatch` and added matching keys to `src/locales/{en,ar}/common.json`.
2. **Login: success message never visible.** The recovery handler set a success banner then synchronously called `navigate(...)`, so the user was redirected before React rendered the message. Now defers the navigation by ~600 ms and uses an i18n key for the success copy.
3. **Login: email field stuck on stale `?email=` param.** `emailFromSignup` was only used as the initial value of `useState`. If the user returned to `/auth/login?email=…` with a different email the field was never updated. Added a `useEffect` that syncs the input when the query param changes.
4. **ForgotPassword: hard-coded English error/success strings.** `"Password reset instructions have been sent to your email."`, `"Password updated successfully..."`, `"Use at least 8 characters..."`, `"The new password and confirmation do not match."`, and placeholder strings `"Create a strong password"` / `"Repeat your new password"` / `"you@example.com"` were inlined. Routed them through `t('auth.forgot.*')` / `t('auth.login.*')` keys and added the missing keys to both locales.
5. **VerifyOTP: hard-coded English error/success strings.** `"We could not identify your verification destination..."`, `"Verification successful. Redirecting..."`, `"Please go back and request a new verification code."` are now `t('auth.otp.*')` keys.
6. **VerifyOTP: wrong verification method when type and identifier mismatch.** The chained `phone ? sms : email ? email : error` branch would verify an SMS-typed code against an email address when only an email was present. Tightened the guard to require `type === 'email'` for the email branch.
7. **Onboarding: `safeString` returned `''` instead of `null`, breaking nullish-coalescing fallbacks.** `safeString(user.user_metadata?.full_name) ?? safeString(user.email) ?? ''` always picked the first call because `''` is not nullish — so the `user.email` fallback never fired. Changed `safeString` to return `null` for empty/non-string values.
8. **Onboarding: "Skip" button caused a redirect loop.** Clicking Skip routed to `getDefaultRouteForRole(activeRole)`, but `ProtectedRoute` immediately sent the user back because `profile_completed` was still `false`. Removed the Skip CTA with an inline comment explaining the constraint.

### Area 2 — Patient portal pages

9. **Dashboard: greeting hard-coded as "Good afternoon" regardless of time.** Now computes the hour and renders "Good morning" / "Good afternoon" / "Good evening" (with Arabic equivalents) in both locale branches.
10. **Dashboard: insurance card faked "DAMAN" branding when no insurer was linked.** Replaced the brand-fallback with localized "No insurer on file" / "لا يوجد مزوّد تأمين" copy.
11. **Dashboard: insurance amounts used `toLocaleString()` without a locale.** Numbers were always formatted with the browser locale, ignoring the active UI language. Passed the resolved locale.
12. **Dashboard: `insuranceProgress` divided by zero / `NaN` when `annualLimitUsed` was null.** Added an `?? 0` to the numerator so the progress bar stays at 0% instead of `NaN%`.
13. **PatientAppointments: ICS file used hard-coded English summary/description.** `SUMMARY:Appointment with …` and `DESCRIPTION:Scheduled consultation` are now passed through `t('patient.appointments.icsSummary')` and `t('shared.scheduledConsultation')`.
14. **PatientAppointments: calendar weekday header was hard-coded `['S','M','T','W','T','F','S']` letters.** Switched to `calendarWeekdayShort(t)[..].charAt(0)` so Arabic users see Arabic initials and other localized weekdays render correctly.
15. **PatientAppointments: tapping a day in the mini-calendar shifted by ~4h.** `selected.toISOString().slice(0,10)` formatted the date in UTC, so users in UTC+04 (UAE) tapping midnight local saw the *previous* calendar day in the filter. Now constructs a local `YYYY-MM-DD` string from the chosen day.
16. **PatientAppointments: `dateFrom`/`dateTo` filter parsing used UTC.** `new Date('2025-01-01')` is UTC midnight, so the range bracket shifted in UAE. Added a local `parseLocal` helper that interprets the picker value in the browser's timezone.

### Area 3 — Doctor portal pages

17. **DoctorDashboard: greeting hard-coded "Good afternoon".** Now hour-aware in both locale branches.
18. **DoctorDashboard: `finishEstimate` hard-coded "~4:00 PM" fallback.** Misled doctors on empty days. Replaced with em-dash.

### Area 7 — Public pages

19. **FindDoctor: doctor ratings randomised on every render.** `rating: 4.2 + Math.random() * 0.8` returned a fresh value every page load, so the star ratings visibly changed without any data change. Replaced with a deterministic hash of the doctor id so each card has a stable pseudo-rating until a real rating column is wired up.
20. **Home: `count.toLocaleString()` ignored UI locale.** Counter values now respect the resolved Arabic / English locale.

### Area 9 — Shared components

21. **Header: brand logo `div` was a non-keyboard accessible click target.** Promoted to a `<button type="button">` with an `aria-label` and focus ring; image `alt` removed (decorative) since the brand text provides the label.
22. **Header: nav buttons missing `type="button"` + active-page semantics.** Added explicit types and `aria-current="page"` on the active route.
23. **Footer: link buttons missing `type="button"` defaulted to "submit".** Set explicit types and made the brand image decorative.
24. **AccessDenied: "Dashboard" button always pointed to `dashboardPath`, which falls through to `/auth/login` for unauthenticated users.** Now branches on `isAuthenticated`, showing a "Sign in" CTA for anonymous visitors, and the chevron flips on RTL.
25. **PatientNotifications: unread count not localized.** Was rendering Western digits in Arabic UI. Now uses `formatLocaleDigits`.

### Area 8 — Hooks and data-fetching layer

26. **useQuery: stale-response race condition + unmount setState warning.** When dependencies changed faster than the request returned, the older response could overwrite the newer one. Added a per-request id + mounted ref so only the latest in-flight result reaches state, and nothing fires after unmount.
27. **useCounter: snap on `NaN` / negative targets.** `target / (duration / 16)` could become `Infinity` / `NaN` (e.g. `useCounter(0, true)` or stat = `null` cast to `Number`), which surfaced as `NaN` in the UI. Now guards non-finite & non-positive targets up-front and uses `Math.max(1, Math.round(...))` for the step count.
28. **useUserProfile: `.single()` threw `PGRST116` for users without a profile row.** First login after signup would crash the patient/doctor dashboard. Switched to `.maybeSingle()` and coerced missing rows to `null`.

### Area 10 — Libraries

29. **useMessagingHub: hard-coded English fallbacks/errors leaked to the UI.** `'Care team'`, `'Unable to load conversations.'`, `'Unable to load messages.'`, `'Unable to start this conversation.'`, `'Unable to send message.'` were rendered to Arabic users. The hook now calls `i18n.t('messaging.*', { defaultValue })`, with both locale dictionaries updated. The `actionError` banner in `MessagesWorkspace` (which renders the raw string) now also receives Arabic copy by default.

### Area 7 — Public pages (continued)

30. **Home: portal carousel `setInterval` runs while tab is hidden.** Wastes battery on backgrounded tabs. Pauses on `visibilitychange` and resumes when the tab is foregrounded again.

### Area 1 — Auth flows (continued)

31. **auth-context: null reference on Supabase insert error.** `userProfileInsertError.message.toLowerCase()` would throw if Supabase ever returned an error without a string `message`, kicking the user out of session bootstrap on first login. Made the message check null-safe.
