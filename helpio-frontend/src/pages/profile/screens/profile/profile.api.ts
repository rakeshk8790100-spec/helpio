import { toAddresses } from '@/common/CommonApi';
import type { Address, Coordinates } from '@/common/CommonDto';
import type { AddressLabel } from '@/common/CommonEnum';
import { baseApi } from '@/config/base_service/base.api';
import { APIS } from '@/config/base_service/http.config';
import { replaceUrlPlaceholders } from '@/lib/utils';

export interface AddressInput {
  label: AddressLabel;
  addressLine: string | null;
  areaName: string;
  pincode: string;
  coordinates: Coordinates | null;
  isDefault?: boolean;
}

const toBody = (input: Partial<AddressInput>) => ({
  ...(input.label !== undefined && { label: input.label }),
  ...(input.addressLine !== undefined && { address_line: input.addressLine }),
  ...(input.areaName !== undefined && { area_name: input.areaName }),
  ...(input.pincode !== undefined && { pincode: input.pincode }),
  ...(input.coordinates !== undefined && {
    latitude: input.coordinates?.latitude ?? null,
    longitude: input.coordinates?.longitude ?? null,
  }),
  ...(input.isDefault !== undefined && { is_default: input.isDefault }),
});

/** Changing saved addresses (listing them is in CommonApi). Every change returns the whole list (default first). */
export const profileApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    addAddress: builder.mutation<Address[], AddressInput>({
      query: (input) => ({ url: APIS.CUSTOMER.ADDRESSES, method: 'POST', body: toBody(input) }),
      transformResponse: toAddresses,
      // Search defaults to the default address
      invalidatesTags: ['Addresses', 'Providers'],
    }),
    updateAddress: builder.mutation<Address[], Partial<AddressInput> & { id: string }>({
      query: ({ id, ...input }) => ({ url: replaceUrlPlaceholders(APIS.CUSTOMER.ADDRESS, { id }), method: 'PATCH', body: toBody(input) }),
      transformResponse: toAddresses,
      invalidatesTags: ['Addresses', 'Providers'],
    }),
    deleteAddress: builder.mutation<Address[], string>({
      query: (id) => ({ url: replaceUrlPlaceholders(APIS.CUSTOMER.ADDRESS, { id }), method: 'DELETE' }),
      transformResponse: toAddresses,
      invalidatesTags: ['Addresses', 'Providers'],
    }),
  }),
  overrideExisting: false,
});

export const { useAddAddressMutation, useUpdateAddressMutation, useDeleteAddressMutation } = profileApi;
