import type { WithStatus } from '@/common/CommonDto';

/* Contract between the favourites popup's hook (behaviour) and its markup. */

/** A dropdown group: one catalog category and its services not chosen yet */
export interface FavoriteOptionGroup {
  label: string;
  options: { value: string; label: string }[];
}

/** One chosen service, shown as a chip under the dropdown */
export interface FavoriteChoice {
  /** Skill id, or `name:<typed name>` for a requested one */
  key: string;
  label: string;
  /** Typed by the customer: waits for an admin to add it to the catalog */
  requested: boolean;
  /** Saved before: shown, can't be removed from the popup */
  locked: boolean;
}

export type FavoritesModalLayoutProps = {
  /** `add`: the popup after sign-in, picks until there are 8; `edit`: the whole set, from the profile or home */
  mode: 'add' | 'edit';
  /** e.g. 3 of 8 picked, "5 more to go" */
  progress: { picked: number; total: number; hint: string };
  saving: boolean;
  skipping: boolean;
  error?: string;
  canSave: boolean;
  /** No more room: the dropdown is switched off */
  full: boolean;
  chosen: FavoriteChoice[];
  onRemove: (key: string) => void;
  onSave: () => void;
  /** Add mode: "Skip for now" and the X close it until the next visit; edit mode just closes */
  onClose: () => void;
} & WithStatus<{
  search: string;
  onSearch: (text: string) => void;
  /** Catalog services matching the search, by category */
  options: FavoriteOptionGroup[];
  onPick: (skillId: string) => void;
  /** Tap-to-add services, a few from each category, not chosen yet */
  suggestions: { value: string; label: string }[];
  /** The typed text, when no catalog service is called that: offered as "Add …" */
  addOption?: string;
  onAddCustom: (name: string) => void;
}>;
