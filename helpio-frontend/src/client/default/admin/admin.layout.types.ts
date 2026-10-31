import type { FormInstance } from 'antd';
import type {
  AdminAccount,
  AdminCategory,
  AdminJobDetail,
  AdminJobRow,
  AdminPaymentRow,
  AdminPayout,
  AdminReviewRow,
  AdminUserDetail,
  AdminUserRow,
  ApprovalItem,
  AuditEntry,
} from '../../../common/CommonDto';
import type { ApprovalStatus, JobStatus } from '../../../common/CommonEnum';
import type { BadgeTone } from '../../../component/ui';
import type { WithStatus } from '../layout.types';
import type { EmailCodeStepProps } from '../auth/emailCodeStep.types';

/* Contract between pages/admin (behaviour) and client/default/admin (markup): the desktop admin console. */

// ----- Log-in: password, then the emailed code -----

export interface AdminLoginFormValues {
  email: string;
  password: string;
}

export interface AdminLoginLayoutProps {
  form: FormInstance<AdminLoginFormValues>;
  sending: boolean;
  error?: string;
  onSubmit: (values: AdminLoginFormValues) => void;
  /** After the password: the code emailed to the admin */
  code: EmailCodeStepProps | null;
  onRequestAccess: () => void;
}

// ----- Asking for access -----

export interface AccessRequestFormValues {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface AdminRequestAccessLayoutProps {
  form: FormInstance<AccessRequestFormValues>;
  sending: boolean;
  error?: string;
  onSubmit: (values: AccessRequestFormValues) => void;
  code: EmailCodeStepProps | null;
  /** Sent: waiting for the owner, or (the owner's own address) ready to log in */
  result: { email: string; approved: boolean } | null;
  onLogin: () => void;
}

// ----- Admins (the owner only) -----

export interface AdminRowAction {
  label: string;
  danger?: boolean;
  primary?: boolean;
  onClick: () => void;
}

export interface AdminRow {
  admin: AdminAccount;
  badge: { label: string; tone: BadgeTone };
  /** e.g. "Asked 28 Oct, 4:05 PM" */
  since: string;
  /** Empty for the owner */
  actions: AdminRowAction[];
  /** An action on this row is running */
  busy: boolean;
}

/** Rejecting needs a reason; deactivating can have one */
export interface ReasonDialogProps {
  title: string;
  okText: string;
  required: boolean;
  reason: string;
  onReasonChange: (value: string) => void;
  sending: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export type AdminsLayoutProps = WithStatus<{
  rows: AdminRow[];
  pendingCount: number;
  dialog: ReasonDialogProps | null;
}>;

// ----- Approvals: customers and providers waiting for an admin -----

export type ApprovalFilter = 'all' | 'customer' | 'provider';

export interface ApprovalRow {
  item: ApprovalItem;
  roleLabel: string;
  /** e.g. "Signed up 28 Oct, 4:05 PM" */
  signedUp: string;
  /** Providers: e.g. ["Tap & leak repair, Wiring +2", "Koramangala 560034 · up to 5 km", "Works Mon, Sat"] */
  details: string[];
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}

export type ApprovalsLayoutProps = WithStatus<{
  filter: { value: ApprovalFilter; options: { value: ApprovalFilter; label: string }[]; onChange: (value: ApprovalFilter) => void };
  rows: ApprovalRow[];
  emptyText: string;
  dialog: ReasonDialogProps | null;
}>;

// ----- Dashboard -----

export interface KpiItem {
  label: string;
  value: string;
  hint?: string;
  attention?: boolean;
  onClick?: () => void;
}

export type DashboardLayoutProps = WithStatus<{
  /** Users, jobs, money and reviews, in that order */
  kpis: KpiItem[];
  /** From the status page: everything running, or how many problems */
  health: { ok: boolean; text: string; onOpen: () => void } | null;
  jobs: { label: string; count: number }[];
  /** Newest first, e.g. "Asha Kumar approved 50%" */
  activity: { id: string; text: string; jobTitle: string; when: string }[];
}>;

// ----- System status -----

export interface HealthRow {
  name: string;
  label: string;
  badge: { label: string; tone: BadgeTone };
  message: string;
  /** e.g. "212 ms · checked 4:05 PM" */
  meta: string;
}

export type StatusLayoutProps = WithStatus<{
  summary: { ok: boolean; text: string };
  /** e.g. "Updated 4:05 PM · refreshes every 30 seconds" */
  updatedLabel: string;
  refreshing: boolean;
  onRefresh: () => void;
  services: HealthRow[];
  background: HealthRow[];
  attention: KpiItem[];
  errors: { id: string; when: string; count: number; route: string; errorType: string; message: string }[];
  /** e.g. "Development · version 0.1.0 · up since 28 Oct, 4:05 PM" */
  app: string;
}>;

// ----- Integrations and settings (the owner) -----

export interface SettingFieldView {
  key: string;
  label: string;
  help: string;
  kind: 'text' | 'secret' | 'int' | 'bool';
  /** What the input shows: the draft, or the value in force (secrets: empty, see placeholder) */
  value: string;
  placeholder?: string;
  source: { label: string; tone: BadgeTone };
  unreadable: boolean;
  onChange: (value: string) => void;
  /** Saved here: go back to the .env value */
  onReset?: () => void;
}

export interface SettingGroupView {
  id: string;
  title: string;
  description: string;
  fields: SettingFieldView[];
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  test: { running: boolean; result: { label: string; tone: BadgeTone; message: string } | null; onTest: () => void } | null;
}

export type SettingsLayoutProps = WithStatus<{
  groups: SettingGroupView[];
  /** No SETTINGS_ENCRYPTION_KEY on the server: secrets can't be saved here */
  secretsLocked: boolean;
}>;

// ----- Lists with server-side pages -----

export interface PagedList<T> {
  rows: T[];
  page: number;
  pageSize: number;
  total: number;
  fetching: boolean;
  onPageChange: (page: number) => void;
}

/** A side panel opened from a row: its own request, and a close button */
export type DrawerProps<T> = (WithStatus<T> & { onClose: () => void }) | null;

// ----- Customers and providers -----

export interface UsersLayoutProps {
  role: { value: 'all' | 'customer' | 'provider'; onChange: (value: 'all' | 'customer' | 'provider') => void };
  approval: { value: ApprovalStatus | null; onChange: (value: ApprovalStatus | null) => void };
  active: { value: 'all' | 'active' | 'off'; onChange: (value: 'all' | 'active' | 'off') => void };
  search: { value: string; onChange: (value: string) => void; onSearch: (value: string) => void };
  list: WithStatus<PagedList<AdminUserRow> & { onOpen: (id: string) => void }>;
  detail: DrawerProps<{ user: AdminUserDetail; busy: boolean; onDeactivate: () => void; onActivate: () => void; onSignOut: () => void }>;
  dialog: ReasonDialogProps | null;
}

// ----- Jobs -----

export interface JobsAdminLayoutProps {
  status: { value: JobStatus | null; onChange: (value: JobStatus | null) => void };
  search: { value: string; onChange: (value: string) => void; onSearch: (value: string) => void };
  list: WithStatus<PagedList<AdminJobRow> & { onOpen: (id: string) => void }>;
  detail: DrawerProps<{
    job: AdminJobDetail;
    onCancel: (() => void) | null;
    chat: { open: boolean; loading: boolean; messages: { id: string; sender: string; body: string; at: string }[] | null; onRead: () => void; onClose: () => void };
  }>;
  dialog: ReasonDialogProps | null;
}

// ----- Payments and payouts -----

export interface PaymentsLayoutProps {
  tab: { value: 'payments' | 'payouts'; onChange: (value: 'payments' | 'payouts') => void };
  paymentStatus: { value: string | null; onChange: (value: string | null) => void };
  payments: WithStatus<PagedList<AdminPaymentRow> & { recheckingId: string | null; onRecheck: (id: string) => void }>;
  payoutStatus: { value: 'pending' | 'paid'; onChange: (value: 'pending' | 'paid') => void };
  payouts: WithStatus<{ rows: AdminPayout[]; onMarkSent: (payout: AdminPayout) => void }>;
  markSent: {
    payout: AdminPayout;
    reference: string;
    onReferenceChange: (value: string) => void;
    sending: boolean;
    error?: string;
    onConfirm: () => void;
    onCancel: () => void;
  } | null;
}

// ----- Reviews -----

export interface ReviewsAdminLayoutProps {
  visibility: { value: 'all' | 'visible' | 'hidden'; onChange: (value: 'all' | 'visible' | 'hidden') => void };
  stars: { value: number | null; onChange: (value: number | null) => void };
  list: WithStatus<PagedList<AdminReviewRow> & { busyId: string | null; onHide: (review: AdminReviewRow) => void; onShow: (review: AdminReviewRow) => void }>;
  dialog: ReasonDialogProps | null;
}

// ----- Catalog -----

export interface CatalogFormValues {
  name: string;
  icon?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface CatalogLayoutProps {
  catalog: WithStatus<{
    categories: AdminCategory[];
    onAddCategory: () => void;
    onEditCategory: (category: AdminCategory) => void;
    onAddSkill: (category: AdminCategory) => void;
    onEditSkill: (category: AdminCategory, skill: AdminCategory['skills'][number]) => void;
  }>;
  /** Adding or changing a category (with an icon) or a service */
  editor: {
    title: string;
    kind: 'category' | 'skill';
    form: FormInstance<CatalogFormValues>;
    initialValues: CatalogFormValues;
    saving: boolean;
    error?: string;
    onSave: (values: CatalogFormValues) => void;
    onCancel: () => void;
  } | null;
}

// ----- Audit log -----

export interface AuditLogLayoutProps {
  filter: { options: { value: string; label: string }[]; value: string | null; onChange: (value: string | null) => void };
  entries: WithStatus<{
    rows: (AuditEntry & { actionLabel: string; tone: BadgeTone; when: string })[];
    page: number;
    pageSize: number;
    total: number;
    fetching: boolean;
    onPageChange: (page: number) => void;
  }>;
}
