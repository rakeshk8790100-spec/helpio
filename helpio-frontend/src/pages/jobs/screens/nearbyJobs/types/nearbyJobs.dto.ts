import type { ComponentProps } from 'react';
import type { MapCircleApiDto, NearbyJobApiDto } from '@/common/CommonApi';
import type { MapCircle, NearbyJob } from '@/common/CommonDto';
import type { WithStatus } from '@/common/CommonDto';
import type { MilestoneStatus } from '@/common/CommonEnum';
import type { HiredJobCard, JobMapItem } from '@/components/common';
import type { ChipOption } from '@/components/ui';
import type { JobsView, ProJobsTab } from './nearbyJobs.enum';

/* The nearbyJobs screen: wire shapes and layout props. */

export interface ProviderJobApiDto extends NearbyJobApiDto {
  customer_name: string | null;
  started_at: string | null;
  amount_paise: number;
  earned_paise: number;
  milestone_stage: number | null;
  milestone_status: MilestoneStatus | null;
  next_due_at: string | null;
  unread_messages: number;
}

export interface NearbyJobsApiDto {
  area: MapCircleApiDto | null;
  categories: { id: string; name: string }[];
  jobs: NearbyJobApiDto[];
}

export interface NearbyFilters {
  categoryId?: string;
  maxKm?: number;
  hasBudget?: boolean;
  urgentOnly?: boolean;
}

export interface NearbyFiltersProps {
  categories: ChipOption<string>[];
  categoryId: string;
  onCategoryChange: (id: string) => void;
  distances: ChipOption<number>[];
  maxKm: number;
  onMaxKmChange: (km: number) => void;
  hasBudget: boolean;
  onHasBudgetChange: (on: boolean) => void;
  urgentOnly: boolean;
  onUrgentOnlyChange: (on: boolean) => void;
}

export type HiredJobItem = ComponentProps<typeof HiredJobCard> & { id: string };

export interface NearbyJobsLayoutProps {
  tab: ProJobsTab;
  tabs: { value: ProJobsTab; label: string }[];
  onTabChange: (tab: ProJobsTab) => void;
  /** Active and Completed tabs: jobs I was hired for */
  hired: WithStatus<{ items: HiredJobItem[]; emptyText: string }>;
  filters: NearbyFiltersProps;
  view: JobsView;
  onViewChange: (view: JobsView) => void;
  results: WithStatus<{
    items: { job: NearbyJob; onOpen: () => void }[];
    map: { area: MapCircle | null; jobs: JobMapItem[] };
    /** The provider saved no coordinates, so the map can't place them */
    noLocation: { onAddLocation: () => void } | null;
  }>;
}
