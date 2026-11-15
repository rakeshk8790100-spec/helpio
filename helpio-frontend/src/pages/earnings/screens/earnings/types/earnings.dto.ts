import type { WithStatus } from '@/common/CommonDto';
import type { PayoutStatus } from '@/common/CommonEnum';
import type { BadgeTone } from '@/components/ui';
import type { EarningsTab } from './earnings.enum';

/* Wire format (snake_case, money in paise) of the provider earnings endpoint. */

export interface EarningItemApiDto {
  payment_id: string;
  job_id: string;
  job_title: string;
  amount_paise: number;
  paid_at: string | null;
  method: string | null;
  payout_status: PayoutStatus;
  payout_reference: string | null;
  payout_at: string | null;
}

export interface ProviderEarningsApiDto {
  total_paise: number;
  week_paise: number;
  to_receive_paise: number;
  received_paise: number;
  items: EarningItemApiDto[];
}

/* Earnings screen: the API's wire format, and the layout's props. */


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
