import { Suspense } from 'react';
import type { ReactNode } from 'react';
import PageSkeleton from '@/components/ui/PageSkeleton';

/** Shows a page skeleton while a lazily loaded page or layout downloads. */
const SuspenseWrapper = ({ children, fallback = <PageSkeleton /> }: { children: ReactNode; fallback?: ReactNode }) => (
  <Suspense fallback={fallback}>{children}</Suspense>
);

export default SuspenseWrapper;
