import type { JobApiDto, MapCircleApiDto, NearbyJobApiDto, QuoteApiDto } from '../../../common/CommonApi';
import type { Coordinates } from '../../../common/CommonDto';
import type { Proficiency } from '../../../common/CommonEnum';

/* Wire format (snake_case, money in paise) of /jobs/*. App-side inputs are in ₹ and camelCase. */

export interface AttachmentApiDto {
  id: string;
  content_type: string;
  url: string;
}

export interface CustomerQuoteApiDto extends QuoteApiDto {
  provider_label: string;
  proficiency: Proficiency | null;
  years_experience: number | null;
  approx_distance_km: number | null;
}

export interface JobDetailApiDto extends JobApiDto {
  attachments: AttachmentApiDto[];
  quotes: CustomerQuoteApiDto[];
}

export interface NearbyJobDetailApiDto extends NearbyJobApiDto {
  attachments: AttachmentApiDto[];
  can_quote: boolean;
}

export interface NearbyJobsApiDto {
  area: MapCircleApiDto | null;
  categories: { id: string; name: string }[];
  jobs: NearbyJobApiDto[];
}

/** Everything the customer fills in; drafts may leave fields empty */
export interface JobInput {
  title?: string;
  description?: string | null;
  categoryId?: string | null;
  coordinates?: Coordinates | null;
  pincode?: string | null;
  areaName?: string | null;
  /** ₹ */
  budget?: number | null;
  /** ISO date-time with timezone */
  scheduledAt?: string | null;
  durationMins?: number | null;
  isEmergency?: boolean;
  /** true posts the job to nearby providers */
  submit: boolean;
}

export interface NearbyFilters {
  categoryId?: string;
  maxKm?: number;
  hasBudget?: boolean;
  urgentOnly?: boolean;
}
