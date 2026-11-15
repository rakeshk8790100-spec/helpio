import type { WithStatus } from '@/common/CommonDto';

/* Contract between the favourites popup's hook (behaviour) and its markup. */

export interface FavoriteChoice {
  id: string;
  label: string;
  selected: boolean;
  /** Saved before: shown checked, can't be removed from the popup */
  locked: boolean;
  /** The pick limit is reached and this one isn't picked */
  disabled: boolean;
}

export type FavoritesModalLayoutProps = {
  /** `add`: the popup after sign-in, a few new picks; `edit`: the whole set, from the profile or home */
  mode: 'add' | 'edit';
  /** e.g. "2/4 selected" */
  counter: string;
  saving: boolean;
  skipping: boolean;
  error?: string;
  canSave: boolean;
  onToggle: (skillId: string) => void;
  onSave: () => void;
  /** Add mode: "Skip for now" and the X both count as a skip; edit mode just closes */
  onClose: () => void;
} & WithStatus<{ sections: { id: string; name: string; choices: FavoriteChoice[] }[] }>;
