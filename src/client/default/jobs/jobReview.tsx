import { Alert, Button, Input, Rate, Skeleton } from 'antd';
import { Star } from 'lucide-react';
import { AlertBanner, RatingStars } from '../../../component/ui';
import type { JobReviewProps, ReviewView } from './jobs.layout.types';

const ReviewItem = ({ review }: { review: ReviewView }) => (
  <div className="flex flex-col gap-1.5">
    <div className="flex items-center justify-between gap-2">
      <RatingStars value={review.rating} />
      <span className="text-[11px] text-slate-500">{review.caption}</span>
    </div>
    {review.comment && (
      <div className="whitespace-pre-line rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">"{review.comment}"</div>
    )}
  </div>
);

/** After 100%, on both job pages: rate the other side once, and see their rating of me. */
const JobReviewBlock = ({ review: r }: { review: JobReviewProps }) => {
  if (r.status === 'loading') return <Skeleton active paragraph={{ rows: 2 }} />;
  if (r.status === 'error') return <AlertBanner message={r.message} onRetry={r.onRetry} />;
  const { form } = r;

  return (
    <section className="rounded-2xl border border-slate-100 p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Star size={16} className="shrink-0 text-amber-500" />
        {r.title}
      </div>

      {form && (
        <>
          <div className="mt-1 text-xs text-slate-500">{form.hint}</div>
          <div className="mt-3 flex justify-center">
            <Rate value={form.rating} onChange={form.onRatingChange} allowClear={false} className="!text-3xl" aria-label="Your rating, 1 to 5 stars" />
          </div>
          <Input.TextArea
            value={form.comment}
            onChange={(e) => form.onCommentChange(e.target.value)}
            rows={3}
            maxLength={form.maxLength}
            showCount
            placeholder="What went well, and what could be better? (optional)"
            className="!mt-3"
            aria-label="Your review"
          />
          {form.error && <Alert type="error" showIcon title={form.error} className="!mt-3" />}
          <Button type="primary" size="large" block loading={form.sending} onClick={form.onSend} className="!mt-3">
            Send review
          </Button>
        </>
      )}

      {(r.theirs || r.mine) && (
        <div className={`flex flex-col gap-4 ${form ? 'mt-4 border-t border-slate-100 pt-4' : 'mt-3'}`}>
          {r.theirs && <ReviewItem review={r.theirs} />}
          {r.mine && <ReviewItem review={r.mine} />}
        </div>
      )}
      {r.waitingText && <div className="mt-3 text-xs text-slate-500">{r.waitingText}</div>}
    </section>
  );
};

export default JobReviewBlock;
