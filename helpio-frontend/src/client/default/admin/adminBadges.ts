import { ApprovalStatus, JobStatus, MilestoneStatus, PaymentStatus, PayoutStatus, QuoteStatus } from '../../../common/CommonEnum';
import type { BadgeTone } from '../../../component/ui';

/* How states read in the admin console's tables and panels */

type Badge = { label: string; tone: BadgeTone };

export const JOB_BADGE: Record<JobStatus, Badge> = {
  [JobStatus.DRAFT]: { label: 'Draft', tone: 'neutral' },
  [JobStatus.OPEN]: { label: 'Waiting for quotes', tone: 'warning' },
  [JobStatus.ACCEPTED]: { label: 'Pro hired', tone: 'brand' },
  [JobStatus.FUNDED]: { label: 'Funded', tone: 'brand' },
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
