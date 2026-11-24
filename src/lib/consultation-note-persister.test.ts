import { describe, expect, it } from 'vitest';
import { createNotePersister, type NoteStore } from './consultation-note-persister';

type Payload = { plan: string };

const fakeStore = (options: { failInserts?: number } = {}) => {
  const calls: string[] = [];
  let failuresLeft = options.failInserts ?? 0;
  let nextId = 1;
  const store: NoteStore<Payload> = {
    insert: async (payload) => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      if (failuresLeft > 0) {
        failuresLeft -= 1;
        calls.push(`insert-failed:${payload.plan}`);
        return { id: null, error: { message: 'network' } };
      }
      const id = `note-${nextId++}`;
      calls.push(`insert:${payload.plan}->${id}`);
      return { id, error: null };
    },
    update: async (id, payload) => {
      await new Promise((resolve) => setTimeout(resolve, 1));
      calls.push(`update:${id}:${payload.plan}`);
      return { error: null };
    },
  };
  return { store, calls };
};

describe('createNotePersister', () => {
  it('inserts once, then updates the same note on every later save', async () => {
    const { store, calls } = fakeStore();
    const persister = createNotePersister(store);

    await persister.save({ plan: 'a' });
    await persister.save({ plan: 'ab' });
    await persister.save({ plan: 'abc' });

    expect(calls).toEqual(['insert:a->note-1', 'update:note-1:ab', 'update:note-1:abc']);
    expect(persister.noteId).toBe('note-1');
  });

  it('never inserts twice when saves fire at the same time (autosave + manual save)', async () => {
    const { store, calls } = fakeStore();
    const persister = createNotePersister(store);

    await Promise.all([persister.save({ plan: 'auto' }), persister.save({ plan: 'manual' }), persister.save({ plan: 'scribe' })]);

    expect(calls.filter((call) => call.startsWith('insert'))).toHaveLength(1);
    expect(calls).toEqual(['insert:auto->note-1', 'update:note-1:manual', 'update:note-1:scribe']);
  });

  it('only updates when the note already existed on load', async () => {
    const { store, calls } = fakeStore();
    const persister = createNotePersister(store, 'existing');

    await persister.save({ plan: 'x' });

    expect(calls).toEqual(['update:existing:x']);
  });

  it('adopts a note id loaded later, but never replaces a known one', async () => {
    const { store, calls } = fakeStore();
    const persister = createNotePersister(store);

    persister.adoptNoteId('loaded');
    persister.adoptNoteId('other');
    await persister.save({ plan: 'y' });

    expect(calls).toEqual(['update:loaded:y']);
  });

  it('retries the insert on the next save if the first insert failed', async () => {
    const { store, calls } = fakeStore({ failInserts: 1 });
    const persister = createNotePersister(store);

    expect(await persister.save({ plan: 'first' })).toEqual({ message: 'network' });
    expect(await persister.save({ plan: 'second' })).toBeNull();

    expect(calls).toEqual(['insert-failed:first', 'insert:second->note-1']);
  });
});
