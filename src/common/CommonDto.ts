import type {
  AddressLabel,
  ChecklistState,
  InviteStatus,
  JobStatus,
  OnboardingStatus,
  Proficiency,
  QuoteStatus,
  UserRole,
} from './CommonEnum';

/* Shared entities used by pages and by reusable components in src/component. */

/* ── Catalogue ──────────────────────────── */

export interface Category {
  id: string;
  name: string;
  /** Icon key, resolved to a lucide icon in CategoryGrid */
  icon: string;
}

export interface Service {
  id: string;
  name: string;
  categoryId: string;
  fromPrice: number;
  rating: number;
  reviews: number;
  durationMins: number;
}

/* ── Marketing / landing ────────────────── */

export interface PlatformStat {
  label: string;
  value: string;
}

export interface EarningRate {
  skillId: string;
  skillName: string;
  /** Average provider earning per working hour, in ₹ */
  hourlyAvg: number;
}

export interface Testimonial {
  id: string;
  name: string;
  role: UserRole;
  text: string;
  rating: number;
  /** e.g. "AC repair · Koramangala" or "Electrician · 2 yrs on Helpio" */
  meta: string;
}

export interface FaqItem {
  q: string;
  a: string;
}

/* ── Auth ───────────────────────────────── */

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  /** E.164, e.g. +919876543210 */
  phone: string | null;
  role: UserRole;
  avatarUrl: string | null;
  /** Providers only; null for customers */
  onboardingStatus: OnboardingStatus | null;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

/* ── Provider onboarding ────────────────── */

export interface SkillOption {
  id: string;
  name: string;
}

export interface SkillCategory {
  id: string;
  name: string;
  icon: string;
  skills: SkillOption[];
}

export interface ProviderSkill {
  skillId: string;
  proficiency: Proficiency;
  yearsExperience: number | null;
}

/** One working day: `day` 0 = Monday … 6 = Sunday, times as "HH:MM" (24h) */
export interface AvailabilitySlot {
  day: number;
  start: string;
  end: string;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface ServiceArea {
  latitude: number | null;
  longitude: number | null;
  pincode: string;
  areaName: string;
  /** Travel radius in metres */
  radiusM: number;
}

export interface ProviderOnboarding {
  status: OnboardingStatus;
  /** Shown on the public profile */
  bio: string | null;
  skills: ProviderSkill[];
  availability: AvailabilitySlot[];
  serviceArea: ServiceArea | null;
}

/* ── Jobs (money in ₹) ───────────────────── */

/** A customer's own job, with a summary of the quotes it has received */
export interface Job {
  id: string;
  title: string;
  description: string | null;
  categoryId: string | null;
  categoryName: string | null;
  /** Exact spot: the customer's own view only */
  coordinates: Coordinates | null;
  areaName: string | null;
  pincode: string | null;
  budget: number | null;
  /** ISO date-time */
  scheduledAt: string | null;
  durationMins: number | null;
  isEmergency: boolean;
  status: JobStatus;
  /** Approved work: 0, 25, 50, 75 or 100 */
  progressPct: number;
  /** Quotes waiting for the customer's decision */
  quoteCount: number;
  lowestQuote: number | null;
  updatedAt: string;
  /** Last change after posting; null if never edited */
  editedAt: string | null;
}

export interface JobQuote {
  id: string;
  jobId: string;
  amount: number;
  message: string | null;
  status: QuoteStatus;
}

/** A job as a provider sees it before hire: customer and address masked */
export interface NearbyJob {
  id: string;
  title: string;
  description: string | null;
  categoryName: string | null;
  areaName: string | null;
  /** Rounded to 0.5 km; null when matched by pincode only */
  approxDistanceKm: number | null;
  /** First name and initial, e.g. "Asha K." */
  customerLabel: string;
  budget: number | null;
  scheduledAt: string | null;
  isEmergency: boolean;
  status: JobStatus;
  progressPct: number;
  quoteCount: number;
  myQuote: JobQuote | null;
  /** The customer changed the job after my quote was sent */
  editedAfterMyQuote: boolean;
  /** The customer asked me directly; null when found nearby */
  inviteStatus: InviteStatus | null;
  inviteMessage: string | null;
  /** Approximate area, offset from the real spot; null when posted without a location */
  areaCircle: MapCircle | null;
}

/** A circle on the map: a provider's travel area, or a job's approximate area */
export interface MapCircle {
  latitude: number;
  longitude: number;
  radiusM: number;
}

export interface JobAttachment {
  id: string;
  contentType: string;
  /** Cloudinary URL */
  url: string;
}

/** A quote as the job's customer sees it before hire */
export interface CustomerQuote extends JobQuote {
  /** e.g. "Ravi S." */
  providerLabel: string;
  proficiency: Proficiency | null;
  yearsExperience: number | null;
  approxDistanceKm: number | null;
}

/** A pro the customer sent the job to directly */
export interface JobInvite {
  providerId: string;
  /** e.g. "Ravi S." */
  providerLabel: string;
  avatarUrl: string | null;
  status: InviteStatus;
}

export interface JobDetail extends Job {
  attachments: JobAttachment[];
  quotes: CustomerQuote[];
  invites: JobInvite[];
}

export interface NearbyJobDetail extends NearbyJob {
  attachments: JobAttachment[];
  canQuote: boolean;
}

export interface NearbyJobs {
  /** The provider's own centre and travel radius; null without coordinates */
  area: MapCircle | null;
  /** The provider's skill categories, for filtering */
  categories: { id: string; name: string }[];
  jobs: NearbyJob[];
}

export interface CustomerHome {
  activeJob: Job | null;
  awaitingDecision: Job[];
  waitingForQuotes: Job[];
  drafts: Job[];
}

export interface ChecklistItem {
  key: string;
  label: string;
  state: ChecklistState;
}

export interface ProviderHome {
  onboardingStatus: OnboardingStatus;
  checklist: ChecklistItem[];
  canQuote: boolean;
  activeJob: NearbyJob | null;
  quotes: { pending: number; accepted: number; rejected: number };
  /** Direct requests waiting for my quote */
  invites: NearbyJob[];
  nearby: NearbyJob[];
  nearbyCount: number;
  earnings: { week: number; wallet: number };
}

/* ── Customer addresses ─────────────────── */

export interface Address {
  id: string;
  label: AddressLabel;
  /** Full address: shared with a pro only after hire */
  addressLine: string | null;
  areaName: string;
  pincode: string;
  coordinates: Coordinates | null;
  isDefault: boolean;
}

/* ── Provider directory (public: no exact location, pincode or phone) ── */

export interface PublicSkill {
  skillId: string;
  name: string;
  categoryId: string;
  categoryName: string;
  proficiency: Proficiency;
  yearsExperience: number | null;
}

export interface ProviderCard {
  id: string;
  /** e.g. "Ravi S." */
  displayName: string;
  avatarUrl: string | null;
  bioSnippet: string | null;
  areaName: string | null;
  /** Rounded to 0.5 km; null when matched by pincode only */
  approxDistanceKm: number | null;
  /** Skills matching the search first, up to 3 */
  skills: PublicSkill[];
  skillCount: number;
  topProficiency: Proficiency;
  maxYearsExperience: number | null;
  /** 0 = Monday */
  workDays: number[];
  memberSince: string;
}

export interface ProviderSearchResult {
  /** Area the search was made from, e.g. "Mira Road" */
  near: string | null;
  providers: ProviderCard[];
  total: number;
  hasMore: boolean;
}

export interface ProviderProfile extends ProviderCard {
  bio: string | null;
  categories: { id: string; name: string; skills: PublicSkill[] }[];
  availability: AvailabilitySlot[];
  radiusKm: number | null;
}
