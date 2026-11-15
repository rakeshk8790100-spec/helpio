import type { RatingSummary } from '@/common/CommonDto';
import type { Proficiency } from '@/common/CommonEnum';

/* Wire format (snake_case) of /providers/search and /providers/{id}. */

export interface PublicSkillApiDto {
  skill_id: string;
  name: string;
  category_id: string;
  category_name: string;
  proficiency: Proficiency;
  years_experience: number | null;
}

export interface ProviderCardApiDto {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio_snippet: string | null;
  area_name: string | null;
  approx_distance_km: number | null;
  skills: PublicSkillApiDto[];
  skill_count: number;
  top_proficiency: Proficiency;
  max_years_experience: number | null;
  work_days: number[];
  member_since: string;
  rating: RatingSummary;
}

export interface ProviderSearchApiDto {
  near: string | null;
  providers: ProviderCardApiDto[];
  total: number;
  page: number;
  has_more: boolean;
}

export interface ProviderProfileApiDto extends ProviderCardApiDto {
  bio: string | null;
  categories: { id: string; name: string; skills: PublicSkillApiDto[] }[];
  availability: { day: number; start: string; end: string }[];
  radius_km: number | null;
  reviews: { id: string; rating: number; comment: string | null; reviewer_label: string; created_at: string }[];
}

/** Where to search from: a saved address (default when omitted), a point or a pincode */
export interface ProviderSearchArgs {
  q?: string;
  categoryId?: string;
  /** Only pros offering these services (e.g. the customer's favourites) */
  skillIds?: string[];
  addressId?: string;
  latitude?: number;
  longitude?: number;
  page?: number;
}
