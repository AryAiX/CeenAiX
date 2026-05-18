/** Rejects with `onTimeout()` if `promise` does not settle within `ms` milliseconds. */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  onTimeout: () => Error
): Promise<T> {
  let timeoutId: number | null = null;
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = window.setTimeout(() => {
        reject(onTimeout());
      }, ms);
    });
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }
  }
}
