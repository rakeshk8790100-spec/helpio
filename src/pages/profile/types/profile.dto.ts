import type { AddressLabel } from '../../../common/CommonEnum';

/* Wire format (snake_case) of /customers/me/addresses. */

export interface AddressApiDto {
  id: string;
  label: AddressLabel;
  address_line: string | null;
  area_name: string;
  pincode: string;
  latitude: number | null;
  longitude: number | null;
  is_default: boolean;
}
