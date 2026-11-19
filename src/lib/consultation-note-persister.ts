/**
 * QA-120: one consultation note per appointment.
 *
 * The doctor appointment page chose "update or insert" by looking at the note it had
 * loaded. After an autosave it never reloaded, so on an appointment without a note every
 * autosave (and the manual save, and the scribe approval) inserted another row. The
 * database has no unique constraint on consultation_notes.appointment_id, so the
 * duplicates were accepted silently; the page only shows the newest one, so nothing
 * looked wrong.
 *
 * This persister remembers the note id after the first insert and runs saves one at a
 * time, so two saves fired together can never both insert.
 */

export interface NoteStoreError {
  message: string;
}

export interface NoteStore<Payload> {
  insert: (payload: Payload) => Promise<{ id: string | null; error: NoteStoreError | null }>;
  update: (id: string, payload: Payload) => Promise<{ error: NoteStoreError | null }>;
}

export interface NotePersister<Payload> {
  /** Saves the note: inserts the first time, updates after that. Resolves to the error, if any. */
  save: (payload: Payload) => Promise<NoteStoreError | null>;
  /** Adopts the id of a note loaded from the server, unless one is already known. */
  adoptNoteId: (id: string | null | undefined) => void;
  readonly noteId: string | null;
}

export const createNotePersister = <Payload>(
  store: NoteStore<Payload>,
  initialNoteId: string | null = null
): NotePersister<Payload> => {
  let noteId = initialNoteId;
  let queue: Promise<unknown> = Promise.resolve();

  const run = async (payload: Payload): Promise<NoteStoreError | null> => {
    if (noteId) {
      const { error } = await store.update(noteId, payload);
      return error;
    }
    const { id, error } = await store.insert(payload);
    if (!error && id) {
      noteId = id;
    }
    return error;
  };

  return {
    save: (payload) => {
      const result = queue.then(
        () => run(payload),
        () => run(payload)
      );
      queue = result.catch(() => undefined);
      return result;
    },
    adoptNoteId: (id) => {
      if (!noteId && id) {
        noteId = id;
      }
    },
    get noteId() {
      return noteId;
    },
  };
};
