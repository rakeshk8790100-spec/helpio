import { Button, Descriptions, Drawer, Image, Input, Modal, Select, Skeleton, Table } from 'antd';
import { MessagesSquare } from 'lucide-react';
import type { ReactNode } from 'react';
import ReasonDialog from '@/clients/default/admin/shared/reasonDialog';
import { JobStatus } from '@/common/CommonEnum';
import { JOB_STATUS_BADGE, PAYMENT_BADGE, PAYOUT_BADGE, QUOTE_BADGE, STAGE_BADGE } from '@/common/CommonLabels';
import { PageHeader } from '@/components/admin';
import { AlertBanner, RatingStars, StatusBadge } from '@/components/ui';
import { formatClock, formatINR } from '@/lib/utils';
import type { JobsAdminLayoutProps } from '@/pages/admin/screens/jobs/types/jobs.dto';
import type { AdminJobRow } from '@/pages/admin/types/admin.models';

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="mt-6">
    <div className="mb-2 text-sm font-semibold text-slate-900">{title}</div>
    {children}
  </section>
);

/** /admin/jobs: every job, searchable; a panel with everything about one, its chat (audited) and Cancel. */
const JobsAdminLayout = (p: JobsAdminLayoutProps) => (
  <div>
    <PageHeader
      title="Jobs"
      description="Recently changed first. Open a job to see both people, every stage with photos, payments and the timeline."
      actions={
        <>
          <Select
            allowClear
            placeholder="Any stage"
            value={p.status.value}
            onChange={(value) => p.status.onChange(value ?? null)}
            options={Object.values(JobStatus).map((value) => ({ value, label: JOB_STATUS_BADGE[value].label }))}
            className="w-48"
            aria-label="Stage"
          />
          <Input.Search
            allowClear
            value={p.search.value}
            onChange={(e) => p.search.onChange(e.target.value)}
            onSearch={p.search.onSearch}
            placeholder="Title or customer"
            className="!w-64"
            aria-label="Search"
          />
        </>
      }
    />
    {p.list.status === 'error' ? (
      <AlertBanner message={p.list.message} onRetry={p.list.onRetry} />
    ) : (
      <Table<AdminJobRow>
        rowKey="id"
        loading={p.list.status === 'loading' || p.list.fetching}
        dataSource={p.list.status === 'ready' ? p.list.rows : []}
        className="rounded-2xl border border-slate-100 bg-white shadow-sm"
        onRow={(row) => ({
          onClick: () => p.list.status === 'ready' && p.list.onOpen(row.id),
          onKeyDown: (e) => e.key === 'Enter' && p.list.status === 'ready' && p.list.onOpen(row.id),
          tabIndex: 0,
          className: 'cursor-pointer focus-visible:outline-2 focus-visible:outline-indigo-500',
        })}
        pagination={
          p.list.status === 'ready' && {
            current: p.list.page,
            pageSize: p.list.pageSize,
            total: p.list.total,
            showSizeChanger: false,
            onChange: p.list.onPageChange,
          }
        }
        columns={p.columns}
      />
    )}

    <Drawer open={p.detail !== null} onClose={p.detail?.onClose} width={720} title="Job" destroyOnHidden>
      {p.detail?.status === 'loading' && <Skeleton active />}
      {p.detail?.status === 'error' && <AlertBanner message={p.detail.message} onRetry={p.detail.onRetry} />}
      {p.detail?.status === 'ready' && (() => {
        const { job, chat, onCancel } = p.detail;
        return (
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-lg font-semibold text-slate-900">{job.title}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <StatusBadge label={JOB_STATUS_BADGE[job.status].label} tone={JOB_STATUS_BADGE[job.status].tone} />
                  {job.isEmergency && <StatusBadge label="Emergency" tone="error" />}
                  <span className="text-xs text-slate-500">Posted {formatClock(job.createdAt)}</span>
                </div>
              </div>
              <span className="flex shrink-0 gap-2">
                <Button size="small" icon={<MessagesSquare size={14} />} loading={chat.loading} onClick={chat.onRead}>
                  Read chat
                </Button>
                {onCancel && (
                  <Button size="small" danger onClick={onCancel}>
                    Cancel job
                  </Button>
                )}
              </span>
            </div>
            {job.description && <div className="mt-3 whitespace-pre-line rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">{job.description}</div>}
            <Descriptions size="small" column={2} className="!mt-4" bordered>
              <Descriptions.Item label="Customer">
                {job.customerParty.name ?? job.customerParty.email}
                <div className="text-xs text-slate-500">{[job.customerParty.phone, job.customerParty.email].filter(Boolean).join(' · ')}</div>
              </Descriptions.Item>
              <Descriptions.Item label="Pro">
                {job.proParty ? (
                  <>
                    {job.proParty.name ?? job.proParty.email}
                    <div className="text-xs text-slate-500">{[job.proParty.phone, job.proParty.email].filter(Boolean).join(' · ')}</div>
                  </>
                ) : (
                  '–'
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Place">{[job.area, job.pincode].filter(Boolean).join(' ') || '–'}</Descriptions.Item>
              <Descriptions.Item label="When">{job.scheduledAt ? formatClock(job.scheduledAt) : 'Flexible'}</Descriptions.Item>
              <Descriptions.Item label="Budget">{job.budget !== null ? formatINR(job.budget) : '–'}</Descriptions.Item>
              <Descriptions.Item label="Started">{job.startedAt ? formatClock(job.startedAt) : '–'}</Descriptions.Item>
            </Descriptions>

            <Section title={`Quotes (${job.quotes.length})`}>
              {job.quotes.length ? (
                <ul className="flex flex-col divide-y divide-slate-100">
                  {job.quotes.map((q) => (
                    <li key={`${q.pro}-${q.createdAt}`} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span className="min-w-0">
                        <span className="text-slate-800">{q.pro}</span>
                        {q.message && <span className="block truncate text-xs text-slate-500">"{q.message}"</span>}
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="font-semibold text-slate-900">{formatINR(q.amount)}</span>
                        <StatusBadge label={QUOTE_BADGE[q.status].label} tone={QUOTE_BADGE[q.status].tone} />
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-xs text-slate-500">No quotes yet.</div>
              )}
            </Section>

            {job.stages.length > 0 && (
              <Section title="Stages">
                <div className="flex flex-col gap-3">
                  {job.stages.map((s) => {
                    const last = s.attempts.at(-1);
                    return (
                      <div key={s.stage} className="rounded-xl border border-slate-100 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-slate-900">{s.percent}%</span>
                          <span className="flex items-center gap-2">
                            {s.attempts.length > 1 && <span className="text-[11px] text-slate-500">{s.attempts.length} tries</span>}
                            <StatusBadge label={STAGE_BADGE[s.status].label} tone={STAGE_BADGE[s.status].tone} />
                          </span>
                        </div>
                        {last && (
                          <div className="mt-2 flex flex-col gap-2">
                            <div className="text-xs text-slate-600">"{last.note}"</div>
                            {last.reviewNote && <div className="text-xs text-red-700">Customer: "{last.reviewNote}"</div>}
                            {last.photos.length > 0 && (
                              <Image.PreviewGroup>
                                <div className="flex gap-2">
                                  {last.photos.slice(0, 6).map((url) => (
                                    <Image key={url} src={url} width={64} height={64} className="rounded-lg object-cover" alt="Work photo" />
                                  ))}
                                </div>
                              </Image.PreviewGroup>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Section>
            )}

            {job.payments.length > 0 && (
              <Section title="Payments">
                <ul className="flex flex-col divide-y divide-slate-100">
                  {job.payments.map((pay) => (
                    <li key={pay.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span className="text-slate-800">
                        {formatINR(pay.amount)} · {pay.tries} {pay.tries === 1 ? 'try' : 'tries'}
                        {pay.lastError && <span className="block text-xs text-red-700">{pay.lastError}</span>}
                      </span>
                      <span className="flex shrink-0 gap-2">
                        <StatusBadge label={PAYMENT_BADGE[pay.status].label} tone={PAYMENT_BADGE[pay.status].tone} />
                        {pay.status === 'paid' && (
                          <StatusBadge label={PAYOUT_BADGE[pay.payoutStatus].label} tone={PAYOUT_BADGE[pay.payoutStatus].tone} />
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {job.reviews.length > 0 && (
              <Section title="Reviews">
                <ul className="flex flex-col gap-2">
                  {job.reviews.map((r) => (
                    <li key={r.id} className="rounded-xl bg-slate-50 px-3 py-2">
                      <span className="flex items-center justify-between">
                        <RatingStars value={r.stars} />
                        <span className="text-[11px] text-slate-500">{r.author}</span>
                      </span>
                      {r.comment && <span className="mt-1 block text-sm text-slate-700">{r.comment}</span>}
                      {r.hidden && <StatusBadge label="Hidden" tone="neutral" />}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            <Section title="Timeline">
              <ol className="flex flex-col gap-1">
                {job.events.map((e) => (
                  <li key={`${e.type}-${e.at}`} className="flex justify-between gap-3 text-xs">
                    <span className="text-slate-700">
                      {e.actor ? `${e.actor}: ` : ''}
                      {e.type.replace(/_/g, ' ')}
                      {typeof e.data.stage === 'number' ? ` (${e.data.stage * 25}%)` : ''}
                    </span>
                    <span className="shrink-0 text-slate-500">{formatClock(e.at)}</span>
                  </li>
                ))}
              </ol>
            </Section>

            <Modal open={chat.open} onCancel={chat.onClose} footer={null} title="Chat (read-only)">
              <div className="mb-3 text-xs text-slate-500">Reading a chat is recorded in the audit log.</div>
              {chat.messages?.length ? (
                <ul className="flex max-h-96 flex-col gap-2 overflow-y-auto">
                  {chat.messages.map((m) => (
                    <li key={m.id} className="rounded-xl bg-slate-50 px-3 py-2">
                      <span className="block text-[11px] font-semibold text-slate-600">
                        {m.sender} · {formatClock(m.at)}
                      </span>
                      <span className="block whitespace-pre-line text-sm text-slate-800">{m.body}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-slate-500">No messages.</div>
              )}
            </Modal>
          </div>
        );
      })()}
    </Drawer>
    {p.dialog && <ReasonDialog {...p.dialog} />}
  </div>
);

export default JobsAdminLayout;
