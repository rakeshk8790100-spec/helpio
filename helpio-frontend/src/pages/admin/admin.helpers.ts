import type { BadgeTone } from '@/components/ui/StatusBadge';
import type { ServiceCheck, SystemStatus } from './types/admin.models';

/* Admin console: how a system check reads, shared by status, settings and the dashboard. */

export const checkBadge = (check: ServiceCheck): { label: string; tone: BadgeTone } => {
  if (!check.configured) return { label: 'Not set up', tone: 'warning' };
  if (check.ok === null) return { label: "Can't test", tone: 'neutral' };
  return check.ok ? { label: 'Working', tone: 'success' } : { label: 'Problem', tone: 'error' };
};

/** Problems to count in the summary: broken services and failing background work */
export const problemCount = (s: SystemStatus) =>
  [s.database, ...s.integrations].filter((c) => c.configured && c.ok === false).length +
  s.heartbeats.filter((h) => h.healthy === false).length;
