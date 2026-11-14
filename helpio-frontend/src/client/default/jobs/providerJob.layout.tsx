import { Alert, Button, Form, Input, InputNumber, Popconfirm } from 'antd';
import { CircleCheck, CirclePlay, Lock, MapPin, MessageCircle, MessageCircleQuestion, Send, UserRound } from 'lucide-react';
import { QuoteStatus } from '../../../common/CommonEnum';
import { JobMap } from '../../../component/marketplace';
import { AlertBanner, Chip, ChipSelect, PageSkeleton, RatingStars, StatusBadge } from '../../../component/ui';
import { formatINR } from '../../../lib/utils';
import JobPaymentBlock from './jobPayment';
import JobProgressBlock from './jobProgress';
import JobReviewBlock from './jobReview';
import JobSummaryBlock from './jobSummary';
import type { ProviderQuoteProps } from './jobs.layout.types';
import type { ProviderJobLayoutProps } from './jobs.layout.types';

const SENT_BADGE = {
  [QuoteStatus.PENDING]: { label: 'Waiting for the customer', tone: 'warning' as const },
  [QuoteStatus.ACCEPTED]: { label: 'Accepted: you are hired', tone: 'success' as const },
  [QuoteStatus.REJECTED]: { label: 'Customer chose another pro', tone: 'neutral' as const },
  [QuoteStatus.WITHDRAWN]: { label: 'Withdrawn', tone: 'neutral' as const },
};

const QuoteSection = ({ quote }: { quote: ProviderQuoteProps }) => {
  if (quote.state === 'locked') {
    return (
      <section className="rounded-2xl bg-slate-900 p-4 text-white">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Lock size={16} className="text-amber-300" />
          Quoting is locked
        </div>
        <div className="mt-1 text-xs text-white/70">{quote.reason}</div>
        <button
          type="button"
          onClick={quote.onAction}
          className="mt-3 h-10 w-full rounded-xl bg-amber-400 text-sm font-semibold text-slate-900 active:scale-[.98]"
        >
          {quote.actionLabel}
        </button>
      </section>
    );
  }

  if (quote.state === 'sent') {
    const badge = SENT_BADGE[quote.quote.status];
    return (
      <section className="rounded-2xl border border-slate-100 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-base font-semibold text-slate-900">Your quote</span>
          <span className="text-lg font-bold text-slate-900">{formatINR(quote.quote.amount)}</span>
        </div>
        <div className="mt-1">
          <StatusBadge label={badge.label} tone={badge.tone} />
        </div>
        {quote.quote.message && <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">{quote.quote.message}</div>}
        {quote.changedSince && quote.quote.status === QuoteStatus.PENDING && (
          <div role="status" className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
            The customer changed this job after you quoted. Check the details, and withdraw and re-quote if needed.
          </div>
        )}
        {quote.quote.status === QuoteStatus.PENDING && (
          <Button block size="large" loading={quote.withdrawing} onClick={quote.onWithdraw} className="!mt-3">
            Withdraw quote
          </Button>
        )}
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-100 p-4 shadow-sm">
      <div className="text-base font-semibold text-slate-900">Send your quote</div>
      <div className="mt-1 text-xs text-slate-500">The customer approves each 25% stage with your photos, then pays the full quote through Helpio.</div>
      <Form form={quote.form} layout="vertical" requiredMark={false} initialValues={quote.initialValues} onFinish={quote.onSubmit} className="!mt-3">
        <Form.Item
          name="amount"
          label="Your price"
          rules={[{ required: true, message: 'Enter your price' }, { type: 'number', min: 100, message: 'At least ₹100' }]}
          className="!mb-2"
        >
          <InputNumber size="large" min={100} max={1_000_000} step={50} prefix="₹" className="!w-full" />
        </Form.Item>
        {quote.budget !== null && (
          <div className="mb-4">
            <Chip onClick={quote.onSameAsBudget}>Same as budget ({formatINR(quote.budget)})</Chip>
          </div>
        )}
        <Form.Item name="message" label="Message to the customer" className="!mb-2">
          <Input.TextArea rows={3} maxLength={2000} placeholder="When you can come, what's included…" />
        </Form.Item>
        <div className="scrollbar-none -mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
          {quote.quickMessages.map((text) => (
            <Chip key={text} onClick={() => quote.onQuickMessage(text)}>
              {text.length > 32 ? `${text.slice(0, 30)}…` : text}
            </Chip>
          ))}
        </div>
        {quote.error && <Alert type="error" showIcon title={quote.error} className="!mb-3" />}
        <Button type="primary" htmlType="submit" size="large" block loading={quote.submitting}>
          Send quote
        </Button>
      </Form>
    </section>
  );
};

/** /pro/jobs/:id: the job as a provider sees it before hire (masked), its approximate area and the quote. */
const ProviderJobLayout = (p: ProviderJobLayoutProps) => {
  if (p.status === 'loading') return <PageSkeleton />;
  if (p.status === 'error') return <AlertBanner message={p.message} onRetry={p.onRetry} />;

  return (
    <div className="flex flex-col gap-5">
      <JobSummaryBlock summary={p.summary} onBack={p.onBack} backLabel={p.hired ? 'My jobs' : 'Jobs near you'} />

      {p.hired && (
        <section className="rounded-2xl bg-emerald-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
            <CircleCheck size={16} />
            You're hired for this job
          </div>
          <div className="mt-2 flex flex-col gap-1 text-sm text-slate-700">
            <span className="flex items-center gap-2">
              <UserRound size={14} className="text-slate-500" />
              {p.hired.customerName}
              {p.summary.customerRating && (
                <RatingStars variant="compact" value={p.summary.customerRating.average} count={p.summary.customerRating.count} />
              )}
            </span>
            <span className="flex items-center gap-2">
              <MapPin size={14} className="text-slate-500" />
              {p.hired.address}
            </span>
          </div>
          {p.hired.startedLabel && (
            <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-emerald-800">
              <CirclePlay size={16} />
              {p.hired.startedLabel}
            </div>
          )}
          {p.hired.start && (
            <div className="mt-4 rounded-xl bg-white p-3">
              <div className="text-sm font-semibold text-slate-900">Start the job</div>
              <div className="mt-0.5 text-xs text-slate-500">At the door, ask {p.hired.customerName} for their 4-digit start PIN.</div>
              <div className="mt-3 flex justify-center">
                <Input.OTP length={4} value={p.hired.start.pin} onChange={p.hired.start.onPinChange} size="large" aria-label="Start PIN" />
              </div>
              <div className="mt-4 text-sm font-semibold text-slate-900">How long will the whole job take?</div>
              <div className="mt-0.5 text-xs text-slate-500">
                Each 25% gets a quarter of this time, with a target the customer sees. Fixing work isn't charged.
              </div>
              <div className="mt-2">
                <ChipSelect
                  options={p.hired.start.estimate.options}
                  value={p.hired.start.estimate.value ?? undefined}
                  onChange={p.hired.start.estimate.onChange}
                  ariaLabel="Estimated time"
                />
              </div>
              {p.hired.start.error && <Alert type="error" showIcon title={p.hired.start.error} className="!mt-3" />}
              <Button type="primary" size="large" block loading={p.hired.start.starting} onClick={p.hired.start.onStart} className="!mt-3">
                Start job
              </Button>
            </div>
          )}
          <Button size="large" block icon={<MessageCircle size={16} />} onClick={p.hired.chat.onOpen} className="!mt-3">
            Chat with {p.hired.customerName}
            {p.hired.chat.unread > 0 && (
              <span className="rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">{p.hired.chat.unread}</span>
            )}
          </Button>
          {p.hired.coordinates && (
            <div className="mt-3">
              <JobMap
                area={null}
                jobs={[]}
                center={{ latitude: p.hired.coordinates.latitude, longitude: p.hired.coordinates.longitude, radiusM: 40 }}
                height={180}
              />
            </div>
          )}
        </section>
      )}

      {p.payment && <JobPaymentBlock payment={p.payment} />}
      {p.review && <JobReviewBlock review={p.review} />}

      {p.progress && <JobProgressBlock progress={p.progress} />}

      {p.invite && (
        <section className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-indigo-900">
            <Send size={16} className="text-indigo-600" />
            {p.summary.customerLabel} asked you for a quote
          </div>
          {p.invite.message && <div className="mt-2 rounded-xl bg-white px-3 py-2 text-sm text-slate-700">"{p.invite.message}"</div>}
          <Popconfirm
            title="Decline this request?"
            description="The customer will see you declined."
            okText="Decline"
            okButtonProps={{ danger: true }}
            onConfirm={p.invite.onDecline}
          >
            <Button size="small" type="link" danger loading={p.invite.declining} className="!mt-2 !px-0">
              Not for me, decline
            </Button>
          </Popconfirm>
        </section>
      )}

      {!p.hired && (
        <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-sm">
          <span className="flex items-center gap-2 text-slate-700">
            <UserRound size={16} />
            {p.summary.customerLabel}
            {p.summary.customerRating && (
              <RatingStars variant="compact" value={p.summary.customerRating.average} count={p.summary.customerRating.count} />
            )}
          </span>
          <span className="text-xs text-slate-500">
            {p.summary.quoteCount ? `${p.summary.quoteCount} other quote${p.summary.quoteCount === 1 ? '' : 's'}` : 'Be the first to quote'}
          </span>
        </div>
      )}

      {p.circle && !p.hired && (
        <div className="flex flex-col gap-1.5">
          <JobMap area={null} jobs={[]} center={p.circle} height={200} />
          <div className="text-[11px] text-slate-500">Approximate area. The exact address is shared after you're hired.</div>
        </div>
      )}

      <QuoteSection quote={p.quote} />

      {!p.hired && (
        <button
          type="button"
          disabled
          className="flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-500 disabled:bg-slate-50"
        >
          <MessageCircleQuestion size={16} />
          Ask the customer a question · coming soon
        </button>
      )}
    </div>
  );
};

export default ProviderJobLayout;
