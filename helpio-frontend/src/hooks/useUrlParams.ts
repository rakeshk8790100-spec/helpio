import { useSearchParams } from 'react-router-dom';

/** Console filters, pages and the open panel live in the URL, so a view can be shared and survives a reload. */
export const useUrlParams = () => {
  const [params, setParams] = useSearchParams();
  const update = (changes: Record<string, string | null>) =>
    setParams(
      (current) => {
        Object.entries(changes).forEach(([key, value]) => (value ? current.set(key, value) : current.delete(key)));
        return current;
      },
      { replace: true },
    );
  const page = Math.max(1, Number(params.get('page')) || 1);
  return { params, update, page };
};
