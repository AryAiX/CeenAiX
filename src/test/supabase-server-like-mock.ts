import { vi } from 'vitest';

/**
 * QA-197: a query builder that behaves like the hosted API for long lists:
 *   * at most `maxRows` (1,000) rows per request, silently cut;
 *   * `.range(from, to)` returns that slice;
 *   * `.in(column, ids)` with more than `maxInIds` ids fails (the web address gets too long),
 *     otherwise only rows whose column is in the ids are returned.
 */
export const createServerLikeBuilder = <T extends Record<string, unknown>>(
  allRows: T[],
  { maxRows = 1000, maxInIds = 150 }: { maxRows?: number; maxInIds?: number } = {}
) => {
  let from = 0;
  let to = maxRows - 1;
  let inFilter: { column: string; ids: string[] } | null = null;
  const result = () => {
    if (inFilter && inFilter.ids.length > maxInIds) {
      return { data: null, error: { code: '414', message: 'URI Too Long' } };
    }
    const filter = inFilter;
    const matching = filter ? allRows.filter((row) => filter.ids.includes(String(row[filter.column]))) : allRows;
    const end = Math.min(to, from + maxRows - 1);
    return { data: matching.slice(from, end + 1), error: null };
  };
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'neq', 'gte', 'lt', 'lte', 'ilike', 'is', 'not', 'order', 'limit']) {
    builder[method] = vi.fn(() => builder);
  }
  builder.in = vi.fn((column: string, ids: string[]) => {
    inFilter = { column, ids };
    return builder;
  });
  builder.range = vi.fn((rangeFrom: number, rangeTo: number) => {
    from = rangeFrom;
    to = rangeTo;
    return builder;
  });
  builder.maybeSingle = vi.fn(() => Promise.resolve(result()));
  builder.single = vi.fn(() => Promise.resolve(result()));
  builder.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(result()).then(resolve, reject);
  return builder;
};
