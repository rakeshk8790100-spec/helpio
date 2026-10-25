import AddressEditorLayout from '../../client/default/profile/addressEditor.layout';
import ProfileLayout from '../../client/default/profile/profile.layout';
import type { Address, AuthUser } from '../../common/CommonDto';
import { PageSkeleton } from '../../component/ui';
import { useAddressEditor } from '../../hooks/useAddressEditor';
import { useProfile } from '../../hooks/useProfile';
import { useAppSelector } from '../../redux';
import { selectCurrentUser } from '../../redux/authSlice';

const AddressEditor = ({ address, isFirst, onClose }: { address: Address | null; isFirst: boolean; onClose: () => void }) => (
  <AddressEditorLayout {...useAddressEditor(address, isFirst, onClose)} />
);

const Profile = ({ user }: { user: AuthUser }) => {
  const { layout, editingAddress, closeAddress } = useProfile(user);
  const addresses = layout.addresses?.status === 'ready' ? layout.addresses.items : [];
  return (
    <>
      <ProfileLayout {...layout} />
      {editingAddress !== undefined && (
        // Keyed so each address (or a new one) gets a fresh form and location
        <AddressEditor
          key={editingAddress?.id ?? 'new'}
          address={editingAddress}
          isFirst={addresses.length === 0}
          onClose={closeAddress}
        />
      )}
    </>
  );
};

/** /profile for customers and providers. */
const ProfilePage = () => {
  const user = useAppSelector(selectCurrentUser);
  return user ? <Profile user={user} /> : <PageSkeleton />;
};

export default ProfilePage;
