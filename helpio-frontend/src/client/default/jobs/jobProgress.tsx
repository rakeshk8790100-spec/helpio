import { Alert, Button, Collapse, Image, Input, Modal, Skeleton } from 'antd';
import { Camera, CircleCheck, History, RotateCcw, ShieldCheck, Timer } from 'lucide-react';
import { MilestoneTracker, PhotoPicker } from '../../../component/marketplace';
import { AlertBanner, ChipSelect, SectionHeader, StatusBadge } from '../../../component/ui';
import { formatINR } from '../../../lib/utils';
import type { JobProgressProps, StageAttempt, StageReviewProps, StageSubmitProps } from './jobs.layout.types';

const AttemptPhotos = ({ attempt }: { attempt: StageAttempt }) => (
  <Image.PreviewGroup>
    <div className="grid grid-cols-3 gap-2">
      {attempt.photos.map((photo) =>
        photo.contentType.startsWith('video/') ? (
          <video key={photo.id} src={photo.url} controls className="aspect-square w-full rounded-xl bg-slate-900 object-cover" />
        ) : (
          <Image
            key={photo.id}
            src={photo.url}
            alt="Work photo"
            rootClassName="!block"
            className="!aspect-square !w-full rounded-xl object-cover"
          />
        ),
      )}
    </div>
  </Image.PreviewGroup>
);

/** One update: photos, the pro's note and the customer's answer */
const Attempt = ({ attempt }: { attempt: StageAttempt }) => (
  <div className="flex flex-col gap-2">
    <AttemptPhotos attempt={attempt} />
    <div className="whitespace-pre-line rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">{attempt.note}</div>
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
      <span>{attempt.submittedLabel}</span>
      <StatusBadge label={attempt.review.label} tone={attempt.review.tone} />
    </div>
    {attempt.review.note && (
      <div className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">"{attempt.review.note}"</div>
    )}
  </div>
);

const SubmitCard = ({ s }: { s: StageSubmitProps }) => (
  <section className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
      <Camera size={16} className="text-indigo-600" />
      Send your {s.percent}% update
    </div>
    <div className="mt-1 text-xs text-slate-500">
      Add photos of the finished part and a short note. The customer approves it before the next stage opens.
    </div>
    {s.changesNote && (
      <div role="status" className="mt-3 flex gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
        <RotateCcw size={14} className="mt-0.5 shrink-0" />
        <span>
          <span className="font-semibold">Customer asked for changes: </span>"{s.changesNote}"
        </span>
      </div>
    )}
    <div className="mt-3">
      <PhotoPicker {...s.photos} />
    </div>
    <Input.TextArea
      value={s.note}
      onChange={(e) => s.onNoteChange(e.target.value)}
      rows={3}
      maxLength={1000}
      placeholder={`What's done so far, e.g. "Counters and sink cleaned, starting on the cabinets next."`}
      className="!mt-3"
      aria-label="Note for the customer"
    />
    {s.error && <Alert type="error" showIcon title={s.error} className="!mt-3" />}
    <Button type="primary" size="large" block loading={s.submitting} onClick={s.onSubmit} className="!mt-3">
      Ask for approval
    </Button>
  </section>
);

const ReviewCard = ({ r }: { r: StageReviewProps }) => (
  <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm font-semibold text-slate-900">
        {r.proName} finished {r.percent}%
      </span>
      <StatusBadge label="Needs your approval" tone="warning" />
    </div>
    <div className="mt-1 text-xs text-slate-600">
      Check the photos. Approving confirms this {r.percent}% of the work ({formatINR(r.amount)} of the quote).
    </div>
    <div className="mt-3">
      <Attempt attempt={r.attempt} />
    </div>
    <div className="mt-3 grid grid-cols-2 gap-2">
      <Button size="large" icon={<RotateCcw size={16} />} onClick={r.changes.onOpen} disabled={r.approving}>
        Ask for changes
      </Button>
      <Button type="primary" size="large" icon={<CircleCheck size={16} />} loading={r.approving} onClick={r.onApprove}>
        Approve
      </Button>
    </div>
    <Modal
      open={r.changes.open}
      title={`What should ${r.proName} change?`}
      okText="Send back"
      onOk={r.changes.onSend}
      confirmLoading={r.changes.sending}
      onCancel={r.changes.onCancel}
      destroyOnHidden
    >
      <div className="text-xs text-slate-500">
        Be specific, so they know exactly what to fix. They'll send new photos for this stage.
      </div>
      <Input.TextArea
        value={r.changes.reason}
        onChange={(e) => r.changes.onReasonChange(e.target.value)}
        rows={4}
        maxLength={1000}
        placeholder="e.g. The sink still has stains near the drain."
        className="!mt-3"
        aria-label="What needs to change"
      />
      {r.changes.error && <Alert type="error" showIcon title={r.changes.error} className="!mt-3" />}
    </Modal>
  </section>
);

/** After hire, on both job pages: the four 25% stages, the action that's due, every update so far and the timeline. */
const JobProgressBlock = ({ progress: p }: { progress: JobProgressProps }) => {
  if (p.status === 'loading') return <Skeleton active paragraph={{ rows: 4 }} />;
  if (p.status === 'error') return <AlertBanner message={p.message} onRetry={p.onRetry} />;

  const withUpdates = p.stages.filter((s) => s.attempts.length > 0);

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-slate-100 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-base font-semibold text-slate-900">Progress</span>
          <span className="text-lg font-bold text-slate-900">{p.progressPct}%</span>
        </div>
        <div className="mt-3">
          <MilestoneTracker stages={p.tracker} />
        </div>
        <div className="mt-3 text-xs text-slate-500">{p.earnedLabel}</div>
        {p.scheduleLabel && (
          <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
            <Timer size={12} className="shrink-0" />
            {p.scheduleLabel}
          </div>
        )}
        {p.currentTiming && (
          <div
            role="status"
            className={`mt-3 rounded-xl px-3 py-2 text-sm font-semibold ${
              p.currentTiming.late ? 'bg-red-50 text-red-700' : 'bg-indigo-50 text-indigo-800'
            }`}
          >
            {p.currentTiming.text}
          </div>
        )}
        {p.headline && <div className="mt-2 text-sm text-slate-700">{p.headline}</div>}
        {p.fixingLabel && <div className="mt-1 text-xs font-medium text-amber-700">{p.fixingLabel}</div>}
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
          <ShieldCheck size={14} className="mt-px shrink-0 text-emerald-600" />
          Every update has photos and is approved by the customer. Both of you see the same history.
        </div>
      </section>

      {p.setEstimate && (
        <section className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Timer size={16} className="text-indigo-600" />
            How long will the whole job take?
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Each 25% gets a quarter of this time, counted from when you started. The customer sees the same targets.
          </div>
          <div className="mt-3">
            <ChipSelect
              options={p.setEstimate.picker.options}
              value={p.setEstimate.picker.value ?? undefined}
              onChange={p.setEstimate.picker.onChange}
              ariaLabel="Estimated time"
            />
          </div>
          <Button type="primary" size="large" block loading={p.setEstimate.saving} onClick={p.setEstimate.onSave} className="!mt-3">
            Save estimate
          </Button>
        </section>
      )}

      {p.review && <ReviewCard r={p.review} />}
      {p.submit && <SubmitCard s={p.submit} />}

      {withUpdates.length > 0 && (
        <section>
          <SectionHeader title="Updates" />
          <Collapse
            size="small"
            defaultActiveKey={withUpdates.filter((s) => s.current).map((s) => String(s.stage))}
            items={withUpdates.map((s) => ({
              key: String(s.stage),
              label: (
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-900">{s.title}</span>
                  <StatusBadge label={s.badge.label} tone={s.badge.tone} />
                </span>
              ),
              children: (
                <div className="flex flex-col gap-4">
                  {(s.timing || s.fixingLabel) && (
                    <div className="flex flex-col gap-0.5 text-xs">
                      {s.timing && <span className={s.timing.late ? 'font-medium text-red-600' : 'text-slate-500'}>{s.timing.text}</span>}
                      {s.fixingLabel && <span className="font-medium text-amber-700">{s.fixingLabel}</span>}
                    </div>
                  )}
                  {[...s.attempts].reverse().map((attempt, index) => (
                    <div key={attempt.id} className={index > 0 ? 'border-t border-slate-100 pt-4' : ''}>
                      {index === 1 && <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Earlier</div>}
                      <Attempt attempt={attempt} />
                    </div>
                  ))}
                </div>
              ),
            }))}
          />
        </section>
      )}

      {p.timeline.length > 0 && (
        <section>
          <SectionHeader title="Timeline" />
          <ol className="flex flex-col">
            {p.timeline.map((item, index) => (
              <li key={item.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className={`mt-1 flex h-5 w-5 items-center justify-center rounded-full ${index === 0 ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                    <History size={11} />
                  </span>
                  {index < p.timeline.length - 1 && <span className="w-px flex-1 bg-slate-200" />}
                </div>
                <div className="min-w-0 flex-1 pb-4">
                  <div className="text-sm text-slate-800">{item.text}</div>
                  {item.detail && <div className="mt-0.5 text-xs text-slate-500">"{item.detail}"</div>}
                  <div className="mt-0.5 text-[11px] text-slate-400">{item.time}</div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
};

export default JobProgressBlock;
