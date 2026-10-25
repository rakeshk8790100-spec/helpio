import { ArrowLeft } from 'lucide-react';
import { StatusBadge } from '../../../component/ui';
import type { JobSummary } from './jobs.layout.types';

/** Job header shared by the customer's job hub and the provider's job page: status, title, facts, notes, photos. */
const JobSummaryBlock = ({ summary, onBack, backLabel }: { summary: JobSummary; onBack: () => void; backLabel: string }) => (
  <div className="flex flex-col gap-4">
    <button type="button" onClick={onBack} className="flex items-center gap-1 self-start text-sm font-medium text-slate-600">
      <ArrowLeft size={16} />
      {backLabel}
    </button>
    <div>
      <div className="flex flex-wrap items-center gap-1.5">
        <StatusBadge label={summary.badge.label} tone={summary.badge.tone} />
        {summary.isEmergency && <StatusBadge label="Urgent" tone="error" />}
        {summary.edited && <StatusBadge label="Edited" tone="neutral" />}
      </div>
      <div className="mt-2 text-xl font-bold leading-tight text-slate-900">{summary.title}</div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {summary.facts.map((fact) => (
          <span key={fact} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
            {fact}
          </span>
        ))}
      </div>
    </div>
    {summary.description && (
      <div className="whitespace-pre-line rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">{summary.description}</div>
    )}
    {summary.photos.length > 0 && (
      <div className="grid grid-cols-3 gap-2">
        {summary.photos.map((photo) =>
          photo.contentType.startsWith('video/') ? (
            <video key={photo.id} src={photo.url} controls className="aspect-square w-full rounded-xl bg-slate-900 object-cover" />
          ) : (
            <a key={photo.id} href={photo.url} target="_blank" rel="noreferrer" className="block">
              <img src={photo.url} alt="Job photo" className="aspect-square w-full rounded-xl object-cover" />
            </a>
          ),
        )}
      </div>
    )}
  </div>
);

export default JobSummaryBlock;
