import type { ProviderCard, WithStatus } from '@/common/CommonDto';
import type { ChipOption } from '@/components/ui';

/* Search for pros: the layout's props. */

export interface PlaceOption {
  /** Saved address id, or "current" for the device location */
  value: string;
  label: string;
}

export interface ProviderSearchLayoutProps {
  query: string;
  onQueryChange: (value: string) => void;
  categories: ChipOption<string>[];
  categoryId: string;
  onCategoryChange: (id: string) => void;
  places: PlaceOption[];
  place: string;
  onPlaceChange: (value: string) => void;
  locating: boolean;
  /** No saved address and no device location yet */
  needsLocation: { onUseCurrent: () => void; onAddAddress: () => void; error?: string } | null;
  results: WithStatus<{
    near: string | null;
    total: number;
    items: { provider: ProviderCard; onOpen: () => void }[];
    hasMore: boolean;
    loadingMore: boolean;
    onLoadMore: () => void;
    onPostJob: () => void;
  }> | null;
}
