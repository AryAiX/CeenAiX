import { describe, expect, it } from 'vitest';
import type { DoctorPreVisitTemplateRecord } from './pre-visit';
import {
  liveTemplate,
  nextFreeQuestionKey,
  pickEditorTemplate,
  templateQuestionsPayload,
  withUniqueQuestionKeys,
} from './pre-visit-template-editor';

const template = (
  id: string,
  status: 'draft' | 'published',
  isActive = false
): DoctorPreVisitTemplateRecord => ({
  id,
  title: id,
  description: null,
  status,
  isActive,
  specializationId: null,
  publishedAt: null,
  sourceBucket: null,
  sourcePath: null,
  sourceFileName: null,
  extractionMetadata: {},
  questions: [],
});

describe('pre-visit template editor (QA-166)', () => {
  const live = template('live', 'published', true);
  const newerDraft = template('newer-draft', 'draft');
  const olderDraft = template('older-draft', 'draft');
  const oldPublished = template('old-published', 'published');

  it('finds the live template only when it is active and published', () => {
    expect(liveTemplate([newerDraft, live, olderDraft])).toBe(live);
    expect(liveTemplate([newerDraft, oldPublished])).toBeNull();
    expect(liveTemplate([template('odd', 'draft', true)])).toBeNull();
  });

  it('opens the template the doctor is editing when it still exists', () => {
    expect(pickEditorTemplate([newerDraft, live, olderDraft], 'older-draft')).toBe(olderDraft);
    expect(pickEditorTemplate([newerDraft, live], 'gone')).toBe(newerDraft);
  });

  it('opens a draft that is newer than the live template, otherwise the live one', () => {
    expect(pickEditorTemplate([newerDraft, live, olderDraft], null)).toBe(newerDraft);
    expect(pickEditorTemplate([live, olderDraft], null)).toBe(live);
  });

  it('falls back to the newest template, or nothing', () => {
    expect(pickEditorTemplate([oldPublished, olderDraft], null)).toBe(olderDraft);
    expect(pickEditorTemplate([oldPublished], null)).toBe(oldPublished);
    expect(pickEditorTemplate([], null)).toBeNull();
  });

  it('maps questions to the database shape in order', () => {
    expect(
      templateQuestionsPayload([
        {
          key: 'pain',
          label: 'Pain score',
          helpText: null,
          type: 'number',
          required: true,
          options: [],
          displayOrder: 5,
          autofillSource: null,
          memoryKey: 'pain_score',
          aiInstructions: null,
        },
      ])
    ).toEqual([
      {
        question_key: 'pain',
        label: 'Pain score',
        help_text: null,
        question_type: 'number',
        display_order: 0,
        is_required: true,
        options: [],
        autofill_source: null,
        memory_key: 'pain_score',
        ai_instructions: null,
      },
    ]);
  });
});

describe('question keys (QA-170)', () => {
  const draft = (key: string, label = key) => ({
    key,
    label,
    helpText: null,
    type: 'short_text' as const,
    required: false,
    options: [],
    displayOrder: 0,
    autofillSource: null,
    memoryKey: null,
    aiInstructions: null,
  });

  it('keeps the first key and gives later duplicates the next free suffix', () => {
    const result = withUniqueQuestionKeys([
      draft('symptoms'),
      draft('question_3'),
      draft('symptoms', 'Symptoms again'),
      draft('symptoms_2'),
      draft('question_3', 'New question'),
    ]);
    expect(result.map((question) => question.key)).toEqual([
      'symptoms',
      'question_3',
      'symptoms_2',
      'symptoms_2_2',
      'question_3_2',
    ]);
    expect(result[2].label).toBe('Symptoms again');
  });

  it('returns the same question objects when keys are already unique', () => {
    const questions = [draft('a'), draft('b')];
    const result = withUniqueQuestionKeys(questions);
    expect(result[0]).toBe(questions[0]);
    expect(result[1]).toBe(questions[1]);
  });

  it('picks a new-question key that is not used yet', () => {
    // Added 3 questions, removed the 2nd: question_1, question_3 are left.
    expect(nextFreeQuestionKey([{ key: 'question_1' }, { key: 'question_3' }])).toBe('question_4');
    expect(nextFreeQuestionKey([{ key: 'question_1' }, { key: 'question_2' }])).toBe('question_3');
    expect(nextFreeQuestionKey([])).toBe('question_1');
  });
});

