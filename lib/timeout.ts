/**
 * Reusable timeout helper to prevent long-running external calls from hanging.
 * @param ms - Timeout in milliseconds.
 * @param errorMessage - Custom error message for timeout.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number = 15000, errorMessage: string = "Request timed out"): Promise<T> {
  const timeoutPromise = new Promise<T>((_, reject) =>
    setTimeout(() => reject(new Error(errorMessage)), ms)
  );

  return Promise.race([promise, timeoutPromise]);
}
