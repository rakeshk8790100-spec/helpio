import type { ProviderCard, ProviderProfile } from '../../../common/CommonDto';
import type { ChipOption } from '../../../component/ui';
import type { WithStatus } from '../layout.types';

/* Contract between pages/pros (behaviour) and client/default/pros (markup): find pros and open their profiles. */

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

export interface RequestSheetProps {
  open: boolean;
  onClose: () => void;
  providerName: string;
  jobs: WithStatus<{ items: { id: string; title: string; meta: string }[] }>;
  selectedJobId: string | null;
  onSelectJob: (id: string) => void;
  message: string;
  onMessageChange: (value: string) => void;
  sending: boolean;
  error?: string;
  onSend: () => void;
  onPostNew: () => void;
}

export type ProviderProfileLayoutProps = WithStatus<{
  provider: ProviderProfile;
  /** e.g. "Mon–Sat, 9:00 AM–6:00 PM" */
  hours: string | null;
  onBack: () => void;
  /** Customers only; providers previewing their own profile see a note instead */
  request: (RequestSheetProps & { onOpen: () => void }) | null;
  isOwnProfile: boolean;
}>;
