export const AI_MODEL_INFO = {
  provider: 'Anthropic',
  model: 'Claude Sonnet',
  modelId: 'claude-sonnet-4-20250514',
  ceenaixVersion: 'v2.4.1',
  lastUpdated: '2 April 2026',
  environment: 'Production — UAE region',
  apiEndpoint: 'api.anthropic.com',
  avgResponseMs: 2300,
  uptimePercent: 99.98,
  contextWindow: '200,000 tokens',
  languages: 'Arabic ✅ · English ✅ · Hindi ✅ · +35',
};

export const AI_USAGE_TODAY = {
  totalSessions: 8921,
  activeSessions: 247,
  peakSessions: 1247,
  peakWindow: '9:00–10:00 AM',
  patientSessions: 6847,
  patientPct: 76.8,
  doctorSessions: 1841,
  doctorPct: 20.6,
  insuranceSessions: 233,
  insurancePct: 2.6,
  avgDurationPatient: 8.4,
  avgDurationDoctor: 3.1,
  avgDurationInsurance: 1.8,
};

export const AI_USAGE_MONTH = {
  totalSessions: 127450,
  vsLastMonth: 103847,
  growthPct: 22.7,
  allTimeTotal: 1247891,
};

export const AI_LANGUAGE_BREAKDOWN = [
  { language: 'Arabic', pct: 62, sessions: 5531, color: '#0D9488', flag: '🇦🇪' },
  { language: 'English', pct: 34, sessions: 3033, color: '#2563EB', flag: '🇬🇧' },
  { language: 'Hindi', pct: 3, sessions: 268, color: '#7C3AED', flag: '🇮🇳' },
  { language: 'Tagalog', pct: 1, sessions: 89, color: '#D97706', flag: '🇵🇭' },
];

export const AI_PATIENT_PERFORMANCE = {
  symptomAccuracy: 89.4,
  bookingConversion: 34.7,
  patientSatisfaction: 4.6,
  totalRatings: 48291,
  avgQuestionsPerSession: 7.3,
};

export const AI_DOCTOR_PERFORMANCE = {
  soapAcceptanceRate: 78.3,
  icd10Accuracy: 92.1,
  drugInteractionRate: 99.1,
  dailyUsageRate: 67.4,
  avgTimeSavedMin: 4.2,
};

export const AI_INSURANCE_PERFORMANCE = {
  preAuthAccuracy: 94.2,
  fraudTruePositive: 89.1,
  falsePositiveRate: 4.2,
  aiProcessingSeconds: 1.8,
  humanProcessingHours: 4.2,
};

export const AI_SAFETY_TODAY = {
  totalFlags: 12,
  escalated: 3,
  resolved: 9,
  emergencyReferrals: 0,
  sensitiveTopics: 4,
  offTopicFiltered: 89,
  dhaEvents: 0,
  escalationRatePct: 3.1,
  escalationsCount: 277,
  falseSafetyRatePct: 0.02,
};

export const PATIENT_TOPICS_TODAY = [
  { topic: 'Appointment booking', sessions: 2891, pct: 32.4 },
  { topic: 'Symptom assessment', sessions: 1284, pct: 14.4 },
  { topic: 'General health info', sessions: 1144, pct: 12.8 },
  { topic: 'Find a doctor', sessions: 1109, pct: 12.4 },
  { topic: 'Blood pressure questions', sessions: 847, pct: 9.5 },
  { topic: 'Diabetes / blood sugar', sessions: 634, pct: 7.1 },
  { topic: 'Medication queries', sessions: 591, pct: 6.6 },
  { topic: 'Lab result interpretation', sessions: 421, pct: 4.7 },
];

export const DOCTOR_AI_USE_CASES = [
  { name: 'SOAP note drafting', pct: 38, color: '#1D4ED8' },
  { name: 'ICD-10 suggestions', pct: 24, color: '#4F46E5' },
  { name: 'Drug interaction check', pct: 21, color: '#7C3AED' },
  { name: 'Clinical insights', pct: 12, color: '#0D9488' },
  { name: 'Other', pct: 5, color: '#475569' },
];

export const HOURLY_SESSIONS_TODAY = [
  { hour: '7AM', patient: 180, doctor: 48, insurance: 6 },
  { hour: '8AM', patient: 683, doctor: 183, insurance: 25 },
  { hour: '9AM', patient: 957, doctor: 257, insurance: 33 },
  { hour: '10AM', patient: 836, doctor: 224, insurance: 29 },
  { hour: '11AM', patient: 724, doctor: 193, insurance: 26 },
  { hour: '12PM', patient: 630, doctor: 169, insurance: 22 },
  { hour: '1PM', patient: 563, doctor: 151, insurance: 20 },
  { hour: '2PM', patient: 274, doctor: 116, insurane: 15 },
];

export const RESPONSE_TIME_TREND = [
  { time: '12:00', ms: 2.4 },
  { time: '12:15', ms: 2.2 },
  { time: '12:30', ms: 2.5 },
  { time: '12:45', ms: 2.1 },
  { time: '1:00', ms: 2.3 },
  { time: '1:15', ms: 2.6 },
  { time: '1:30', ms: 2.2 },
  { time: '1:45', ms: 2.4 },
  { time: '2:00', ms: 2.3 },
];

export const SATISFACTION_7DAY = [
  { day: 'Apr 1', score: 4.5 },
  { day: 'Apr 2', score: 4.6 },
  { day: 'Apr 3', score: 4.4 },
  { day: 'Apr 4', score: 4.7 },
  { day: 'Apr 5', score: 4.5 },
  { day: 'Apr 6', score: 4.6 },
  { day: 'Apr 7', score: 4.6 },
];

export const AI_REVENUE = {
  aiDrivenBookings: 210000,
  subscriptionFee: 42000,
  insuranceAIFee: 35000,
  grossRevenue: 287000,
  anthropicCost: 18400,
  netMargin: 268600,
  netMarginPct: 93.6,
};

export const POPULATION_CONDITIONS = [
  { rank: 1, condition: 'Hypertension', icd: 'I10', patients: 16788, prevalence: 34.7, trend: 'up', delta: 1.2, dhaReportable: false },
  { rank: 2, condition: 'T2 Diabetes', icd: 'E11.9', patients: 13738, prevalence: 28.4, trend: 'up', delta: 1.8, dhaReportable: false },
  { rank: 3, condition: 'Hyperlipidemia', icd: 'E78.5', patients: 9278, prevalence: 19.2, trend: 'stable', delta: 0, dhaReportable: false },
  { rank: 4, condition: 'Obesity', icd: 'E66.9', patients: 7787, prevalence: 16.1, trend: 'up', delta: 0.8, dhaReportable: false },
  { rank: 5, condition: 'Vitamin D Deficiency', icd: 'E55.9', patients: 6841, prevalence: 14.2, trend: 'up', delta: 3.1, dhaReportable: false },
  { rank: 6, condition: 'Anxiety', icd: 'F41.9', patients: 4063, prevalence: 8.4, trend: 'up', delta: 2.4, dhaReportable: false },
  { rank: 7, condition: 'Asthma', icd: 'J45.9', patients: 2893, prevalence: 6.0, trend: 'stable', delta: 0, dhaReportable: false },
  { rank: 8, condition: 'GERD', icd: 'K21.9', patients: 2121, prevalence: 4.4, trend: 'up', delta: 0.6, dhaReportable: false },
  { rank: 9, condition: 'Thyroid disorders', icd: 'E03.9', patients: 1842, prevalence: 3.8, trend: 'stable', delta: 0, dhaReportable: false },
  { rank: 10, condition: 'Dengue fever', icd: 'A90', patients: 289, prevalence: 0.6, trend: 'seasonal', delta: 0, dhaReportable: true },
];

export const AGE_GENDER_DATA = [
  { group: '18–25', male: 234, female: 189 },
  { group: '26–35', male: 891, female: 734 },
  { group: '36–45', male: 2341, female: 1891 },
  { group: '46–55', male: 4121, female: 3241 },
  { group: '56–65', male: 3891, female: 3012 },
  { group: '65+', male: 1234, female: 989 },
];

export const CONDITION_TRENDS = [
  { month: 'Sep 25', hypertension: 33.4, diabetes: 26.7, obesity: 15.3, anxiety: 6.1, vitaminD: 10.5 },
  { month: 'Oct 25', hypertension: 33.6, diabetes: 27.0, obesity: 15.5, anxiety: 6.4, vitaminD: 11.2 },
  { month: 'Nov 25', hypertension: 33.8, diabetes: 27.2, obesity: 15.7, anxiety: 6.9, vitaminD: 12.0 },
  { month: 'Dec 25', hypertension: 34.0, diabetes: 27.5, obesity: 15.9, anxiety: 7.2, vitaminD: 12.8 },
  { month: 'Jan 26', hypertension: 34.2, diabetes: 27.7, obesity: 16.0, anxiety: 7.6, vitaminD: 13.4 },
  { month: 'Feb 26', hypertension: 34.4, diabetes: 27.9, obesity: 16.0, anxiety: 7.9, vitaminD: 13.9 },
  { month: 'Mar 26', hypertension: 34.6, diabetes: 28.2, obesity: 16.1, anxiety: 8.1, vitaminD: 14.4 },
  { month: 'Apr 26', hypertension: 34.7, diabetes: 28.4, obesity: 16.1, anxiety: 8.4, vitaminD: 14.2 },
];

export const SAFETY_FLAGS_TODAY = [
  {
    id: 'sf1', severity: 'escalated', time: '2:01 PM', language: 'Arabic', portal: 'Patient Portal',
    title: 'Potential cardiac emergency',
    description: 'Patient described chest pain + left arm numbness (5 on 10 scale). AI escalated to Dr. Maryam Al Farsi.',
    outcome: 'Escalated · Dr. Maryam responded 2:04 PM ✅',
    session: 'ANON-20260407-8241',
  },
  {
    id: 'sf2', severity: 'escalated', time: '12:34 PM', language: 'English', portal: 'Patient Portal',
    title: 'Mental health — suicidal ideation mentioned',
    description: 'AI referred patient to mental health resources and escalated to on-call psychiatrist.',
    outcome: 'Escalated · Crisis resources provided ✅',
    session: 'ANON-20260407-5182',
  },
  {
    id: 'sf3', severity: 'escalated', time: '11:18 AM', language: 'Arabic', portal: 'Patient Portal',
    title: 'Drug allergy hard stop — Penicillin/Amoxicillin',
    description: 'Patient with known penicillin allergy asked about amoxicillin — AI issued hard allergy warning.',
    outcome: 'Hard stop applied — escalated per protocol',
    session: 'ANON-20260407-3847',
  },
  {
    id: 'sf4', severity: 'resolved', time: '10:42 AM', language: 'Arabic', portal: 'Patient Portal',
    title: 'Off-topic request filtered',
    description: 'User attempted to use health AI for non-medical queries. Politely redirected.',
    outcome: 'Resolved without escalation',
    session: 'ANON-20260407-2941',
  },
  {
    id: 'sf5', severity: 'resolved', time: '10:15 AM', language: 'English', portal: 'Patient Portal',
    title: 'Sensitive topic — end of life discussion',
    description: 'Patient asked about palliative care. AI handled with sensitivity protocol and provided resources.',
    outcome: 'Resolved without escalation',
    session: 'ANON-20260407-2614',
  },
  {
    id: 'sf6', severity: 'resolved', time: '9:34 AM', language: 'Hindi', portal: 'Patient Portal',
    title: 'Off-topic request filtered',
    description: 'Non-health content request redirected.',
    outcome: 'Resolved without escalation',
    session: 'ANON-20260407-1847',
  },
  {
    id: 'sf7', severity: 'false-positive', time: '9:12 AM', language: 'Arabic', portal: 'Patient Portal',
    title: 'Standard blood pressure query incorrectly flagged',
    description: 'Normal hypertension management question triggered safety model. False positive — recalibration noted.',
    outcome: 'False positive — safety model recalibration logged',
    session: 'ANON-20260407-1623',
  },
  {
    id: 'sf8', severity: 'false-positive', time: '8:47 AM', language: 'English', portal: 'Doctor Portal',
    title: 'Clinical query mistakenly escalated',
    description: 'Doctor asking about drug dosing ranges triggered patient safety protocol. False positive.',
    outcome: 'False positive — context detection improvement logged',
    session: 'ANON-20260407-1341',
  },
];

export const ESCALATION_TREND_7D = [3.4, 3.2, 3.5, 2.9, 3.1, 3.0, 3.1];

export const DEPLOYMENT_HISTORY = [
  {
    version: 'v2.4.1',
    date: '2 Apr 2026',
    changes: 'AI SOAP drafting · Holter integration · Pharmacy substitution quick-approve · Population health heatmap',
    status: 'production',
    hotfix: false,
  },
  {
    version: 'v2.4.0',
    date: '15 Mar 2026',
    changes: 'Arabic language improvements · Insurance AI confidence threshold adjustment',
    status: 'replaced',
    hotfix: false,
  },
  {
    version: 'v2.3.2',
    date: '1 Mar 2026',
    changes: 'Critical: Drug interaction false positive fix (Metformin + Furosemide)',
    status: 'replaced',
    hotfix: true,
  },
  {
    version: 'v2.3.1',
    date: '12 Feb 2026',
    changes: 'Population health analytics · Bias monitoring dashboard',
    status: 'replaced',
    hotfix: false,
  },
];

export const API_COST_HISTORY = [
  { month: 'Jan', cost: 12400 },
  { month: 'Feb', cost: 13100 },
  { month: 'Mar', cost: 15200 },
  { month: 'Apr', cost: 18400 },
];

export const BIAS_METRICS = [
  { group: 'Male', score: 4.61, color: '#1D4ED8' },
  { group: 'Female', score: 4.59, color: '#DB2777' },
  { group: '18–35', score: 4.63, color: '#0D9488' },
  { group: '36–55', score: 4.58, color: '#0D9488' },
  { group: '55+', score: 4.47, color: '#D97706' },
  { group: 'Emirati', score: 4.62, color: '#10B981' },
  { group: 'Expat Arab', score: 4.61, color: '#10B981' },
  { group: 'Expat Other', score: 4.54, color: '#10B981' },
];
