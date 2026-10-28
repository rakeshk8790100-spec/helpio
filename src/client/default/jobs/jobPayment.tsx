import { Button, Skeleton } from 'antd';
import { CircleCheck, Hourglass, RotateCcw, ShieldCheck, Wallet } from 'lucide-react';
import { AlertBanner, StatusBadge } from '../../../component/ui';
import type { JobPaymentProps } from './jobs.layout.types';

const TONE = {
  due: { box: 'border-indigo-100 bg-indigo-50/50', divider: 'border-indigo-100', Icon: Wallet, icon: 'text-indigo-600' },
  waiting: { box: 'border-amber-200 bg-amber-50/60', divider: 'border-amber-200', Icon: Hourglass, icon: 'text-amber-600' },
  done: { box: 'border-emerald-100 bg-emerald-50', divider: 'border-emerald-100', Icon: CircleCheck, icon: 'text-emerald-600' },
} as const;

/** After 100%, on both job pages: the customer pays on Razorpay; the pro sees the payment, then Helpio's transfer. */
const JobPaymentBlock = ({ payment: p }: { payment: JobPaymentProps }) => {
  if (p.status === 'loading') return <Skeleton active paragraph={{ rows: 2 }} />;
  if (p.status === 'error') return <AlertBanner message={p.message} onRetry={p.onRetry} />;
  const tone = TONE[p.tone];

  return (
    <section className={`rounded-2xl border p-4 ${tone.box}`}>
      <div className="flex items-start justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <tone.Icon size={16} className={`shrink-0 ${tone.icon}`} />
          {p.title}
        </span>
        <StatusBadge label={p.badge.label} tone={p.badge.tone} />
      </div>
      <div role="status" className="mt-1 text-xs text-slate-600">
        {p.confirming ? 'Checking your payment with Razorpay…' : p.text}
      </div>

      {p.lastError && (
        <div role="alert" className="mt-3 flex gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
          <RotateCcw size={14} className="mt-0.5 shrink-0" />
          <span>
            <span className="font-semibold">Your last try didn't go through: </span>
            {p.lastError}. You can try again.
          </span>
        </div>
      )}

      {p.pay && (
        <>
          <Button
            type="primary"
            size="large"
            block
            icon={<ShieldCheck size={16} />}
            loading={p.pay.starting || p.confirming}
            onClick={p.pay.onPay}
            className="!mt-3"
          >
            {p.pay.label}
          </Button>
          <div className="mt-2 text-center text-[11px] text-slate-500">
            Secured by Razorpay. Helpio never sees your UPI PIN or bank login.
          </div>
        </>
      )}

      {p.tries.length > 0 && (
        <div className={`mt-3 border-t pt-3 ${tone.divider}`}>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Payment tries</div>
          <ul className="mt-2 flex flex-col gap-2">
            {p.tries.map((t) => (
              <li key={t.id} className="flex flex-col gap-0.5 text-xs">
                <span className="flex items-center gap-2">
                  <StatusBadge label={t.badge.label} tone={t.badge.tone} />
                  <span className="text-slate-500">{t.meta}</span>
                </span>
                {t.reason && <span className="text-slate-600">{t.reason}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};

export default JobPaymentBlock;
