import type { ComponentProps } from 'react';
import type { NearbyJobApiDto } from '@/common/CommonApi';
import type { ChecklistItem, NearbyJob, WithStatus } from '@/common/CommonDto';
import type { ChecklistState, OnboardingStatus } from '@/common/CommonEnum';
import type { ActiveJobCard } from '@/components/common';

/* The provider home: its API's wire format and its layout's props. */

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

export interface ProviderHomeSections {
  firstName: string;
  earnings: { week: number; wallet: number };
  pendingQuotes: number;
  /** Shown while any step isn't done */
  checklist: {
    items: ChecklistItem[];
    lockedNote?: string;
    actionLabel?: string;
    onAction?: () => void;
  } | null;
  active: ComponentProps<typeof ActiveJobCard> | null;
  /** Customers who asked this pro directly */
  invites: { job: NearbyJob; onOpen: () => void }[];
  nearby: {
    items: { job: NearbyJob; onOpen: () => void }[];
    total: number;
    onSeeAll: () => void;
  };
}

export type ProviderHomeLayoutProps = WithStatus<ProviderHomeSections>;
