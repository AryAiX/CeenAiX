/**
 * QA-178: build a PostgREST `.or()` filter that searches several text columns for what the user
 * typed. The typed text used to be pasted straight into the filter, so a comma, bracket or dot
 * broke the search (or added extra conditions). Here the value is wrapped in double quotes
 * (PostgREST's quoting), with backslashes and quotes escaped, and LIKE wildcards (% and _)
 * typed by the user are matched literally.
 */
export const ilikeAnyFilter = (columns: string[], query: string): string => {
  const literal = query
    .trim()
    .replace(/\\/g, '\\\\')
    .replace(/[%_]/g, (char) => `\\${char}`)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
  return columns.map((column) => `${column}.ilike."%${literal}%"`).join(',');
};
