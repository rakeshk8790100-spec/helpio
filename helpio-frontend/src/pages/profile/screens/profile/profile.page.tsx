import { App, Form } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProfileLayout } from '@/clients';
import { useChangePasswordMutation, useGetSkillCatalogQuery, useLogoutMutation, useRemoveAvatarMutation, useUpdateMeMutation, useUploadAvatarMutation, useGetAddressesQuery } from '@/common/CommonApi';
import type { Address, AuthUser } from '@/common/CommonDto';
import { UserRole } from '@/common/CommonEnum';
import { ROLE_LABEL } from '@/common/CommonLabels';
import { PageSkeleton } from '@/components/ui';
import SuspenseWrapper from '@/components/wrapper/SuspenseWrapper';
import { RouterKeys, toPath } from '@/config/router/RouterKeys';
import { apiErrorMessage } from '@/lib/apiError';
import { AVATAR_MEDIA, pickMedia } from '@/lib/media';
import { formatDays, formatDistance, formatTime } from '@/lib/utils';
import { MAX_FAVORITES } from '@/pages/customer/screens/favorites/types/favorites.enum';
import { useGetOnboardingQuery, useUpdateBioMutation } from '@/pages/onboarding/onboarding.api';
import { useAppDispatch, useAppSelector } from '@/redux';
import { favoritesEditorOpened, selectCurrentUser } from '@/redux/authSlice';
import AddAddressForm from './form/addAddressForm';
import { useDeleteAddressMutation, useUpdateAddressMutation } from './profile.api';
import type { BioFormValues, DetailsFormValues, PasswordFormValues, ProfileLayoutProps } from './types/profile.dto';

const MAX_ADDRESSES = 5;

type Sheet = 'details' | 'password' | 'bio' | null;

/** "+919876543210" → "+91 98765 43210" */
const formatPhone = (phone: string | null) => (phone ? `${phone.slice(0, 3)} ${phone.slice(3, 8)} ${phone.slice(8)}` : null);

/** Which address the editor shows: `undefined` closed, `null` a new one */
export type EditingAddress = Address | null | undefined;

/**
 * /profile for both roles: account details and photo, password, then saved addresses (customers) or public bio,
 * skills and service area (providers). The address editor is a separate sheet, opened through `editAddress`.
 */
const useProfile = (user: AuthUser) => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const isProvider = user.role === UserRole.PROVIDER;
  const dispatch = useAppDispatch();
  const addresses = useGetAddressesQuery(undefined, { skip: isProvider });
  const onboarding = useGetOnboardingQuery(undefined, { skip: !isProvider });
  const catalog = useGetSkillCatalogQuery(undefined, { skip: !isProvider });
  const [updateMe, { isLoading: savingDetails }] = useUpdateMeMutation();
  const [changePassword, { isLoading: savingPassword }] = useChangePasswordMutation();
  const [uploadAvatar, { isLoading: uploading }] = useUploadAvatarMutation();
  const [removeAvatar] = useRemoveAvatarMutation();
  const [updateAddress] = useUpdateAddressMutation();
  const [deleteAddress] = useDeleteAddressMutation();
  const [updateBio, { isLoading: savingBio }] = useUpdateBioMutation();
  const [logout, { isLoading: loggingOut }] = useLogoutMutation();
  const [detailsForm] = Form.useForm<DetailsFormValues>();
  const [passwordForm] = Form.useForm<PasswordFormValues>();
  const [bioForm] = Form.useForm<BioFormValues>();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [sheetError, setSheetError] = useState<string>();
  const [editingAddress, setEditingAddress] = useState<EditingAddress>(undefined);

  const open = (name: Sheet) => () => {
    setSheetError(undefined);
    setSheet(name);
  };
  const close = () => setSheet(null);
  const run = async (action: () => Promise<unknown>, done: string) => {
    setSheetError(undefined);
    try {
      await action();
      message.success(done);
      close();
    } catch (e) {
      setSheetError(apiErrorMessage(e));
    }
  };
  const quietly = async (action: () => Promise<unknown>, done: string) => {
    try {
      await action();
      message.success(done);
    } catch (e) {
      message.error(apiErrorMessage(e));
    }
  };

  const skillNames = (() => {
    const names = new Map((catalog.data ?? []).flatMap((c) => c.skills.map((s) => [s.id, s.name] as const)));
    const skills = onboarding.data?.skills ?? [];
    const shown = skills.slice(0, 3).map((s) => names.get(s.skillId) ?? s.skillId).join(', ');
    return skills.length > 3 ? `${shown} +${skills.length - 3} more` : shown || 'Add your skills';
  })();
  const area = onboarding.data?.serviceArea;
  const slots = onboarding.data?.availability ?? [];
  const areaHint = area
    ? [
        `${area.areaName} · ${formatDistance(area.radiusM)}`,
        slots[0] ? `${formatDays(slots.map((s) => s.day))}, ${formatTime(slots[0].start)}–${formatTime(slots[0].end)}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : 'Set where and when you work';

  const layout: ProfileLayoutProps = {
    account: {
      name: user.name ?? user.email,
      email: user.email,
      phone: formatPhone(user.phone),
      roleLabel: ROLE_LABEL[user.role],
      avatarUrl: user.avatarUrl,
      uploading,
      onPickPhoto: (file) => {
        if (!pickMedia([file], AVATAR_MEDIA, 0).accepted.length) return void message.error(AVATAR_MEDIA.hint);
        void quietly(() => uploadAvatar(file).unwrap(), 'Profile photo updated.');
      },
      onRemovePhoto: user.avatarUrl ? () => void quietly(() => removeAvatar().unwrap(), 'Profile photo removed.') : null,
    },
    details: {
      open: sheet === 'details',
      onOpen: open('details'),
      onClose: close,
      form: detailsForm,
      initialValues: { name: user.name ?? '', phone: user.phone?.replace(/^\+91/, '') ?? '' },
      saving: savingDetails,
      error: sheet === 'details' ? sheetError : undefined,
      onSubmit: ({ name, phone }) => void run(() => updateMe({ name: name.trim(), phone }).unwrap(), 'Details saved.'),
    },
    password: {
      open: sheet === 'password',
      onOpen: open('password'),
      onClose: close,
      form: passwordForm,
      initialValues: {},
      saving: savingPassword,
      error: sheet === 'password' ? sheetError : undefined,
      onSubmit: ({ currentPassword, newPassword }) =>
        void run(
          () => changePassword({ currentPassword, newPassword }).unwrap(),
          'Password changed. Other devices have been signed out.',
        ),
    },
    addresses: isProvider
      ? null
      : addresses.isLoading
        ? { status: 'loading' }
        : !addresses.data
          ? { status: 'error', message: apiErrorMessage(addresses.error), onRetry: addresses.refetch }
          : {
              status: 'ready',
              max: MAX_ADDRESSES,
              onAdd: () => setEditingAddress(null),
              items: addresses.data.map((address) => ({
                address,
                onEdit: () => setEditingAddress(address),
                onMakeDefault: () =>
                  void quietly(() => updateAddress({ id: address.id, isDefault: true }).unwrap(), 'Default address updated.'),
                onDelete: () => void quietly(() => deleteAddress(address.id).unwrap(), 'Address removed.'),
              })),
            },
    favorites: isProvider
      ? null
      : {
          hint: user.favoriteSkillIds.length
            ? `${user.favoriteSkillIds.length} of ${MAX_FAVORITES} picked`
            : 'Pick services to see matching pros on home',
          onOpen: () => dispatch(favoritesEditorOpened()),
        },
    provider: isProvider
      ? {
          bio: onboarding.data?.bio ?? null,
          bioSheet: {
            open: sheet === 'bio',
            onOpen: open('bio'),
            onClose: close,
            form: bioForm,
            initialValues: { bio: onboarding.data?.bio ?? '' },
            saving: savingBio,
            error: sheet === 'bio' ? sheetError : undefined,
            onSubmit: ({ bio }) => void run(() => updateBio(bio?.trim() ?? '').unwrap(), 'Your profile is updated.'),
          },
          skillsHint: skillNames,
          areaHint,
          onSkills: () => navigate(RouterKeys.PROFILE_SKILLS),
          onArea: () => navigate(RouterKeys.PROFILE_AREA),
          onPreview: () => navigate(toPath(RouterKeys.PRO_PROFILE, { id: user.id })),
        }
      : null,
    loggingOut,
    onLogout: async () => {
      window.google?.accounts.id.disableAutoSelect();
      await logout();
      void navigate(RouterKeys.HOME);
    },
  };

  return { layout, editingAddress, closeAddress: () => setEditingAddress(undefined) };
};

const Profile = ({ user }: { user: AuthUser }) => {
  const { layout, editingAddress, closeAddress } = useProfile(user);
  const addresses = layout.addresses?.status === 'ready' ? layout.addresses.items : [];
  return (
    <SuspenseWrapper>
      <ProfileLayout {...layout} />
      {editingAddress !== undefined && (
        // Keyed so each address (or a new one) gets a fresh form and location
        <AddAddressForm
          key={editingAddress?.id ?? 'new'}
          address={editingAddress}
          isFirst={addresses.length === 0}
          onClose={closeAddress}
        />
      )}
    </SuspenseWrapper>
  );
};

/** /profile for customers and providers. */
const ProfilePage = () => {
  const user = useAppSelector(selectCurrentUser);
  return user ? <Profile user={user} /> : <PageSkeleton />;
};

export default ProfilePage;
