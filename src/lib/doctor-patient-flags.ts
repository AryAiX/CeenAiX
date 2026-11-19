import type { TFunction } from 'i18next';
import type { DoctorPatientFlag, DoctorPatientSummary } from '../hooks/use-doctor-patients';

// QA-131: flags are structured (see DoctorPatientFlag), so colour, icon and text no longer
// depend on matching English words.
export const flagClasses = (flag: DoctorPatientFlag) => {
  switch (flag.kind) {
    case 'allergy':
      return flag.severity === 'severe' ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-red-50 text-red-600';
    case 'inSession':
      return 'bg-teal-100 text-teal-700';
    case 'priorNoShow':
      return 'bg-amber-100 text-amber-700';
    case 'newPatient':
      return 'bg-teal-50 text-teal-600';
  }
};

export const flagIcon = (flag: DoctorPatientFlag) => {
  switch (flag.kind) {
    case 'allergy':
      return '⚠️ ';
    case 'inSession':
      return '● ';
    default:
      return '';
  }
};

export const allergySeverityLabel = (t: TFunction, severity: string) => {
  switch (severity) {
    case 'mild':
      return t('patient.records.severityMild');
    case 'moderate':
      return t('patient.records.severityModerate');
    case 'severe':
      return t('patient.records.severitySevere');
    default:
      return severity;
  }
};

export const flagLabel = (t: TFunction, flag: DoctorPatientFlag) => {
  switch (flag.kind) {
    case 'allergy':
      return flag.severity
        ? t('doctor.patients.flagAllergyWithSeverity', {
            allergen: flag.allergen,
            severity: allergySeverityLabel(t, flag.severity),
          })
        : t('doctor.patients.flagAllergy', { allergen: flag.allergen });
    case 'inSession':
      return t('doctor.patients.flagInSession');
    case 'priorNoShow':
      return t('doctor.patients.flagPriorNoShow');
    case 'newPatient':
      return t('doctor.patients.flagNewPatient');
  }
};

/** First allergy, shown under the patient's name, without the "Allergy:" prefix. */
export const firstAllergyLabel = (t: TFunction, patient: DoctorPatientSummary) => {
  const allergy = patient.flags.find(
    (flag): flag is Extract<DoctorPatientFlag, { kind: 'allergy' }> => flag.kind === 'allergy'
  );
  if (!allergy) {
    return null;
  }
  return allergy.severity ? `${allergy.allergen} (${allergySeverityLabel(t, allergy.severity)})` : allergy.allergen;
};
