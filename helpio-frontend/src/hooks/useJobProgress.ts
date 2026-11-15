import { App } from 'antd';
import { useEffect, useRef, useState } from 'react';
import type { Milestone } from '@/common/CommonDto';
import { JobStatus, MilestoneStatus } from '@/common/CommonEnum';
import { STAGE_TITLE, eventText, fixingLabel, formatSpan, stageBadge, stageTiming, toAttempt } from '@/common/JobProgressDisplay';
import type { ProgressRole } from '@/common/JobProgressDisplay';
import { poll } from '@/config/base_service/base.api';
import { apiErrorMessage } from '@/lib/apiError';
import { JOB_MEDIA, pickMedia } from '@/lib/media';
import { estimateOptions, formatClock, formatDuration, formatINR } from '@/lib/utils';
import { useApproveMilestoneMutation, useGetJobProgressQuery, useRequestMilestoneChangesMutation, useSetJobEstimateMutation, useSubmitMilestoneMutation } from '@/pages/jobs/jobs.api';
import type { JobProgressProps } from '@/pages/jobs/types/jobs.dto';
import { useNow } from './useNow';

// The customer sees new updates without reloading
const POLL_MS = 30_000;

interface Options {
  /** Before hire there are no stages */
  skip: boolean;
  /** The other person, e.g. "Ravi S." */
  otherName: string;
}

/** The four 25% stages of a hired job: the pro sends photos and a note, the customer approves or sends it back. */
export const useJobProgress = (jobId: string, role: ProgressRole, { skip, otherName }: Options): JobProgressProps | null => {
  const { message } = App.useApp();
  const { data, error, isLoading, refetch } = useGetJobProgressQuery(jobId, { skip, ...poll(skip ? 0 : POLL_MS) });
  const [submitMilestone, { isLoading: submitting }] = useSubmitMilestoneMutation();
  const [approveMilestone, { isLoading: approving }] = useApproveMilestoneMutation();
  const [requestChanges, { isLoading: sendingChanges }] = useRequestMilestoneChangesMutation();
  const [setJobEstimate, { isLoading: savingEstimate }] = useSetJobEstimateMutation();
  const [estimate, setEstimate] = useState<number | null>(null);
  const now = useNow();
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
    if (data.jobStatus === JobStatus.PAYMENT_DUE) {
      return role === 'customer'
        ? `All four stages approved. Pay ${formatINR(data.amount)} below to complete the job.`
        : `All four stages approved. Waiting for ${otherName} to pay ${formatINR(data.amount)}.`;
    }
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
    const { accepted, warnings } = pickMedia(files, JOB_MEDIA, photos.length);
    warnings.forEach((text) => message.warning(text));
    setPhotos((prev) => [...prev, ...accepted.map((file) => ({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file) }))]);
  };
  const removePhoto = (id: string) =>
    setPhotos((prev) => {
      const gone = prev.find((p) => p.id === id);
      if (gone) URL.revokeObjectURL(gone.url);
      return prev.filter((p) => p.id !== id);
    });

  const isOpen = (m: Milestone) => started && m.stage === data.currentStage;
  const isOverdue = (m: Milestone) =>
    isOpen(m) &&
    m.dueAt !== null &&
    m.status !== MilestoneStatus.SUBMITTED &&
    new Date(m.dueAt).getTime() < now;
  const finishAt = data.milestones.at(-1)?.dueAt ?? null;

  return {
    status: 'ready',
    progressPct: data.progressPct,
    tracker: data.milestones.map((m) => ({
      stage: m.stage,
      percent: m.percent,
      status: m.status,
      timeLabel: m.dueAt ? formatClock(m.dueAt) : null,
      overdue: isOverdue(m),
    })),
    earnedLabel: `${formatINR(data.earned)} of ${formatINR(data.amount)} approved`,
    headline,
    scheduleLabel:
      data.estimatedMins && data.startedAt
        ? [
            `Estimate ${formatDuration(data.estimatedMins)}`,
            `started ${formatClock(data.startedAt)}`,
            finishAt && `finish by ${formatClock(finishAt)}`,
          ]
            .filter(Boolean)
            .join(' · ')
        : null,
    currentTiming: current && isOpen(current) ? stageTiming(current, now, true) : null,
    fixingLabel: data.extraMinsTotal > 0 ? `+${formatSpan(data.extraMinsTotal)} fixing so far (not charged)` : null,
    setEstimate:
      role === 'provider' && started && data.estimatedMins === null
        ? {
            picker: { options: estimateOptions(null), value: estimate, onChange: setEstimate },
            saving: savingEstimate,
            onSave: async () => {
              if (!estimate) return message.warning('Pick how long the whole job will take.');
              try {
                await setJobEstimate({ jobId, estimatedMins: estimate }).unwrap();
                message.success('Time estimate saved. Each 25% now has a target time.');
              } catch (e) {
                message.error(apiErrorMessage(e));
              }
            },
          }
        : null,
    submit:
      canSubmit && current
        ? {
            stage: current.stage,
            percent: current.percent,
            changesNote: current.status === MilestoneStatus.CHANGES_REQUESTED ? (latest?.reviewNote ?? null) : null,
            photos: {
              items: photos.map((p) => ({ id: p.id, url: p.url, isVideo: p.file.type.startsWith('video/'), uploading: false })),
              max: JOB_MEDIA.maxCount,
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
      badge: isOverdue(m) ? { label: 'Overdue', tone: 'error' } : stageBadge(m, isOpen(m), role),
      timing: stageTiming(m, now, isOpen(m)),
      fixingLabel: fixingLabel(m.extraMins),
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
