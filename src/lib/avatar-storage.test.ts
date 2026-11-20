import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from './supabase';
import { removeAvatarFiles } from './avatar-storage';

const list = vi.fn();
const remove = vi.fn();
vi.mock('./supabase', () => ({ supabase: { storage: { from: vi.fn() } } }));

describe('removeAvatarFiles (QA-172)', () => {
  beforeEach(() => {
    list.mockReset();
    remove.mockReset().mockResolvedValue({ error: null });
    vi.mocked(supabase.storage.from).mockReset().mockReturnValue({ list, remove } as never);
  });

  it('deletes every file in the user folder of the avatars bucket', async () => {
    list.mockResolvedValue({ data: [{ name: 'avatar.jpg' }, { name: 'avatar.png' }], error: null });
    await removeAvatarFiles('doc-1');
    expect(supabase.storage.from).toHaveBeenCalledWith('avatars');
    expect(list).toHaveBeenCalledWith('doc-1', { limit: 100 });
    expect(remove).toHaveBeenCalledWith(['doc-1/avatar.jpg', 'doc-1/avatar.png']);
  });

  it('keeps the file it is told to keep', async () => {
    list.mockResolvedValue({ data: [{ name: 'avatar.jpg' }, { name: 'avatar.png' }], error: null });
    await removeAvatarFiles('doc-1', 'doc-1/avatar.png');
    expect(remove).toHaveBeenCalledWith(['doc-1/avatar.jpg']);
  });

  it('does nothing when there is nothing to delete', async () => {
    list.mockResolvedValue({ data: [{ name: 'avatar.png' }], error: null });
    await removeAvatarFiles('doc-1', 'doc-1/avatar.png');
    expect(remove).not.toHaveBeenCalled();
  });

  it('throws when the folder cannot be listed or the files cannot be deleted', async () => {
    list.mockResolvedValue({ data: null, error: new Error('list failed') });
    await expect(removeAvatarFiles('doc-1')).rejects.toThrow('list failed');

    list.mockResolvedValue({ data: [{ name: 'avatar.jpg' }], error: null });
    remove.mockResolvedValue({ error: new Error('remove failed') });
    await expect(removeAvatarFiles('doc-1')).rejects.toThrow('remove failed');
  });
});
