/**
 * QA-197: read long lists completely.
 *
 * The API returns at most 1,000 rows per request and does not say when it cut a list short,
 * and `.in('user_id', ids)` puts every id in the web address, which fails once there are a few
 * hundred ids. Both happened silently on the clinic Appointments and Patients pages (older
 * visits and whole patients missing, names shown as "Unknown").
 */

type PageResult<T> = PromiseLike<{ data: T[] | null; error: unknown }>;

export const API_PAGE_SIZE = 1000;
export const ID_CHUNK_SIZE = 150;

/**
 * Reads page after page until a short page arrives. The query must have a stable order
 * (add a unique column such as id as the last order). Stops at maxRows and says so.
 */
export const fetchAllPages = async <T>(
  buildPage: (from: number, to: number) => PageResult<T>,
  { pageSize = API_PAGE_SIZE, maxRows = 20000 }: { pageSize?: number; maxRows?: number } = {}
): Promise<{ rows: T[]; truncated: boolean }> => {
  const rows: T[] = [];
  for (let from = 0; from < maxRows; from += pageSize) {
    const to = Math.min(from + pageSize, maxRows) - 1;
    const { data, error } = await buildPage(from, to);
    if (error) throw error;
    const page = data ?? [];
    rows.push(...page);
    if (page.length < to - from + 1) return { rows, truncated: false };
  }
  return { rows, truncated: true };
};

/** Runs an `.in(...)` lookup in small batches of ids and joins the results. */
export const fetchByIdChunks = async <T>(
  ids: string[],
  buildChunk: (chunk: string[]) => PageResult<T>,
  chunkSize = ID_CHUNK_SIZE
): Promise<T[]> => {
  const unique = [...new Set(ids.filter(Boolean))];
  const rows: T[] = [];
  for (let start = 0; start < unique.length; start += chunkSize) {
    const { data, error } = await buildChunk(unique.slice(start, start + chunkSize));
    if (error) throw error;
    rows.push(...(data ?? []));
  }
  return rows;
};
