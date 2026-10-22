/** Layout props wrapper: while loading, a layout needs nothing but the flag. */
export type WithLoading<T> = { loading: true } | ({ loading: false } & T);
