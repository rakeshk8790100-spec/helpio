import type { FormInstance } from 'antd';
import type { NearbyJobApiDto } from '@/common/CommonApi';
import type { Coordinates, RatingSummary, MapCircle, JobQuote, WithStatus } from '@/common/CommonDto';
import type { AttachmentApiDto, EstimatePickerProps, JobPaymentProps, JobProgressProps, JobReviewProps, JobSummary } from '@/pages/jobs/types/jobs.dto';

/* The providerJob screen: wire shapes and layout props. */

export interface NearbyJobDetailApiDto extends NearbyJobApiDto {
  attachments: AttachmentApiDto[];
  can_quote: boolean;
  hired: boolean;
  exact_location: {
    latitude: number | null;
    longitude: number | null;
    pincode: string | null;
    area_name: string | null;
    address_line: string | null;
  } | null;
  customer_name: string | null;
  started_at: string | null;
  unread_messages: number;
  customer_rating: RatingSummary;
}

export interface QuoteFormValues {
  /** ₹ */
  amount: number;
  message?: string;
}

/** Locked until sign-up is done, then a form, then the sent quote (withdrawable while pending) */
export type ProviderQuoteProps =
  | { state: 'locked'; reason: string; actionLabel: string; onAction: () => void }
  | { state: 'sent'; quote: JobQuote; changedSince: boolean; withdrawing: boolean; onWithdraw: () => void }
  | {
      state: 'form';
      form: FormInstance<QuoteFormValues>;
      initialValues: Partial<QuoteFormValues>;
      budget: number | null;
      onSameAsBudget: () => void;
      quickMessages: string[];
      onQuickMessage: (text: string) => void;
      submitting: boolean;
      error?: string;
      onSubmit: (values: QuoteFormValues) => void;
    };

export type ProviderJobLayoutProps = WithStatus<{
  summary: JobSummary & {
    customerLabel: string;
    quoteCount: number;
    /** How other pros rated this customer; null before any review */
    customerRating: { average: number; count: number } | null;
  };
  /** The customer asked this pro directly */
  invite: { message: string | null; declining: boolean; onDecline: () => void } | null;
  /** My quote was accepted: the customer's name and the exact place */
  hired: {
    customerName: string;
    address: string;
    coordinates: Coordinates | null;
    /** Until work starts: enter the customer's PIN */
    start: {
      pin: string;
      onPinChange: (pin: string) => void;
      estimate: EstimatePickerProps;
      starting: boolean;
      error?: string;
      onStart: () => void;
    } | null;
    /** e.g. "In progress since 4:05 PM" */
    startedLabel: string | null;
    chat: { unread: number; onOpen: () => void };
  } | null;
  /** After hire: the four stages, the update form and the timeline */
  progress: JobProgressProps | null;
  /** All four stages approved: the customer's payment, then Helpio's transfer to me */
  payment: JobPaymentProps | null;
  /** All four stages approved: rate the customer, and see their rating of me */
  review: JobReviewProps | null;
  circle: MapCircle | null;
  quote: ProviderQuoteProps;
  onBack: () => void;
}>;
