import type { ComponentProps } from 'react';
import type { FormInstance } from 'antd';
import type { Address } from '../../../common/CommonDto';
import type { AddressLabel } from '../../../common/CommonEnum';
import type { CurrentLocationButton } from '../../../component/marketplace';
import type { WithStatus } from '../layout.types';

/* Contract between pages/profile (behaviour) and client/default/profile (markup). */

export interface DetailsFormValues {
  name: string;
  /** 10 digits, without +91 */
  phone: string;
}

export interface PasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface BioFormValues {
  bio: string;
}

/** A bottom-sheet form: open state, the antd form and its submit */
export interface FormSheet<T> {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  form: FormInstance<T>;
  initialValues: Partial<T>;
  saving: boolean;
  error?: string;
  onSubmit: (values: T) => void;
}

export interface ProfileLayoutProps {
  account: {
    name: string;
    email: string;
    /** "+91 98765 43210", or null when missing */
    phone: string | null;
    roleLabel: string;
    avatarUrl: string | null;
    uploading: boolean;
    onPickPhoto: (file: File) => void;
    onRemovePhoto: (() => void) | null;
  };
  details: FormSheet<DetailsFormValues>;
  password: FormSheet<PasswordFormValues>;
  /** Customers only */
  addresses: WithStatus<{
    items: { address: Address; onEdit: () => void; onMakeDefault: () => void; onDelete: () => void }[];
    max: number;
    onAdd: () => void;
  }> | null;
  /** Customers only: e.g. "3 of 8 picked"; opens the favourites popup to edit */
  favorites: { hint: string; onOpen: () => void } | null;
  /** Providers only */
  provider: {
    bio: string | null;
    bioSheet: FormSheet<BioFormValues>;
    skillsHint: string;
    areaHint: string;
    onSkills: () => void;
    onArea: () => void;
    onPreview: () => void;
  } | null;
  loggingOut: boolean;
  onLogout: () => void;
}

export interface AddressFormValues {
  label: AddressLabel;
  addressLine?: string;
  pincode: string;
  areaName: string;
  isDefault: boolean;
}

/** Add or edit one saved address in a bottom sheet */
export interface AddressEditorProps {
  open: boolean;
  isNew: boolean;
  form: FormInstance<AddressFormValues>;
  initialValues: Partial<AddressFormValues>;
  location: ComponentProps<typeof CurrentLocationButton>;
  saving: boolean;
  error?: string;
  onSubmit: (values: AddressFormValues) => void;
  onClose: () => void;
}
