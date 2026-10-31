import FavoritesModalLayout from '../../client/default/customer/favoritesModal.layout';
import type { AuthUser } from '../../common/CommonDto';
import { useFavoritesPrompt } from '../../hooks/useFavoritesPrompt';

interface Props {
  user: AuthUser;
  mode: 'add' | 'edit';
  onDone: () => void;
}

/** Favourite services popup. Mounted only while open, so picks start fresh each time. */
const FavoritesModal = ({ user, mode, onDone }: Props) => (
  <FavoritesModalLayout {...useFavoritesPrompt(user, mode, onDone)} />
);

export default FavoritesModal;
