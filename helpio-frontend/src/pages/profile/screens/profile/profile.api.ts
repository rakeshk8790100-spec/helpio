import type { Address, Coordinates } from '../../common/CommonDto';
import type { AddressLabel } from '../../common/CommonEnum';
import { baseApi } from '../../config/base_service/base.api';
import type { AddressApiDto } from './types/profile.dto';

export interface AddressInput {
  label: AddressLabel;
  addressLine: string | null;
  areaName: string;
  pincode: string;
  coordinates: Coordinates | null;
  isDefault?: boolean;
}

const toAddresses = (dto: AddressApiDto[]): Address[] =>
  dto.map((a) => ({
    id: a.id,
    label: a.label,
    addressLine: a.address_line,
    areaName: a.area_name,
    pincode: a.pincode,
    coordinates: a.latitude !== null && a.longitude !== null ? { latitude: a.latitude, longitude: a.longitude } : null,
    isDefault: a.is_default,
  }));

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

/** Customer saved addresses. Every change returns the whole list (default first). */
export const profileApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAddresses: builder.query<Address[], void>({
      query: () => '/customers/me/addresses',
      transformResponse: toAddresses,
      providesTags: ['Addresses'],
    }),
    addAddress: builder.mutation<Address[], AddressInput>({
      query: (input) => ({ url: '/customers/me/addresses', method: 'POST', body: toBody(input) }),
      transformResponse: toAddresses,
      // Search defaults to the default address
      invalidatesTags: ['Addresses', 'Providers'],
    }),
    updateAddress: builder.mutation<Address[], Partial<AddressInput> & { id: string }>({
      query: ({ id, ...input }) => ({ url: `/customers/me/addresses/${id}`, method: 'PATCH', body: toBody(input) }),
      transformResponse: toAddresses,
      invalidatesTags: ['Addresses', 'Providers'],
    }),
    deleteAddress: builder.mutation<Address[], string>({
      query: (id) => ({ url: `/customers/me/addresses/${id}`, method: 'DELETE' }),
      transformResponse: toAddresses,
      invalidatesTags: ['Addresses', 'Providers'],
    }),
  }),
  overrideExisting: false,
});

export const { useGetAddressesQuery, useAddAddressMutation, useUpdateAddressMutation, useDeleteAddressMutation } =
  profileApi;
