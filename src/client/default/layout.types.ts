/** Layout props wrapper: while loading, a layout needs nothing but the flag. */
export type WithLoading<T> = { loading: true } | ({ loading: false } & T);

/** A section with its own request: loading, failed (with retry) or ready. */
export type WithStatus<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string; onRetry: () => void }
  | ({ status: 'ready' } & T);
