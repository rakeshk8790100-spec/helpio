
const pending = new Map<string, Promise<void>>();

/** Inject an external script once; later calls share the same promise. A failed load can be retried. */
export const loadScript = (src: string) => {
  const existing = pending.get(src);
  if (existing) return existing;

  const promise = new Promise<void>((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => {
      pending.delete(src);
      el.remove();
      reject(new Error(`Failed to load ${src}`));
    };
    document.head.appendChild(el);
  });

  pending.set(src, promise);
  return promise;
};
