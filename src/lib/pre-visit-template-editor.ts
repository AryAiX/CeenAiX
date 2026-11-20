import type { DoctorPreVisitTemplateRecord, PreVisitTemplateQuestionDraft } from './pre-visit';

/**
 * QA-166: helpers for the doctor's pre-visit template editor (Profile page).
 */

/** The one template patients get right now, if any. */
export const liveTemplate = (
  templates: DoctorPreVisitTemplateRecord[]
): DoctorPreVisitTemplateRecord | null =>
  templates.find((template) => template.isActive && template.status === 'published') ?? null;

/**
 * Which template the editor opens. `templates` is newest first (created_at desc).
 * 1. The template the doctor just saved or was editing, if it still exists.
 * 2. A draft that is newer than the live template (unfinished edits of it).
 * 3. The live template.
 * 4. The newest template.
 */
export const pickEditorTemplate = (
  templates: DoctorPreVisitTemplateRecord[],
  editingTemplateId: string | null
): DoctorPreVisitTemplateRecord | null => {
  if (editingTemplateId) {
    const editing = templates.find((template) => template.id === editingTemplateId);
    if (editing) return editing;
  }

  const live = liveTemplate(templates);
  const liveIndex = live ? templates.indexOf(live) : templates.length;
  const newerDraft = templates.slice(0, liveIndex).find((template) => template.status === 'draft');

  return newerDraft ?? live ?? templates[0] ?? null;
};

/** The questions in the shape save_doctor_pre_visit_template expects. */
export const templateQuestionsPayload = (questions: PreVisitTemplateQuestionDraft[]) =>
  questions.map((question, index) => ({
    question_key: question.key,
    label: question.label,
    help_text: question.helpText,
    question_type: question.type,
    display_order: index,
    is_required: question.required,
    options: question.options,
    autofill_source: question.autofillSource,
    memory_key: question.memoryKey,
    ai_instructions: question.aiInstructions,
  }));
