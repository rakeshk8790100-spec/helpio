import type { BadgeTone } from '../../../component/ui';
import type { WithStatus } from '../layout.types';

/* Contract between pages/earnings (behaviour) and client/default/earnings (markup). */

export const EarningsTab = { ALL: 'all', TO_RECEIVE: 'to-receive', RECEIVED: 'received' } as const;
export type EarningsTab = (typeof EarningsTab)[keyof typeof EarningsTab];

/** One paid job: what the customer paid and where Helpio's payout stands */
export interface EarningRow {
  id: string;
  title: string;
  /** e.g. "Paid 28 Oct · UPI" */
  paidLabel: string;
  amount: number;
  badge: { label: string; tone: BadgeTone };
  /** e.g. "Sent 30 Oct · Ref UTR1234", once Helpio has paid out */
  payoutNote: string | null;
  onOpen: () => void;
}

export interface EarningsSections {
  /** ₹ totals for the header */
  summary: { total: number; week: number; toReceive: number; received: number };
  tab: EarningsTab;
  tabs: { value: EarningsTab; label: string }[];
  onTabChange: (tab: EarningsTab) => void;
  items: EarningRow[];
  /** Shown when the tab has nothing; the All tab offers to go find work */
  empty: { text: string; actionLabel?: string; onAction?: () => void };
}

export type EarningsLayoutProps = WithStatus<EarningsSections>;
