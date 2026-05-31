import { vi } from 'vitest';

export interface MockSupabaseResult<T> {
  data: T;
  error: unknown;
  count?: number | null;
}

export interface MockSupabaseQueryBuilder<T> extends PromiseLike<MockSupabaseResult<T>> {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  neq: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  not: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
}

export const createSupabaseQueryBuilder = <T>(
  result: MockSupabaseResult<T>
): MockSupabaseQueryBuilder<T> => {
  const promise = Promise.resolve(result);
  const builder = {} as MockSupabaseQueryBuilder<T>;

  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.neq = vi.fn(() => builder);
  builder.gte = vi.fn(() => builder);
  builder.in = vi.fn(() => builder);
  builder.is = vi.fn(() => builder);
  builder.not = vi.fn(() => builder);
  builder.order = vi.fn(() => builder);
  builder.limit = vi.fn(() => builder);
  builder.update = vi.fn(() => builder);
  builder.insert = vi.fn(() => builder);
  builder.maybeSingle = vi.fn(() => promise);
  builder.single = vi.fn(() => promise);
  builder.then = promise.then.bind(promise);

  return builder;
};
