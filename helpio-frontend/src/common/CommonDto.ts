import type {
  AddressLabel,
  ApprovalStatus,
  ChecklistState,
  InviteStatus,
  JobEventType,
  JobStatus,
  MilestoneStatus,
  OnboardingStatus,
  PaymentAttemptStatus,
  PaymentStatus,
  PayoutStatus,
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
  /** Customers only: favourite services (catalog skill ids), oldest first */
  favoriteSkillIds: string[];
  /** Customers only: services they typed that aren't in the catalog yet; they count toward the 8 */
  favoriteRequests: FavoriteRequest[];
  /** Customers only: show the favourites popup after sign-in */
  favoritesPromptOpen: boolean;
  /** Admins only: the owner, who manages other admins and the API keys */
  isOwner: boolean;
  /** `pending`: a provider waiting for Helpio's verification (customers can't sign in until approved) */
  approvalStatus: ApprovalStatus;
}

/** The customer's favourite services, as every favourites call returns them */
/** A service the customer typed because it isn't in the catalog; waiting for an admin to add it */
export interface FavoriteRequest {
  id: string;
  name: string;
}

export interface Favorites {
  skillIds: string[];
  requests: FavoriteRequest[];
  promptOpen: boolean;
}

/** A new customer account waiting for an admin: no session until it's approved */
export interface PendingApproval {
  pendingApproval: true;
  email: string;
}

/** What a sign-up code or Google sign-in returns */
export type SignInResult = AuthSession | PendingApproval;

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
  /** Flat, building and street: shared only with the hired pro */
  addressLine: string | null;
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
  /** After hire: the first stage (1–4) not yet approved and its state; null before hire or once all are approved */
  milestoneStage: number | null;
  milestoneStatus: MilestoneStatus | null;
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
  durationMins: number | null;
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
  /** Opens the pro's public profile */
  providerId: string;
  /** e.g. "Ravi S." */
  providerLabel: string;
  avatarUrl: string | null;
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

/** The pro whose quote the customer accepted */
export interface HiredPro {
  providerId: string;
  providerLabel: string;
  avatarUrl: string | null;
  amount: number;
}

export interface JobDetail extends Job {
  attachments: JobAttachment[];
  quotes: CustomerQuote[];
  invites: JobInvite[];
  hired: HiredPro | null;
  /** Hired, not started yet: shared with the pro at the door */
  startPin: string | null;
  /** The pro entered a wrong PIN too often; a new PIN unlocks it */
  pinLocked: boolean;
  startedAt: string | null;
  unreadMessages: number;
}

export interface NearbyJobDetail extends NearbyJob {
  attachments: JobAttachment[];
  canQuote: boolean;
  /** My quote was accepted: the exact place and the customer's name are shared from here on */
  hired: boolean;
  exactLocation: {
    coordinates: Coordinates | null;
    pincode: string | null;
    areaName: string | null;
    addressLine: string | null;
  } | null;
  customerName: string | null;
  startedAt: string | null;
  unreadMessages: number;
  /** How pros rated this customer */
  customerRating: RatingSummary;
}

/* ── Progress: four 25% stages ─────────── */

/** One attempt at a stage: the pro's photos and note, and the customer's answer */
export interface MilestoneSubmission {
  id: string;
  note: string;
  photos: JobAttachment[];
  submittedAt: string;
  /** `submitted` while waiting for the customer */
  reviewStatus: MilestoneStatus;
  /** The customer's reason when asking for changes */
  reviewNote: string | null;
  reviewedAt: string | null;
}

export interface Milestone {
  stage: number;
  /** 25, 50, 75 or 100 */
  percent: number;
  status: MilestoneStatus;
  /** This stage's share of the hired quote, ₹ */
  amount: number;
  approvedAt: string | null;
  /** When this quarter of the work should be done; null until the pro sets an estimate */
  dueAt: string | null;
  /** Minutes spent fixing after the customer asked for changes (not charged) */
  extraMins: number;
  /** Oldest first; the last one is the current attempt */
  submissions: MilestoneSubmission[];
}

export interface JobEvent {
  id: string;
  type: JobEventType;
  /** "You", "Ravi S." or "Asha K."; null for system entries */
  actorLabel: string | null;
  stage: number | null;
  reason: string | null;
  /** Payments: ₹ paid */
  amount: number | null;
  /** Reviews: 1 to 5 */
  rating: number | null;
  createdAt: string;
}

export interface JobProgress {
  jobId: string;
  jobTitle: string;
  jobStatus: JobStatus;
  progressPct: number;
  /** The hired quote and the approved stages' share of it, ₹ */
  amount: number;
  earned: number;
  /** The first stage not yet approved; null when all are */
  currentStage: number | null;
  /** The pro's estimate for the whole job, set when starting */
  estimatedMins: number | null;
  startedAt: string | null;
  /** Fixing time across all stages (not charged) */
  extraMinsTotal: number;
  milestones: Milestone[];
  /** Newest first */
  events: JobEvent[];
}

/** A job the provider was hired for, with its progress */
export interface ProviderJob extends NearbyJob {
  customerName: string | null;
  startedAt: string | null;
  amount: number;
  earned: number;
  milestoneStage: number | null;
  milestoneStatus: MilestoneStatus | null;
  /** The current stage's target time */
  nextDueAt: string | null;
  unreadMessages: number;
}

/* ── Paying after 100% (Razorpay) and reviews ── */

/** One try on Razorpay's page */
export interface PaymentAttempt {
  id: string;
  status: PaymentAttemptStatus;
  /** "upi" or "netbanking" */
  method: string | null;
  /** ₹ */
  amount: number;
  /** Razorpay's reason when it failed */
  errorDescription: string | null;
  attemptedAt: string;
}

export interface JobPayment {
  jobId: string;
  jobStatus: JobStatus;
  /** The hired quote, ₹ */
  amount: number;
  /** The latest payment link; null until the customer first taps Pay */
  paymentId: string | null;
  status: PaymentStatus | null;
  /** Razorpay's reason for the latest failed try, while the payment is still open */
  lastError: string | null;
  expiresAt: string | null;
  paidAt: string | null;
  method: string | null;
  /** Oldest first */
  attempts: PaymentAttempt[];
  /** The pro only: Helpio's transfer to them */
  payout: { status: PayoutStatus; reference: string | null; sentAt: string | null } | null;
  canPay: boolean;
}

export interface RatingSummary {
  /** One decimal, e.g. 4.6; null with no reviews yet */
  average: number | null;
  count: number;
}

export interface JobReview {
  id: string;
  rating: number;
  comment: string | null;
  /** "You", "Ravi S." or "Asha K." */
  reviewerLabel: string;
  reviewerRole: UserRole;
  createdAt: string;
}

export interface JobReviews {
  /** From 100% approval until I've reviewed */
  canReview: boolean;
  mine: JobReview | null;
  /** The other side's review of me */
  theirs: JobReview | null;
}

/** A customer's review on a pro's public profile */
export interface PublicReview {
  id: string;
  rating: number;
  comment: string | null;
  /** "Asha K." */
  reviewerLabel: string;
  createdAt: string;
}

/* ── Notifications ──────────────────────── */

export interface AppNotification {
  id: string;
  /** e.g. "milestone_submitted" */
  type: string;
  title: string;
  body: string;
  jobId: string | null;
  /** App path to open, e.g. "/jobs/<id>" */
  link: string | null;
  read: boolean;
  createdAt: string;
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

/** A paid job, as the pro sees it: what the customer paid (₹) and whether Helpio has sent it on */
export interface EarningItem {
  paymentId: string;
  jobId: string;
  jobTitle: string;
  amount: number;
  paidAt: string | null;
  method: string | null;
  payoutStatus: PayoutStatus;
  /** UTR or UPI reference of Helpio's transfer */
  payoutReference: string | null;
  payoutAt: string | null;
}

export interface ProviderEarnings {
  /** ₹: everything customers have paid, the last 7 days, still to be sent on, already sent */
  total: number;
  week: number;
  toReceive: number;
  received: number;
  /** Latest payment first */
  items: EarningItem[];
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
  /** Customers' ratings after finished jobs */
  rating: RatingSummary;
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
  /** Newest first, up to 10 */
  reviews: PublicReview[];
}

/* ── Job chat (customer and hired pro) ──── */

export interface ChatMessage {
  id: string;
  body: string;
  mine: boolean;
  senderName: string;
  createdAt: string;
}

export interface JobChat {
  jobId: string;
  jobTitle: string;
  /** The other person, e.g. "Ravi S." */
  otherName: string;
  otherAvatarUrl: string | null;
  messages: ChatMessage[];
}

/* ── Screen states ──────────────────────── */

/** Layout props wrapper: while loading, a layout needs nothing but the flag. */
export type WithLoading<T> = { loading: true } | ({ loading: false } & T);

/** A section with its own request: loading, failed (with retry) or ready. */
export type WithStatus<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string; onRetry: () => void }
  | ({ status: 'ready' } & T);
