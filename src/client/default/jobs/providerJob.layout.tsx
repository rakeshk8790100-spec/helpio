import { Alert, Button, Form, Input, InputNumber } from 'antd';
import { Lock, MessageCircleQuestion, UserRound } from 'lucide-react';
import { QuoteStatus } from '../../../common/CommonEnum';
import { JobMap } from '../../../component/marketplace';
import { AlertBanner, Chip, PageSkeleton, StatusBadge } from '../../../component/ui';
import { formatINR } from '../../../lib/utils';
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
      <div className="mt-1 text-xs text-slate-500">Payment is held in escrow before you start, so you're always paid for approved work.</div>
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
      <JobSummaryBlock summary={p.summary} onBack={p.onBack} backLabel="Jobs near you" />

      <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-sm">
        <span className="flex items-center gap-2 text-slate-700">
          <UserRound size={16} />
          {p.summary.customerLabel}
        </span>
        <span className="text-xs text-slate-500">
          {p.summary.quoteCount ? `${p.summary.quoteCount} other quote${p.summary.quoteCount === 1 ? '' : 's'}` : 'Be the first to quote'}
        </span>
      </div>

      {p.circle && (
        <div className="flex flex-col gap-1.5">
          <JobMap area={null} jobs={[]} center={p.circle} height={200} />
          <div className="text-[11px] text-slate-500">Approximate area. The exact address is shared after you're hired.</div>
        </div>
      )}

      <QuoteSection quote={p.quote} />

      <button
        type="button"
        disabled
        className="flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-500 disabled:bg-slate-50"
      >
        <MessageCircleQuestion size={16} />
        Ask the customer a question · coming soon
      </button>
    </div>
  );
};

export default ProviderJobLayout;
