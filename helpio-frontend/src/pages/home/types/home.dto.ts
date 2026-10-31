import type { ChecklistState, OnboardingStatus } from '../../../common/CommonEnum';
import type { JobApiDto, NearbyJobApiDto } from '../../../common/CommonApi';

/* Wire format (snake_case, money in paise) of the home endpoints. */

export interface CustomerHomeApiDto {
  active_job: JobApiDto | null;
  awaiting_decision: JobApiDto[];
  waiting_for_quotes: JobApiDto[];
  drafts: JobApiDto[];
}

export interface ProviderHomeApiDto {
  onboarding_status: OnboardingStatus;
  checklist: { key: string; label: string; state: ChecklistState }[];
  can_quote: boolean;
  active_job: NearbyJobApiDto | null;
  quotes: { pending: number; accepted: number; rejected: number };
  invites: NearbyJobApiDto[];
  nearby: NearbyJobApiDto[];
  nearby_count: number;
  earnings: { week_paise: number; wallet_paise: number };
}
