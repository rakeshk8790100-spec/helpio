import type { WithStatus } from '@/common/CommonDto';

/* The dashboard admin screen: its layout's props. */

export interface KpiItem {
  label: string;
  value: string;
  hint?: string;
  attention?: boolean;
  onClick?: () => void;
}

export type DashboardLayoutProps = WithStatus<{
  /** Users, jobs, money and reviews, in that order */
  kpis: KpiItem[];
  /** From the status page: everything running, or how many problems */
  health: { ok: boolean; text: string; onOpen: () => void } | null;
  jobs: { label: string; count: number }[];
  /** Newest first, e.g. "Asha Kumar approved 50%" */
  activity: { id: string; text: string; jobTitle: string; when: string }[];
}>;
