import type { ComponentProps } from 'react';
import type { Category, ChecklistItem, NearbyJob, ProviderCard } from '../../../common/CommonDto';
import type { ActiveJobCard, JobCard, PostJobComposer } from '../../../component/marketplace';
import type { WithStatus } from '../layout.types';

/*
 * Contract between pages/home (behaviour) and client/default/home (markup) for the signed-in home screens.
 * Sections are ordered by urgency: live job, decisions, in progress, then discovery.
 */

export type JobItem = ComponentProps<typeof JobCard> & { id: string };

export interface CustomerHomeLayoutProps {
  firstName: string;
  /** Opens Search (find a pro) */
  onSearch: () => void;
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
  /** Pros serving the default address; hidden when there's no address or nobody yet */
  pros: { items: { provider: ProviderCard; onOpen: () => void }[]; onSeeAll: () => void } | null;
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
