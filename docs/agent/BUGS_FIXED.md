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

### Area 8 — Hooks and data-fetching layer (continued)

32. **useBookableDoctors: hard-coded English "Doctor" fallback.** Now resolves to `shared.doctor` (already translated).
33. **usePatientDashboard: hard-coded English "Care Team Clinician" / "Care Team" / "Active prescription" / "Insurance Provider" / "Patient Plan" / "Upcoming appointment scheduled" / "Next with {name}" fallbacks.** All routed through new `patient.dashboard.*` and `messaging.careTeamFallback` keys in both locales.
34. **useDoctorDashboard: hard-coded English "Patient" fallback used in 5 places.** Routed through `shared.patient`.
35. **usePatientPrescriptions: hard-coded English "Doctor" fallback in 2 places.** Routed through `shared.doctor`.
36. **useDoctorPrescriptions: hard-coded English "Patient" fallback in 2 places.** Routed through `shared.patient`.
37. **usePreVisit: hard-coded English "Doctor" fallback in 3 places.** Routed through `shared.doctor`.
38. **usePatientAiChat: hard-coded English "Doctor" fallback.** Routed through `shared.doctor`.
39. **usePatientNotifications: hard-coded English titles/bodies ("New message from", "Upcoming visit with", "New lab results from", "Your care team", "Open the thread to review...", "Review the appointment detail..."), all rendered to Arabic users.** Now all routed through new `patient.notifications.*` keys in both locales.
40. **useDoctorNotifications: same problem — "New message from", "Open the thread...", "{patient} completed pre-visit intake", "{patient} updated chart information", body texts.** Routed through new `doctor.notifications.*` keys in both locales.
41. **useDoctorPatients: hard-coded English "Insurance on file" fallback.** Routed through `doctor.patients.insuranceOnFile`.
42. **usePharmacyPrescriptionQueue: hard-coded English "Linked dispensing task" fallback.** Routed through `pharmacy.queue.linkedDispensingTask`.

### Area 9 — Shared components (continued)

43. **ErrorBoundary: fallback UI hard-coded in English.** "Something went wrong", "An unexpected error occurred.", "Try again" rendered to Arabic users. Extracted a functional `DefaultErrorFallback` that pulls `errorBoundary.*` keys via `useTranslation`, added type="button" on the retry CTA.
44. **ChatbotButton: tooltip and aria-label hard-coded in English.** Routed through new `chatbot.tooltip` / `chatbot.ariaOpen` keys; added `type="button"`.
45. **AuthShell: copyright string hard-coded in English with a frozen 2026 year.** Replaced with `t('auth.shell.copyright', { year })` using the current year, with Arabic translation added.
46. **LanguageSwitcher: `aria-label` hard-coded in English.** Routed through `language.switcherAriaLabel` key.
47. **PortalShell: doctor sidebar collapse/expand `aria-label` + `title` hard-coded in English.** Routed through new `portalShell.collapseSidebar` / `expandSidebar` / `collapse` / `expand` keys.

### Area 3 — Doctor portal pages (continued)

48. **DoctorAppointments: hard-coded fake clinic name "Al Noor Medical Center — Cardiology Suite" shown to every doctor.** Misleading because it doesn't reflect the actual clinic the doctor is linked to. Now uses `doctorProfile?.specialization` when available, falling back to the localized `doctor.appointments.subtitle` ("Manage your patient schedule").
49. **DoctorAppointments: month no-show rate divided by total appointments instead of month's.** `monthNoShows / appointments.length` was incorrect — `monthNoShows` is filtered by the current month but the denominator was *all* appointments ever, leading to artificially low rates as historical data grew. Now divides by the count of appointments scheduled in that same month.
50. **DoctorMessages: hard-coded English "Encrypted" badge + non-functional "Mark all read" + visual-only filter chips.** The "Mark all read" button had no handler and the `['All','Patients','Doctors','Pharmacy','Labs']` chips never filtered anything. Removed the dead controls, localized the encrypted badge through new `doctor.messages.encrypted` key.
51. **DoctorNotifications: unread count rendered with Western digits in Arabic UI.** Now formatted via `formatLocaleDigits`.
52. **DoctorSchedule: `getTodayDate()` used `new Date().toISOString().slice(0,10)`, which is UTC.** In UAE (UTC+04) the date input's `min` and default could be the previous day for late-night users, allowing a doctor to schedule "today" against yesterday's date. Now formats the local `YYYY-MM-DD`.
53. **DoctorSchedule: hard-coded English error/success copy in form handlers** (`"You need to be signed in as a doctor to manage availability."`, etc). Routed through new `doctor.schedule.*` keys with English defaults.

### Area 2 — Patient portal pages (continued)

54. **PatientAppointments: teleconsult countdown rendered with hard-coded English `h`/`m`/`s` units and Western digits.** Now uses `formatLocaleDigits` and i18n keys (`shared.hourShort` / `minuteShort` / `secondShort`) so the live countdown reads correctly in Arabic.

### Area 8 — Hooks and data-fetching layer (continued)

55. **useDoctorSchedule: today filter for `blocked_date` used UTC ISO date.** Same UAE timezone shift as above — late-night users could see yesterday's blocks treated as past. Now formats `today` from local `getFullYear`/`getMonth`/`getDate`.
56. **useDoctorBookingAvailability: blocked-slot range filter used UTC ISO date** for `gte` / `lte`. Same fix — local date formatting helper added.
57. **usePatientDashboard: insurance "today" key computed in UTC.** Could shift policy validity comparisons by ~4h. Now uses local-date formatting.

### Area 9 — Shared components (continued)

58. **AccountSecurityPanel: Update / Delete buttons missing `type="button"`.** Defaulted to "submit" if nested under any form. Added explicit types.

### Area 1 — Auth flows (continued)

59. **Register: input icons and padding used physical `left-3` / `pl-9 pr-3`, breaking layout in Arabic RTL.** All six form fields now use logical Tailwind classes (`start-3` / `ps-9 pe-3`) so the icon and content properly mirror.
60. **Register: Back / Continue arrows did not flip in RTL.** Added `rtl:rotate-180` to `<ArrowLeft />` / `<ArrowRight />`.
61. **Register: signup error handler crashed on null `error.message`.** `error.message.trim()` would throw if Supabase ever returned an error without a `message`. Now reads through `?? ''` and falls back to a localized generic error.

### Area 2 — Patient portal pages (continued)

62. **Records: vaccination "dose number" field accepted negative numbers and silently inserted them.** `Number("-3")` is finite but invalid. Added validation; surfaces a localized error before insert.
63. **Records: Search/Filter icons not mirrored in RTL.** Added `rtl:` overrides.
64. **TelemedicineConsultation: header `<ArrowLeft />` didn't flip in RTL.** Added `rtl:rotate-180`.

### Area 3 — Doctor portal pages (continued)

65. **ConsultationWorkspace: header `<ArrowLeft />` didn't flip in RTL.** Added `rtl:rotate-180`.
66. **Imaging: search icon not mirrored.** Added `rtl:left-auto rtl:right-3`.

### Area 5 — Pharmacy portal pages

67. **Inventory: search icon not mirrored.** Added `rtl:` overrides.
68. **Dispensing: search icon not mirrored.** Added `rtl:` overrides.

### Area 7 — Public pages (continued)

69. **Home: hero / feature / portal carousel `<ArrowRight />` icons didn't flip in RTL.** Added `rtl:rotate-180` (and inverted the hover translate so the icon still slides toward the page-end direction in Arabic).
70. **HealthEducation: article CTA `<ArrowRight />` didn't flip in RTL.** Added `rtl:rotate-180`.

### Area 8 — Hooks and data-fetching layer (continued)

71. **useDoctorPatients: hard-coded English "Patient" fallback.** Routed through `shared.patient`.

### Area 2 — Patient portal pages (continued)

72. **BookAppointment: doctor-search input + icon not mirrored in RTL.** Added `rtl:` overrides for padding and the magnifier icon position.

### Area 10 — Libraries (continued)

73. **i18n-ui.formatRelativeTime: negative diff (future timestamps) rendered as "1m ago".** Future timestamps would slip through `Math.max(1, Math.round(diffMs / 60000))` because the negative `diffMs` was never absolutised, producing "1m ago" for arbitrary future events. Now `Math.abs`-es the delta and uses `Math.floor` for hours/days so future times also display sensibly as their absolute relative duration.
74. **auth-error-messages: OTP request/verify errors hard-coded in English.** `"We could not sign you in..."`, `"That code is no longer valid."`, etc were always English. Imported the `i18n` singleton and routed copy through new `auth.errors.otpUnknownPhone` / `otpNetwork` / `otpExpired` keys.
75. **messaging: `DEFAULT_CARE_CONVERSATION_SUBJECT` was a frozen English string.** New conversations would always be subject = "Care conversation", even when both participants were Arabic-speaking. Added `getDefaultCareConversationSubject()` that resolves to the active i18n locale, and updated `useMessagingHub` to call it.
76. **messaging: action fallback labels (booking/appointments/records) hard-coded in English.** Now routed through new `messaging.actionBookingLink` / `actionAppointmentsLink` / `actionRecordsLink` / `actionCareDefault` keys.

### Area 5 — Pharmacy portal pages (continued)

77. **PharmacyDashboard: `formatNumber` called `value.toLocaleString()` without a locale.** Stat tiles and counts used the browser's default locale rather than the active UI language, so Arabic users saw Western digits. `formatNumber` now accepts `language` and delegates to `formatLocaleDigits`.
78. **PharmacyDispensing: same `toLocaleString()` issue across queue/inventory metrics.** Same fix applied.
79. **PharmacyInventory: same `toLocaleString()` issue across stat tiles, filter counts, and stock columns.** Same fix applied.
80. **PharmacyReports: completely hard-coded English (headings, KPI labels, status badges, fallback "Pharmacy" name, date).** Routed all copy through `pharmacy.reports.*` keys with Arabic translations and added `type="button"` on the export buttons. Numeric values now go through `formatLocaleDigits`.
81. **PharmacyRevenue: similar problem — every label was English, currency formatted with hard-coded `en-AE`.** Refactored into `pharmacy.revenue.*` keys (incl. CLDR plural forms for the helper counts), and the AED currency formatter now honours the active i18n locale (Arabic-Indic digits for `ar`).
82. **PharmacyInventory: 'Pharmacy' fallback and date were English-only.** Now uses `pharmacy.reports.fallbackName` and `toLocaleDateString(uiLang)`.
83. **PharmacyProfile: large block of hard-coded English copy (badges, field labels, staff/credentials, operations panel).** Migrated to `pharmacy.profile.*` keys with Arabic translations; counts now use `formatLocaleDigits` and dates use `toLocaleDateString(uiLang)`.
84. **PharmacySettings: title, subtitle, 'Notifications/DHA Compliance/NABIDH Sync' status cards, and toggle button aria-label were hard-coded English.** Routed through `pharmacy.settings.*` keys.
85. **PharmacyMessages: title/subtitle/sidebar copy + status/kind badges + placeholder + send-message aria-label were hard-coded English.** Localized via `pharmacy.messages.*` and fixed a potential null-deref crash when `messages` is empty (`selected.type` was accessed unguarded) — now renders an empty state.
86. **PharmacySettings: toggle thumb used physical `translate-x` classes** so the position broke in Arabic RTL. Added `rtl:-translate-x-*` overrides so the thumb tracks correctly in both directions.

### Area 3 — Doctor portal pages (continued)

87. **DoctorEarnings: KPI tile labels, tab labels, placeholder body, today's-revenue heading + empty state, status badges, and footer note were hard-coded English.** All routed through `doctor.earnings.*` keys; appointment status now uses the shared `shared.appointmentStatus.*` translations.
88. **DoctorSettings: 11-item left-side navigation labels were hard-coded English; settings placeholder body and 5 toggle rows (title/body) were hard-coded English.** Migrated to `doctor.settings.*` keys; navigation now also exposes `aria-current` for the active section.
89. **DoctorSettings: toggle thumb positioning broken in Arabic RTL.** `left-6` / `left-1` swapped for logical `start-6` / `start-1`.
90. **DoctorPatients: 'No insurance', 'No active conditions', 'No visits', 'Not scheduled', 'Unknown', 'Today', 'Acknowledge', 'Open Record', 'Last Visit', 'Next Appt', pagination caption + sort labels were hard-coded English.** Routed through new `doctor.patients.*` keys.
91. **DoctorImaging: imaging-worklist heading, tabs, KPI tiles, search placeholder, 'All modalities' option, empty state, error banner, footer note, and status badges hard-coded.** Localized via `doctor.imaging.*` keys; status badges defer to `shared.labOrderItemStatus.*`.
92. **DoctorSchedule: two `window.confirm()` dialogs ('Delete this recurring availability window?' and 'Remove this blocked time…') plus 'Availability activated/paused' success banners were hard-coded English.** Localized via `doctor.schedule.*` keys.

### Area 2 — Patient portal pages (continued)

93. **PreVisitAssessment: textarea/input placeholders 'Type your answer', 'Autofilled from your record' badge, and Yes/No boolean buttons were hard-coded English.** Localized via `patient.preVisit.*` + new `shared.yes` / `shared.no` keys.
94. **PatientAppointments: calendar previous/next-month buttons had hard-coded English `aria-label`s.** Routed through new `shared.previousMonth` / `shared.nextMonth` keys.
95. **PatientSettings: toggle thumb positioning broken in Arabic RTL.** Same physical-to-logical class fix.

### Area 9 — Shared components (continued)

96. **OpsShell: header back button had a hard-coded `aria-label="Back"`.** Routed through the shared `pageHeader.goBack` key.

### Area 8 — Hooks and data-fetching layer (continued)

97. **useQuery: error fallback string 'An unknown error occurred' was English-only.** Now uses `i18n.t('shared.errors.unknown', ...)` so Arabic users get translated copy when a thrown value isn't an Error.
98. **useDoctorPortalChrome: 'Patient' fallback for the active-consultation patient name was English-only.** Routed through `shared.patient`.
99. **useDoctorLabOrders: two `'Patient'` fallbacks rendered in the doctor portal were English-only.** Routed through `shared.patient`.

### Area 10 — Libraries (continued)

100. **lib/messaging.ts: `DEFAULT_CARE_CONVERSATION_SUBJECT` was a captured English literal.** Added `getDefaultCareConversationSubject()` resolved at call-time via i18n, and updated `useMessagingHub.startDirectConversationWith` to use it.
101. **lib/ai.ts: 'AI chat returned an invalid response.' and 'AI document analysis returned an invalid response.' throw messages were English-only.** Routed through `ai.errors.*` keys.
102. **lib/canonical-record-updates.ts: 'Unable to apply those record updates right now.' / 'Unable to dismiss those updates right now.' were English-only.** Routed through `records.errors.*` keys.
103. **lib/medication-enrichment.ts: 'Medication enrichment returned an invalid response.' English-only.** Routed through `ai.errors.invalidMedEnrichment`.

### Area 9 — Shared components (continued)

104. **PortalShell: estimated revenue used `toLocaleString()` without a locale.** Doctor users in Arabic saw Western digits for AED revenue; now passes `i18n.language`.

### Cross-cutting security

105. **MessagesWorkspace + patient/AIChat: `target="_blank"` links used `rel="noreferrer"` without `noopener`.** Added `noopener` to all such links (defence in depth against `window.opener`-based tabnabbing).

### Area 3/5 — Doctor & Pharmacy search placeholders

106. **DoctorPatients/PharmacyInventory/PharmacyDispensing: search input placeholders were hard-coded English.** Routed through `doctor.patients.searchPh`, `pharmacy.inventory.searchPh`, and `pharmacy.dispensing.searchPh` keys with Arabic translations so the placeholder reads naturally in both locales.

### Area 9 — OpsShell follow-up

107. **OpsShell: pharmacy header had several hard-coded English strings.** 'Sign Out' / 'Sign out' on both layouts, the brand subtitle fallback 'Al Shifa Pharmacy · Live operations' (which surfaced a fake pharmacy name to all tenants!), the in-header 'New prescription queue synced from Supabase' banner with its 'View' button, plus 'Scan Barcode' and 'New Manual Rx' buttons were all hard-coded. Localized via new `portalShell.signOut` + `opsShell.*` keys (EN + AR) and removed the fake "Al Shifa Pharmacy" branding from the default subtitle. Also added `type="button"` to the two action buttons that lacked one.

### Area 3 — Doctor portal follow-up

108. **CreatePrescription: 'Change Patient' button label + select `aria-label` were hard-coded English.** Routed both through a new `doctor.createPrescription.changePatient` key (EN + AR).
