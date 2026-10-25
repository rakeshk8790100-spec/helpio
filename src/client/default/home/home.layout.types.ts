import type { ComponentProps } from 'react';
import type { Category, ChecklistItem, NearbyJob, Service } from '../../../common/CommonDto';
import type { ActiveJobCard, JobCard, PostJobComposer, SearchBox } from '../../../component/marketplace';
import type { WithStatus } from '../layout.types';

/*
 * Contract between pages/home (behaviour) and client/default/home (markup) for the signed-in home screens.
 * Sections are ordered by urgency: live job, decisions, in progress, then discovery.
 */

export type JobItem = ComponentProps<typeof JobCard> & { id: string };

export interface CustomerHomeLayoutProps {
  firstName: string;
  search: ComponentProps<typeof SearchBox>;
  jobs: WithStatus<{
    /** The hired job in progress, if any */
    active: ComponentProps<typeof ActiveJobCard> | null;
    /** Open jobs with quotes to compare */
    decisions: JobItem[];
    /** Posted, no quotes yet */
    waiting: JobItem[];
    /** Saved to continue later */
    drafts: JobItem[];
    onSeeAll: () => void;
  }>;
  onPostJob: () => void;
  onEmergencyJob: () => void;
  composer: ComponentProps<typeof PostJobComposer>;
  categories: { items: Category[]; onSelect: (category: Category) => void; onMore: () => void };
  popular: { items: Service[]; onBook: (service: Service) => void; onSeeAll: () => void };
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
  nearby: {
    items: { job: NearbyJob; onOpen: () => void }[];
    total: number;
    onSeeAll: () => void;
  };
}

export type ProviderHomeLayoutProps = WithStatus<ProviderHomeSections>;
