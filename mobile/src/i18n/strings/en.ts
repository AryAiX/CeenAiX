// Native-only copy, mounted under the `m` key of the shared `common`
// namespace. Everything that already exists in the web locales is reused
// from there (e.g. `nav.*`, `patient.*`, `auth.*`) instead of duplicated.

export const mobileEn = {
  common: {
    retry: 'Try again',
    errorTitle: 'Something went wrong',
    unexpected: 'An unexpected error occurred.',
    offline: 'Offline — showing data saved {{time}}.',
    selectDate: 'Select a date',
    clear: 'Clear',
    cancel: 'Cancel',
    close: 'Close',
    done: 'Done',
    save: 'Save',
    next: 'Next',
    back: 'Back',
    skip: 'Skip',
    delete: 'Delete',
    edit: 'Edit',
    open: 'Open',
    share: 'Share',
    confirm: 'Confirm',
    seeAll: 'See all',
    stepOf: 'Step {{current}} of {{total}}',
    missingConfig: 'Supabase is not configured. Copy mobile/.env.example to mobile/.env and restart Expo.',
    comingFromWeb: 'Open on web',
    loading: 'Loading…',
    notAvailable: 'Not available',
  },
  tabs: {
    home: 'Home',
    visits: 'Visits',
    assistant: 'CeenAiX AI',
    messages: 'Messages',
    health: 'Health',
  },
  auth: {
    tagline: 'Your health, connected.',
    patientOnly: 'This app is for patients. Use the CeenAiX web portal for clinician and staff access.',
    otpSentTo: 'Enter the 6-digit code sent to {{phone}}.',
    otpPhoneHint: 'Use international format, e.g. +971 50 123 4567.',
    otpCreateAccount: 'New to CeenAiX? Create an account with this number',
    resendIn: 'Resend in {{seconds}}s',
    checkEmailTitle: 'Check your email',
    recoveryLinkInvalid: 'This reset link is invalid or has expired. Request a new one.',
    signOut: 'Sign out',
  },
  lock: {
    title: 'CeenAiX is locked',
    body: 'Unlock with {{method}} to continue.',
    unlock: 'Unlock',
    biometryFallback: 'device passcode',
  },
  ai: {
    generatedTag: 'AI-generated',
  },
} as const;

type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };

export type MobileStrings = Widen<typeof mobileEn>;
