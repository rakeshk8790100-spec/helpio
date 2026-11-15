import { App, Form } from 'antd';
import { useState } from 'react';
import { AddressForm } from '@/clients';
import type { Address } from '@/common/CommonDto';
import { AddressLabel } from '@/common/CommonEnum';
import SuspenseWrapper from '@/components/wrapper/SuspenseWrapper';
import { useCurrentLocation } from '@/hooks/useCurrentLocation';
import { apiErrorMessage } from '@/lib/apiError';
import { useAddAddressMutation, useUpdateAddressMutation } from '@/pages/profile/screens/profile/profile.api';
import type { AddressEditorProps, AddressFormValues } from '@/pages/profile/screens/profile/types/profile.dto';

/**
 * The add/edit address sheet. Mount it keyed by the address so the form and location start fresh each time.
 * `address` null adds a new one; `isFirst` makes a first address the default.
 */
const useAddressEditor = (address: Address | null, isFirst: boolean, onClose: () => void): AddressEditorProps => {
  const { message } = App.useApp();
  const [form] = Form.useForm<AddressFormValues>();
  const location = useCurrentLocation(address?.coordinates ?? null);
  const [addAddress, { isLoading: adding }] = useAddAddressMutation();
  const [updateAddress, { isLoading: updating }] = useUpdateAddressMutation();
  const [error, setError] = useState<string>();

  return {
    open: true,
    isNew: address === null,
    form,
    initialValues: address
      ? {
          label: address.label,
          addressLine: address.addressLine ?? undefined,
          pincode: address.pincode,
          areaName: address.areaName,
          isDefault: address.isDefault,
        }
      : { label: AddressLabel.HOME, isDefault: isFirst },
    location,
    saving: adding || updating,
    error,
    onSubmit: async ({ label, addressLine, pincode, areaName, isDefault }) => {
      setError(undefined);
      const input = {
        label,
        addressLine: addressLine?.trim() || null,
        pincode,
        areaName: areaName.trim(),
        coordinates: location.coordinates,
      };
      try {
        if (address) {
          // Only "make default" is sent: turning it off would leave no default
          await updateAddress({ id: address.id, ...input, ...(isDefault && !address.isDefault && { isDefault: true }) }).unwrap();
        } else {
          await addAddress({ ...input, isDefault }).unwrap();
        }
        message.success(address ? 'Address updated.' : 'Address saved.');
        onClose();
      } catch (e) {
        setError(apiErrorMessage(e));
      }
    },
    onClose,
  };
};

interface Props {
  address: Address | null;
  isFirst: boolean;
  onClose: () => void;
}

/** Add or edit a saved address in a bottom sheet. */
const AddAddressForm = ({ address, isFirst, onClose }: Props) => (
  <SuspenseWrapper fallback={null}>
    <AddressForm {...useAddressEditor(address, isFirst, onClose)} />
  </SuspenseWrapper>
);

export default AddAddressForm;
