import { describe, expect, it, vi } from 'vitest';
import { fetchAllPages, fetchByIdChunks } from './supabase-batches';

const rows = Array.from({ length: 2500 }, (_, i) => ({ n: i }));
const pageFromServer = (from: number, to: number) =>
  Promise.resolve({ data: rows.slice(from, Math.min(to, from + 999) + 1), error: null });

describe('fetchAllPages (QA-197)', () => {
  it('reads every page until a short page arrives', async () => {
    const build = vi.fn(pageFromServer);
    const result = await fetchAllPages(build);
    expect(result.rows).toHaveLength(2500);
    expect(result.truncated).toBe(false);
    expect(build.mock.calls).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
  });

  it('stops at the limit and says so', async () => {
    const result = await fetchAllPages(pageFromServer, { maxRows: 2000 });
    expect(result.rows).toHaveLength(2000);
    expect(result.truncated).toBe(true);
  });

  it('throws instead of returning a partial list', async () => {
    const error = { code: '500', message: 'boom' };
    await expect(fetchAllPages(() => Promise.resolve({ data: null, error }))).rejects.toBe(error);
  });
});

describe('fetchByIdChunks (QA-197)', () => {
  it('asks in batches of 150 unique ids and joins the results', async () => {
    const ids = Array.from({ length: 320 }, (_, i) => `id-${i}`);
    const build = vi.fn((chunk: string[]) => Promise.resolve({ data: chunk.map((id) => ({ id })), error: null }));
    const result = await fetchByIdChunks([...ids, 'id-1', ''], build);
    expect(build.mock.calls.map(([chunk]) => chunk.length)).toEqual([150, 150, 20]);
    expect(result).toHaveLength(320);
  });

  it('does not call the API for an empty list, and throws on errors', async () => {
    const build = vi.fn();
    expect(await fetchByIdChunks([], build)).toEqual([]);
    expect(build).not.toHaveBeenCalled();
    const error = { code: '414' };
    await expect(fetchByIdChunks(['a'], () => Promise.resolve({ data: null, error }))).rejects.toBe(error);
  });
});
