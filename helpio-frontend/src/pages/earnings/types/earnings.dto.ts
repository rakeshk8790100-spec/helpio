import type { PayoutStatus } from '../../../common/CommonEnum';

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
