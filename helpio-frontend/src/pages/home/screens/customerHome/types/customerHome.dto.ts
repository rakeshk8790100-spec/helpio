import type { ComponentProps } from 'react';
import type { JobApiDto } from '@/common/CommonApi';
import type { Category, ProviderCard } from '@/common/CommonDto';
import type { WithStatus } from '@/common/CommonDto';
import type { JobItem } from '@/common/JobDisplay';
import type { ActiveJobCard, PostJobComposer } from '@/components/common';
import type { ChipOption } from '@/components/ui';

/* The customer home: its API's wire format and its layout's props. Sections are ordered by urgency. */

export interface CustomerHomeApiDto {
  active_job: JobApiDto | null;
  awaiting_decision: JobApiDto[];
  waiting_for_quotes: JobApiDto[];
  drafts: JobApiDto[];
}

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
  /**
   * "Available for your favourites": no favourites yet → a card to pick some; otherwise a chip per favourite
   * ("All" first) and the pros who offer it. Hidden when there are favourites but no saved address.
   */
  favorites:
    | { kind: 'pick'; onPick: () => void }
    | {
        kind: 'pros';
        chips: ChipOption<string>[];
        selected: string;
        onSelect: (skillId: string) => void;
        onEdit: () => void;
        results: WithStatus<{ items: { provider: ProviderCard; onOpen: () => void }[] }>;
      }
    | null;
}
