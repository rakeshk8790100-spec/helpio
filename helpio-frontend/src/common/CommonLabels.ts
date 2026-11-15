import type { BadgeTone } from '@/components/ui';
import {
  AddressLabel,
  ApprovalStatus,
  JobStatus,
  MilestoneStatus,
  PaymentStatus,
  PayoutStatus,
  QuoteStatus,
  UserRole,
} from './CommonEnum';

/* How states and fixed values read on screen; one place, so customer, provider and admin screens agree. */

export interface Badge {
  label: string;
  tone: BadgeTone;
}

export const JOB_STATUS_BADGE: Record<JobStatus, Badge> = {
  [JobStatus.DRAFT]: { label: 'Draft', tone: 'neutral' },
  [JobStatus.OPEN]: { label: 'Waiting for quotes', tone: 'warning' },
  [JobStatus.ACCEPTED]: { label: 'Pro hired', tone: 'success' },
  [JobStatus.FUNDED]: { label: 'Payment secured', tone: 'success' },
  [JobStatus.IN_PROGRESS]: { label: 'In progress', tone: 'brand' },
  [JobStatus.PAYMENT_DUE]: { label: 'Payment due', tone: 'warning' },
  [JobStatus.COMPLETED]: { label: 'Completed', tone: 'success' },
  [JobStatus.CANCELLED]: { label: 'Cancelled', tone: 'neutral' },
  [JobStatus.DISPUTED]: { label: 'In dispute', tone: 'error' },
};

export const APPROVAL_BADGE: Record<ApprovalStatus, Badge> = {
  [ApprovalStatus.APPROVED]: { label: 'Approved', tone: 'success' },
  [ApprovalStatus.PENDING]: { label: 'Waiting for approval', tone: 'warning' },
  [ApprovalStatus.REJECTED]: { label: 'Rejected', tone: 'error' },
};

export const PAYMENT_BADGE: Record<PaymentStatus, Badge> = {
  [PaymentStatus.PENDING]: { label: 'Open', tone: 'warning' },
  [PaymentStatus.PAID]: { label: 'Paid', tone: 'success' },
  [PaymentStatus.EXPIRED]: { label: 'Expired', tone: 'neutral' },
  [PaymentStatus.CANCELLED]: { label: 'Cancelled', tone: 'neutral' },
};

export const PAYOUT_BADGE: Record<PayoutStatus, Badge> = {
  [PayoutStatus.PENDING]: { label: 'To send', tone: 'warning' },
  [PayoutStatus.PAID]: { label: 'Sent', tone: 'success' },
};

export const QUOTE_BADGE: Record<QuoteStatus, Badge> = {
  [QuoteStatus.PENDING]: { label: 'Waiting', tone: 'warning' },
  [QuoteStatus.ACCEPTED]: { label: 'Hired', tone: 'success' },
  [QuoteStatus.REJECTED]: { label: 'Declined', tone: 'neutral' },
  [QuoteStatus.WITHDRAWN]: { label: 'Withdrawn', tone: 'neutral' },
};

export const STAGE_BADGE: Record<MilestoneStatus, Badge> = {
  [MilestoneStatus.PENDING]: { label: 'Not sent', tone: 'neutral' },
  [MilestoneStatus.SUBMITTED]: { label: 'Waiting for approval', tone: 'warning' },
  [MilestoneStatus.APPROVED]: { label: 'Approved', tone: 'success' },
  [MilestoneStatus.CHANGES_REQUESTED]: { label: 'Changes asked', tone: 'error' },
};

export const ADDRESS_LABEL: Record<AddressLabel, string> = {
  [AddressLabel.HOME]: 'Home',
  [AddressLabel.WORK]: 'Work',
  [AddressLabel.OTHER]: 'Other',
};

export const ROLE_LABEL: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Admin',
  [UserRole.CUSTOMER]: 'Customer',
  [UserRole.PROVIDER]: 'Professional',
};

const PAYMENT_METHOD_LABEL: Record<string, string> = { upi: 'UPI', netbanking: 'Netbanking', card: 'Card', wallet: 'Wallet' };

/** Razorpay's method name ("upi") as people say it ("UPI"); unknown methods show as sent */
export const paymentMethodLabel = (method: string | null) => (method ? (PAYMENT_METHOD_LABEL[method] ?? method) : null);

/** A hired job's four stages, each a quarter of the work */
export const STAGE_PERCENT = 25;
export const stagePercent = (stage: number) => stage * STAGE_PERCENT;

/** "1 quote", "3 quotes" */
export const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;
