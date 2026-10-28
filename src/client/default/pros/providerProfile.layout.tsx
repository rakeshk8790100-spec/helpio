import { Alert, Button, Drawer, Input, Skeleton } from 'antd';
import { ArrowLeft, BadgeCheck, CalendarDays, CircleCheck, Circle, FilePlus, MapPin, Send, Star } from 'lucide-react';
import { PROFICIENCY_LABEL } from '../../../component/marketplace';
import { AlertBanner, Avatar, PageSkeleton, RatingStars, SectionHeader } from '../../../component/ui';
import { formatShortDate } from '../../../lib/utils';
import type { ProviderProfileLayoutProps, RequestSheetProps } from './pros.layout.types';

const RequestSheet = (r: RequestSheetProps) => (
  <Drawer open={r.open} onClose={r.onClose} placement="bottom" height="auto" title={`Ask ${r.providerName} for a quote`} destroyOnHidden>
    <div className="flex flex-col gap-4">
      <div className="text-sm text-slate-600">
        Send one of your posted jobs. {r.providerName} sees it first and replies with a price. You pay only after you accept.
      </div>
      {r.jobs.status === 'loading' && <Skeleton active paragraph={{ rows: 2 }} />}
      {r.jobs.status === 'error' && <AlertBanner message={r.jobs.message} onRetry={r.jobs.onRetry} />}
      {r.jobs.status === 'ready' && r.jobs.items.length > 0 && (
        <div role="radiogroup" aria-label="Your open jobs" className="flex max-h-64 flex-col gap-2 overflow-y-auto">
          {r.jobs.items.map((job) => {
            const selected = job.id === r.selectedJobId;
            return (
              <button
                key={job.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => r.onSelectJob(job.id)}
                className={`flex items-center gap-3 rounded-2xl border p-3 text-left ${
                  selected ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-100'
                }`}
              >
                {selected ? <CircleCheck size={18} className="shrink-0 text-indigo-600" /> : <Circle size={18} className="shrink-0 text-slate-300" />}
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-slate-900">{job.title}</span>
                  <span className="block truncate text-xs text-slate-500">{job.meta}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
      {r.jobs.status === 'ready' && r.jobs.items.length > 0 && (
        <Input.TextArea
          rows={2}
          maxLength={2000}
          value={r.message}
          onChange={(e) => r.onMessageChange(e.target.value)}
          placeholder={`Note for ${r.providerName} (optional)`}
          aria-label="Note for the pro"
        />
      )}
      {r.error && <Alert type="error" showIcon title={r.error} />}
      {r.jobs.status === 'ready' && r.jobs.items.length > 0 && (
        <Button type="primary" size="large" block icon={<Send size={16} />} disabled={!r.selectedJobId} loading={r.sending} onClick={r.onSend}>
          Send request
        </Button>
      )}
      <Button size="large" block icon={<FilePlus size={16} />} onClick={r.onPostNew}>
        Post a new job for {r.providerName}
      </Button>
    </div>
  </Drawer>
);

/** /pros/:id: a pro's public profile (no exact location or contact) with "Request this pro". */
const ProviderProfileLayout = (p: ProviderProfileLayoutProps) => {
  if (p.status === 'loading') return <PageSkeleton />;
  if (p.status === 'error') return <AlertBanner message={p.message} onRetry={p.onRetry} />;
  const pro = p.provider;
  const place = [pro.areaName, pro.approxDistanceKm !== null && `~${pro.approxDistanceKm} km away`].filter(Boolean).join(' · ');

  return (
    <div className="flex flex-col gap-6">
      <button type="button" onClick={p.onBack} className="flex items-center gap-1 self-start text-sm font-medium text-slate-600">
        <ArrowLeft size={16} />
        Back
      </button>

      {/* ① Who */}
      <div className="flex flex-col items-center text-center">
        <Avatar name={pro.displayName} src={pro.avatarUrl} size="xl" />
        <div className="mt-3 flex items-center gap-1 text-xl font-bold text-slate-900">
          {pro.displayName}
          <BadgeCheck size={18} className="text-indigo-500" aria-label="Helpio pro" />
        </div>
        <div className="mt-0.5 text-sm font-medium text-indigo-700">
          {[PROFICIENCY_LABEL[pro.topProficiency], pro.maxYearsExperience && `${pro.maxYearsExperience} yrs experience`].filter(Boolean).join(' · ')}
        </div>
        {pro.rating.count > 0 && pro.rating.average !== null && (
          <div className="mt-1.5">
            <RatingStars value={pro.rating.average} count={pro.rating.count} size={16} />
          </div>
        )}
        {place && (
          <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
            <MapPin size={12} />
            {place}
          </div>
        )}
        {pro.radiusKm && <div className="mt-0.5 text-xs text-slate-500">Travels up to {pro.radiusKm} km</div>}
      </div>

      {p.isOwnProfile && (
        <div role="status" className="rounded-xl bg-amber-50 px-3 py-2 text-center text-xs text-amber-800">
          This is how customers see your profile.
        </div>
      )}

      {/* ② About */}
      {pro.bio && (
        <section>
          <SectionHeader title="About" />
          <div className="whitespace-pre-line rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">{pro.bio}</div>
        </section>
      )}

      {/* ③ Skills */}
      <section>
        <SectionHeader title={`Skills (${pro.skillCount})`} />
        <div className="flex flex-col gap-3">
          {pro.categories.map((category) => (
            <div key={category.id} className="rounded-2xl border border-slate-100 p-4 shadow-sm">
              <div className="mb-2 text-sm font-semibold text-slate-900">{category.name}</div>
              <div className="flex flex-col gap-2">
                {category.skills.map((s) => (
                  <div key={s.skillId} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-slate-700">{s.name}</span>
                    <span className="shrink-0 text-xs text-slate-500">
                      {PROFICIENCY_LABEL[s.proficiency]}
                      {s.yearsExperience !== null && ` · ${s.yearsExperience} yrs`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ④ Hours and reviews */}
      {p.hours && (
        <section>
          <SectionHeader title="Working hours" />
          <div className="flex items-center gap-2 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
            <CalendarDays size={16} className="text-indigo-500" />
            {p.hours}
          </div>
        </section>
      )}
      <section>
        <SectionHeader title={pro.rating.count ? `Reviews (${pro.rating.count})` : 'Reviews'} />
        {pro.reviews.length ? (
          <div className="flex flex-col divide-y divide-slate-100 rounded-2xl border border-slate-100 shadow-sm">
            {pro.reviews.map((review) => (
              <div key={review.id} className="flex flex-col gap-1.5 p-4">
                <div className="flex items-center justify-between gap-2">
                  <RatingStars value={review.rating} />
                  <span className="text-[11px] text-slate-500">
                    {review.reviewerLabel} · {formatShortDate(review.createdAt)}
                  </span>
                </div>
                {review.comment && <div className="whitespace-pre-line text-sm text-slate-700">{review.comment}</div>}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
            <Star size={16} />
            Reviews appear here after {pro.displayName}'s first jobs on Helpio.
          </div>
        )}
      </section>

      {/* Sticky action */}
      {p.request && (
        <div className="sticky -bottom-5 -mx-5 mt-auto border-t border-slate-100 bg-white px-5 pt-3 pb-5">
          <Button type="primary" size="large" block icon={<Send size={16} />} onClick={p.request.onOpen}>
            Request this pro
          </Button>
        </div>
      )}
      {p.request && <RequestSheet {...p.request} />}
    </div>
  );
};

export default ProviderProfileLayout;
