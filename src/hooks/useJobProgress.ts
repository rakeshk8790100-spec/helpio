import { useEffect, useRef, useState } from 'react';
import { App } from 'antd';
import type { JobProgressProps, StageAttempt } from '../client/default/jobs/jobs.layout.types';
import type { JobEvent, Milestone, MilestoneSubmission } from '../common/CommonDto';
import { JobEventType, JobStatus, MilestoneStatus } from '../common/CommonEnum';
import type { BadgeTone } from '../component/ui';
import { apiErrorMessage } from '../lib/apiError';
import { formatClock, formatINR } from '../lib/utils';
import {
  useApproveMilestoneMutation,
  useGetJobProgressQuery,
  useRequestMilestoneChangesMutation,
  useSubmitMilestoneMutation,
} from '../pages/jobs/jobs.api';

type Role = 'customer' | 'provider';

const MAX_PHOTOS = 6;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'];
// The customer sees new updates without reloading
const POLL_MS = 30_000;

const STAGE_TITLE: Record<number, string> = {
  1: 'First quarter (25%)',
  2: 'Half way (50%)',
  3: 'Three quarters (75%)',
  4: 'Finished (100%)',
};

const stageBadge = (m: Milestone, current: boolean, role: Role): { label: string; tone: BadgeTone } => {
  switch (m.status) {
    case MilestoneStatus.APPROVED:
      return { label: 'Approved', tone: 'success' };
    case MilestoneStatus.SUBMITTED:
      return role === 'customer' ? { label: 'Needs your approval', tone: 'warning' } : { label: 'Waiting for approval', tone: 'warning' };
    case MilestoneStatus.CHANGES_REQUESTED:
      return role === 'customer' ? { label: 'Sent back', tone: 'error' } : { label: 'Changes requested', tone: 'error' };
    default:
      return current ? { label: role === 'provider' ? 'Your turn' : 'In progress', tone: 'brand' } : { label: 'Not started', tone: 'neutral' };
  }
};

const toAttempt = (s: MilestoneSubmission): StageAttempt => ({
  id: s.id,
  note: s.note,
  photos: s.photos,
  submittedLabel: `Sent ${formatClock(s.submittedAt)}`,
  review:
    s.reviewStatus === MilestoneStatus.APPROVED
      ? { label: `Approved${s.reviewedAt ? ` ${formatClock(s.reviewedAt)}` : ''}`, tone: 'success', note: null }
      : s.reviewStatus === MilestoneStatus.CHANGES_REQUESTED
        ? { label: 'Changes requested', tone: 'error', note: s.reviewNote }
        : { label: 'Waiting for approval', tone: 'warning', note: null },
});

const eventText = (e: JobEvent) => {
  const who = e.actorLabel ?? 'Someone';
  const pct = e.stage ? `${e.stage * 25}%` : '';
  switch (e.type) {
    case JobEventType.HIRED:
      return `${who} accepted the quote`;
    case JobEventType.STARTED:
      return `${who} started work with the PIN`;
    case JobEventType.MILESTONE_SUBMITTED:
      return `${who} sent the ${pct} update`;
    case JobEventType.MILESTONE_APPROVED:
      return `${who} approved ${pct}`;
    case JobEventType.CHANGES_REQUESTED:
      return `${who} asked for changes on ${pct}`;
    default:
      return 'Job completed';
  }
};

interface Options {
  /** Before hire there are no stages */
  skip: boolean;
  /** The other person, e.g. "Ravi S." */
  otherName: string;
}

/** The four 25% stages of a hired job: the pro sends photos and a note, the customer approves or sends it back. */
export const useJobProgress = (jobId: string, role: Role, { skip, otherName }: Options): JobProgressProps | null => {
  const { message } = App.useApp();
  const { data, error, isLoading, refetch } = useGetJobProgressQuery(jobId, { skip, pollingInterval: skip ? 0 : POLL_MS });
  const [submitMilestone, { isLoading: submitting }] = useSubmitMilestoneMutation();
  const [approveMilestone, { isLoading: approving }] = useApproveMilestoneMutation();
  const [requestChanges, { isLoading: sendingChanges }] = useRequestMilestoneChangesMutation();
  const [photos, setPhotos] = useState<{ id: string; file: File; url: string }[]>([]);
  const [note, setNote] = useState('');
  const [submitError, setSubmitError] = useState<string>();
  const [changesOpen, setChangesOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [changesError, setChangesError] = useState<string>();

  // Free local previews when the page closes
  const photosRef = useRef(photos);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  if (skip) return null;
  if (isLoading) return { status: 'loading' };
  if (!data) return { status: 'error', message: apiErrorMessage(error), onRetry: refetch };

  const current = data.milestones.find((m) => m.stage === data.currentStage) ?? null;
  const latest = current?.submissions.at(-1) ?? null;
  const started = data.jobStatus === JobStatus.IN_PROGRESS;
  const completed = data.jobStatus === JobStatus.COMPLETED;

  const headline = (() => {
    if (completed) return 'All four stages approved. This job is complete.';
    if (!current) return '';
    const pct = `${current.percent}%`;
    if (!started) {
      return role === 'provider'
        ? "Start the job with the customer's PIN, then send photos at every 25% for approval."
        : `Once ${otherName} starts with your PIN, you'll approve the work in four 25% steps, with photos at each.`;
    }
    switch (current.status) {
      case MilestoneStatus.SUBMITTED:
        return role === 'provider' ? `Waiting for the customer to approve ${pct}.` : `${otherName} finished ${pct}. Check the photos and approve.`;
      case MilestoneStatus.CHANGES_REQUESTED:
        return role === 'provider'
          ? `The customer asked for changes on ${pct}. Fix it and send a new update.`
          : `Waiting for ${otherName} to send a new ${pct} update.`;
      default:
        return role === 'provider'
          ? `When ${pct} of the work is done, send photos and a note for approval.`
          : `${otherName} is working on the first ${pct}. You'll be notified to approve it.`;
    }
  })();

  const canSubmit =
    role === 'provider' &&
    started &&
    current !== null &&
    (current.status === MilestoneStatus.PENDING || current.status === MilestoneStatus.CHANGES_REQUESTED);
  const canReview = role === 'customer' && current?.status === MilestoneStatus.SUBMITTED && latest !== null;

  const addPhotos = (files: File[]) => {
    setSubmitError(undefined);
    const valid = files.filter((f) => PHOTO_TYPES.includes(f.type) && f.size <= MAX_PHOTO_BYTES);
    if (valid.length < files.length) message.warning('Use JPG, PNG or WebP photos, or MP4 videos, up to 10 MB each.');
    const room = MAX_PHOTOS - photos.length;
    if (valid.length > room) message.warning(`Up to ${MAX_PHOTOS} photos per update.`);
    setPhotos((prev) => [
      ...prev,
      ...valid.slice(0, room).map((file) => ({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file) })),
    ]);
  };
  const removePhoto = (id: string) =>
    setPhotos((prev) => {
      const gone = prev.find((p) => p.id === id);
      if (gone) URL.revokeObjectURL(gone.url);
      return prev.filter((p) => p.id !== id);
    });

  return {
    status: 'ready',
    progressPct: data.progressPct,
    tracker: data.milestones.map(({ stage, percent, status }) => ({ stage, percent, status })),
    earnedLabel: `${formatINR(data.earned)} of ${formatINR(data.amount)} approved`,
    headline,
    submit:
      canSubmit && current
        ? {
            stage: current.stage,
            percent: current.percent,
            changesNote: current.status === MilestoneStatus.CHANGES_REQUESTED ? (latest?.reviewNote ?? null) : null,
            photos: {
              items: photos.map((p) => ({ id: p.id, url: p.url, isVideo: p.file.type.startsWith('video/'), uploading: false })),
              max: MAX_PHOTOS,
              onAdd: addPhotos,
              onRemove: removePhoto,
              disabled: submitting,
            },
            note,
            onNoteChange: (value) => {
              setSubmitError(undefined);
              setNote(value);
            },
            submitting,
            error: submitError,
            onSubmit: async () => {
              if (!photos.length) return setSubmitError('Add at least one photo of the work.');
              if (note.trim().length < 3) return setSubmitError('Add a short note about what was done.');
              try {
                await submitMilestone({ jobId, stage: current.stage, note: note.trim(), files: photos.map((p) => p.file) }).unwrap();
                photos.forEach((p) => URL.revokeObjectURL(p.url));
                setPhotos([]);
                setNote('');
                message.success(`${current.percent}% update sent. We've asked the customer to approve it.`);
              } catch (e) {
                setSubmitError(apiErrorMessage(e));
              }
            },
          }
        : null,
    review:
      canReview && current && latest
        ? {
            stage: current.stage,
            percent: current.percent,
            amount: current.amount,
            proName: otherName,
            attempt: toAttempt(latest),
            approving,
            onApprove: async () => {
              try {
                await approveMilestone({ jobId, stage: current.stage }).unwrap();
                message.success(current.stage === 4 ? 'Job complete. Thanks for using Helpio!' : `${current.percent}% approved.`);
              } catch (e) {
                message.error(apiErrorMessage(e));
              }
            },
            changes: {
              open: changesOpen,
              onOpen: () => setChangesOpen(true),
              onCancel: () => {
                setChangesOpen(false);
                setChangesError(undefined);
              },
              reason,
              onReasonChange: (value) => {
                setChangesError(undefined);
                setReason(value);
              },
              sending: sendingChanges,
              error: changesError,
              onSend: async () => {
                if (reason.trim().length < 3) return setChangesError('Tell the pro what needs to change.');
                try {
                  await requestChanges({ jobId, stage: current.stage, reason: reason.trim() }).unwrap();
                  setChangesOpen(false);
                  setReason('');
                  message.success(`Sent back to ${otherName} with your note.`);
                } catch (e) {
                  setChangesError(apiErrorMessage(e));
                }
              },
            },
          }
        : null,
    stages: data.milestones.map((m) => ({
      stage: m.stage,
      percent: m.percent,
      title: STAGE_TITLE[m.stage] ?? `${m.percent}%`,
      amount: m.amount,
      badge: stageBadge(m, m.stage === data.currentStage && started, role),
      attempts: m.submissions.map(toAttempt),
      current: m.stage === data.currentStage,
    })),
    timeline: data.events.map((e) => ({
      id: e.id,
      text: eventText(e),
      detail: e.reason,
      time: formatClock(e.createdAt),
    })),
  };
};
