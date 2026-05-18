import { describe, expect, it } from 'vitest';
import {
  createAutofilledAnswer,
  inferAutofillSourceFromQuestion,
  type PreVisitAutofillContext,
  type PreVisitTemplateQuestionDraft,
} from './pre-visit';

const baseContext: PreVisitAutofillContext = {
  fullName: null,
  dateOfBirth: null,
  gender: null,
  address: null,
  phone: null,
  city: null,
  bloodType: null,
  emergencyContactName: null,
  emergencyContactPhone: null,
  activeConditions: ['Diabetes'],
  allergies: [],
  activeMedications: [],
  memoryFactsByKey: new Map(),
};

describe('createAutofilledAnswer', () => {
  it('does not mark a select question as autofilled when record values do not map to options', () => {
    const question: PreVisitTemplateQuestionDraft = {
      key: 'primary_concern',
      label: 'Primary concern',
      helpText: null,
      type: 'single_select',
      required: false,
      options: [
        { label: 'Chest pain', value: 'Chest pain' },
        { label: 'Shortness of breath', value: 'Shortness of breath' },
      ],
      displayOrder: 0,
      autofillSource: 'medical_conditions.active',
      memoryKey: null,
      aiInstructions: null,
    };

    expect(createAutofilledAnswer(question, baseContext)).toMatchObject({
      answerText: null,
      answerJson: null,
      autofilled: false,
    });
  });

  it('maps matching record values into multi-select answers', () => {
    const question: PreVisitTemplateQuestionDraft = {
      key: 'known_conditions',
      label: 'Known conditions',
      helpText: null,
      type: 'multi_select',
      required: false,
      options: [
        { label: 'Diabetes', value: 'Diabetes' },
        { label: 'Hypertension', value: 'Hypertension' },
      ],
      displayOrder: 0,
      autofillSource: 'medical_conditions.active',
      memoryKey: null,
      aiInstructions: null,
    };

    expect(createAutofilledAnswer(question, baseContext)).toMatchObject({
      answerText: 'Diabetes',
      answerJson: ['Diabetes'],
      autofilled: true,
    });
  });

  it('infers the emergency contact phone source before the generic phone source', () => {
    expect(
      inferAutofillSourceFromQuestion({
        key: 'emergency_phone',
        label: 'Emergency contact phone',
      })
    ).toBe('patient.emergency_contact_phone');
  });

  it('still infers the patient profile phone for plain phone questions', () => {
    expect(
      inferAutofillSourceFromQuestion({
        key: 'phone',
        label: 'Mobile phone number',
      })
    ).toBe('profile.phone');
  });

  it('infers emergency contact name before the generic full-name source', () => {
    expect(
      inferAutofillSourceFromQuestion({
        key: 'ec_name',
        label: 'Emergency contact name',
      })
    ).toBe('patient.emergency_contact_name');
  });

  it('maps more specific canonical conditions onto broader option labels', () => {
    const question: PreVisitTemplateQuestionDraft = {
      key: 'known_conditions',
      label: 'Known conditions',
      helpText: null,
      type: 'multi_select',
      required: false,
      options: [
        { label: 'Cancer', value: 'cancer' },
        { label: 'Diabetes', value: 'diabetes' },
      ],
      displayOrder: 0,
      autofillSource: 'medical_conditions.active',
      memoryKey: null,
      aiInstructions: null,
    };

    expect(
      createAutofilledAnswer(question, {
        ...baseContext,
        activeConditions: ['skin cancer stage 3'],
      })
    ).toMatchObject({
      answerText: 'cancer',
      answerJson: ['cancer'],
      autofilled: true,
    });
  });
});
