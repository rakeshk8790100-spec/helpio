import type { FormInstance } from 'antd';
import type { ComponentProps } from 'react';
import type { Coordinates, WithStatus } from '@/common/CommonDto';
import type { CurrentLocationButton, PhotoPicker } from '@/components/common';
import type { ChipOption } from '@/components/ui';
import type { WhenDay, WhenSlot } from './postJob.enum';

/* The postJob screen: wire shapes and layout props. */

/** Everything the customer fills in; drafts may leave fields empty */
export interface JobInput {
  title?: string;
  description?: string | null;
  categoryId?: string | null;
  coordinates?: Coordinates | null;
  pincode?: string | null;
  areaName?: string | null;
  /** Flat, building and street; only the hired pro sees it */
  addressLine?: string | null;
  /** ₹ */
  budget?: number | null;
  /** ISO date-time with timezone */
  scheduledAt?: string | null;
  durationMins?: number | null;
  isEmergency?: boolean;
  /** true posts the job to nearby providers */
  submit: boolean;
}

/** A first draft of the post form from the customer's own words */
export interface AssistJobApiDto {
  title: string;
  category_id: string | null;
  description: string;
  duration_mins: number | null;
  is_emergency: boolean;
  source: 'ai' | 'keywords';
}

export interface JobDraftSuggestion {
  title: string;
  categoryId: string | null;
  description: string;
  durationMins: number | null;
  isEmergency: boolean;
  /** "ai" when Claude wrote it */
  source: 'ai' | 'keywords';
}

export interface PostJobFormValues {
  /** Optional: the API makes one from the description */
  title?: string;
  description?: string;
  categoryId?: string;
  pincode?: string;
  areaName?: string;
  /** Flat, building and street ("somewhere else" only; a saved address brings its own) */
  addressLine?: string;
  whenDay?: WhenDay;
  /** "YYYY-MM-DD", with `whenDay` "date" */
  whenDate?: string;
  whenSlot?: WhenSlot;
  durationMins?: number;
  /** ₹ */
  budget?: number;
  isEmergency: boolean;
}

export type PostJobMode = 'new' | 'draft' | 'edit';

export type PostJobLayoutProps = WithStatus<{
  /** A new job, a saved draft, or a posted job being changed */
  mode: PostJobMode;
  /** New jobs start by describing the job in a few words; the form is then filled in from it */
  step: 'describe' | 'details';
  describe: {
    value: string;
    onChange: (value: string) => void;
    /** Fill the form in from the text */
    onContinue: () => void;
    /** Go to the form with the text as the description */
    onSkip: () => void;
    loading: boolean;
  };
  /** The form was filled in from the customer's words: "ai" (Claude) or "keywords" */
  suggestion: { source: 'ai' | 'keywords'; onStartOver: () => void } | null;
  /** Posting for a chosen pro: the job is sent to them once posted */
  invitee: string | null;
  /** Saved addresses as quick picks; `selectedId` null means "somewhere else" */
  addresses: { items: { id: string; label: string }[]; selectedId: string | null; onSelect: (id: string | null) => void } | null;
  /** Ask for flat and street ("somewhere else"); a saved address shows its own line instead */
  askAddressLine: boolean;
  savedAddressLine: string | null;
  form: FormInstance<PostJobFormValues>;
  initialValues: Partial<PostJobFormValues>;
  onValuesChange: (changed: Partial<PostJobFormValues>) => void;
  categories: ChipOption<string>[];
  location: ComponentProps<typeof CurrentLocationButton>;
  when: {
    dayOptions: ChipOption<WhenDay>[];
    slotOptions: ChipOption<WhenSlot>[];
    showDate: boolean;
    showSlots: boolean;
    /** Earliest date for "pick a date": "YYYY-MM-DD" */
    minDate: string;
  };
  photos: ComponentProps<typeof PhotoPicker>;
  /** Which button is busy */
  saving: 'draft' | 'post' | 'delete' | null;
  error?: string;
  onSaveDraft: () => void;
  onPost: () => void;
  /** Saved drafts only */
  onDeleteDraft: (() => void) | null;
  /** Edit mode: leave without saving */
  onCancel: () => void;
}>;
