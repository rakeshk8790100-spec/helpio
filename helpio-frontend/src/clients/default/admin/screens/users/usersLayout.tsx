import type { ReactNode } from 'react';
import { Button, Descriptions, Drawer, Input, Popconfirm, Segmented, Select, Skeleton, Table } from 'antd';
import { LogOut } from 'lucide-react';
import type { AdminUserRow } from '../../../common/CommonDto';
import { ApprovalStatus } from '../../../common/CommonEnum';
import { PageHeader } from '../../../component/admin';
import { AlertBanner, Avatar, RatingStars, StatusBadge } from '../../../component/ui';
import { formatClock, formatDays, formatINR } from '../../../lib/utils';
import { APPROVAL_BADGE, JOB_BADGE, PAYMENT_BADGE, PAYOUT_BADGE } from './adminBadges';
import type { UsersLayoutProps } from './admin.layout.types';
import ReasonDialog from './reasonDialog';

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="mt-6">
    <div className="mb-2 text-sm font-semibold text-slate-900">{title}</div>
    {children}
  </section>
);

const Empty = ({ text }: { text: string }) => <div className="text-xs text-slate-500">{text}</div>;

/** /admin/users: every customer and provider, searchable; a panel with everything about one. */
const UsersLayout = (p: UsersLayoutProps) => (
  <div>
    <PageHeader
      title="Customers & providers"
      description="Search by name, email or mobile. Open someone to see their jobs, reviews and payments."
      actions={
        <Input.Search
          allowClear
          value={p.search.value}
          onChange={(e) => p.search.onChange(e.target.value)}
          onSearch={p.search.onSearch}
          placeholder="Name, email or mobile"
          className="!w-72"
          aria-label="Search"
        />
      }
    />
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <Segmented
        value={p.role.value}
        onChange={p.role.onChange}
        options={[
          { value: 'all', label: 'Everyone' },
          { value: 'customer', label: 'Customers' },
          { value: 'provider', label: 'Providers' },
        ]}
      />
      <Select
        allowClear
        placeholder="Any approval"
        value={p.approval.value}
        onChange={(value) => p.approval.onChange(value ?? null)}
        options={Object.values(ApprovalStatus).map((value) => ({ value, label: APPROVAL_BADGE[value].label }))}
        className="w-52"
        aria-label="Approval"
      />
      <Segmented
        value={p.active.value}
        onChange={p.active.onChange}
        options={[
          { value: 'all', label: 'Any' },
          { value: 'active', label: 'Active' },
          { value: 'off', label: 'Deactivated' },
        ]}
      />
    </div>

    {p.list.status === 'error' ? (
      <AlertBanner message={p.list.message} onRetry={p.list.onRetry} />
    ) : (
      <Table<AdminUserRow>
        rowKey="id"
        loading={p.list.status === 'loading' || p.list.fetching}
        dataSource={p.list.status === 'ready' ? p.list.rows : []}
        className="rounded-2xl border border-slate-100 bg-white shadow-sm"
        onRow={(row) => ({ onClick: () => p.list.status === 'ready' && p.list.onOpen(row.id), className: 'cursor-pointer' })}
        pagination={
          p.list.status === 'ready' && {
            current: p.list.page,
            pageSize: p.list.pageSize,
            total: p.list.total,
            showSizeChanger: false,
            onChange: p.list.onPageChange,
          }
        }
        columns={[
          {
            title: 'Person',
            render: (_, u) => (
              <span className="flex items-center gap-3">
                <Avatar name={u.name ?? u.email} size="sm" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-900">{u.name ?? u.email}</span>
                  <span className="block text-xs text-slate-500">{u.email}</span>
                </span>
              </span>
            ),
          },
          { title: 'Role', width: 110, render: (_, u) => <span className="text-sm text-slate-700">{u.role === 'provider' ? 'Provider' : 'Customer'}</span> },
          {
            title: 'Status',
            width: 200,
            render: (_, u) => (
              <span className="flex flex-wrap gap-1">
                <StatusBadge label={APPROVAL_BADGE[u.approvalStatus].label} tone={APPROVAL_BADGE[u.approvalStatus].tone} />
                {!u.isActive && <StatusBadge label="Deactivated" tone="error" />}
              </span>
            ),
          },
          { title: 'Jobs', width: 70, render: (_, u) => <span className="text-sm text-slate-800">{u.jobs}</span> },
          {
            title: 'Rating',
            width: 110,
            render: (_, u) =>
              u.ratingCount && u.ratingAverage !== null ? (
                <RatingStars variant="compact" value={u.ratingAverage} count={u.ratingCount} />
              ) : (
                <span className="text-xs text-slate-400">–</span>
              ),
          },
          { title: 'Joined', width: 160, render: (_, u) => <span className="text-xs text-slate-500">{formatClock(u.createdAt)}</span> },
        ]}
      />
    )}

    <Drawer open={p.detail !== null} onClose={p.detail?.onClose} width={640} title="Customer or provider" destroyOnHidden>
      {p.detail?.status === 'loading' && <Skeleton active />}
      {p.detail?.status === 'error' && <AlertBanner message={p.detail.message} onRetry={p.detail.onRetry} />}
      {p.detail?.status === 'ready' && (() => {
        const { user, busy } = p.detail;
        return (
          <div>
            <div className="flex items-start justify-between gap-3">
              <span className="flex items-center gap-3">
                <Avatar name={user.name ?? user.email} size="md" />
                <span>
                  <span className="block text-lg font-semibold text-slate-900">{user.name ?? user.email}</span>
                  <span className="block text-xs text-slate-500">
                    {user.role === 'provider' ? 'Provider' : 'Customer'} · joined {formatClock(user.createdAt)}
                  </span>
                </span>
              </span>
              <span className="flex flex-wrap justify-end gap-2">
                <Popconfirm title="Sign them out on every device?" okText="Sign out" onConfirm={p.detail.onSignOut}>
                  <Button size="small" icon={<LogOut size={14} />} disabled={busy}>
                    Sign out everywhere
                  </Button>
                </Popconfirm>
                {user.isActive ? (
                  <Button size="small" danger disabled={busy} onClick={p.detail.onDeactivate}>
                    Deactivate
                  </Button>
                ) : (
                  <Button size="small" type="primary" loading={busy} onClick={p.detail.onActivate}>
                    Reactivate
                  </Button>
                )}
              </span>
            </div>
            <Descriptions size="small" column={2} className="!mt-4" bordered>
              <Descriptions.Item label="Email">{user.email}</Descriptions.Item>
              <Descriptions.Item label="Mobile">{user.phone ?? '–'}</Descriptions.Item>
              <Descriptions.Item label="Approval">
                <StatusBadge label={APPROVAL_BADGE[user.approvalStatus].label} tone={APPROVAL_BADGE[user.approvalStatus].tone} />
                {user.approvalNote && <div className="mt-1 text-xs text-slate-500">"{user.approvalNote}"</div>}
              </Descriptions.Item>
              <Descriptions.Item label="Account">
                {user.isActive ? <StatusBadge label="Active" tone="success" /> : <StatusBadge label="Deactivated" tone="error" />}
              </Descriptions.Item>
              {user.role === 'provider' && (
                <>
                  <Descriptions.Item label="Paid by customers">{formatINR(user.earned)}</Descriptions.Item>
                  <Descriptions.Item label="Still to send">{formatINR(user.owed)}</Descriptions.Item>
                </>
              )}
            </Descriptions>

            {user.provider && (
              <Section title="What they offer">
                <div className="flex flex-col gap-1 text-sm text-slate-700">
                  <span>{user.provider.skills.join(', ') || 'No skills yet'}</span>
                  <span className="text-xs text-slate-500">
                    {[user.provider.areaName, user.provider.pincode].filter(Boolean).join(' ')}
                    {user.provider.radiusKm ? ` · up to ${user.provider.radiusKm} km` : ''}
                    {user.provider.workDays.length ? ` · works ${formatDays(user.provider.workDays)}` : ''}
                  </span>
                  {user.provider.bio && <span className="whitespace-pre-line text-xs text-slate-600">{user.provider.bio}</span>}
                  {Object.keys(user.quotes).length > 0 && (
                    <span className="text-xs text-slate-500">
                      Quotes: {Object.entries(user.quotes).map(([status, count]) => `${count} ${status}`).join(', ')}
                    </span>
                  )}
                </div>
              </Section>
            )}

            <Section title={user.role === 'provider' ? 'Jobs hired for' : 'Jobs posted'}>
              {user.jobList.length ? (
                <ul className="flex flex-col divide-y divide-slate-100">
                  {user.jobList.map((job) => (
                    <li key={job.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span className="min-w-0 truncate text-slate-800">{job.title}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        {job.amount !== null && <span className="text-xs text-slate-500">{formatINR(job.amount)}</span>}
                        <StatusBadge label={JOB_BADGE[job.status].label} tone={JOB_BADGE[job.status].tone} />
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty text="No jobs yet." />
              )}
            </Section>

            <Section title={`Reviews about them (${user.ratingCount})${user.reviewsGiven ? ` · ${user.reviewsGiven} written by them` : ''}`}>
              {user.reviewsReceived.length ? (
                <ul className="flex flex-col gap-3">
                  {user.reviewsReceived.map((r) => (
                    <li key={r.id} className="rounded-xl bg-slate-50 px-3 py-2">
                      <span className="flex items-center justify-between gap-2">
                        <RatingStars value={r.stars} />
                        <span className="text-[11px] text-slate-500">
                          {r.author} · {r.jobTitle}
                        </span>
                      </span>
                      {r.comment && <span className="mt-1 block text-sm text-slate-700">{r.comment}</span>}
                      {r.hidden && <StatusBadge label="Hidden" tone="neutral" />}
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty text="No reviews yet." />
              )}
            </Section>

            <Section title="Payments">
              {user.payments.length ? (
                <ul className="flex flex-col divide-y divide-slate-100">
                  {user.payments.map((pay) => (
                    <li key={pay.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span className="min-w-0 truncate text-slate-800">{pay.jobTitle}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="text-xs text-slate-500">{formatINR(pay.amount)}</span>
                        <StatusBadge label={PAYMENT_BADGE[pay.status].label} tone={PAYMENT_BADGE[pay.status].tone} />
                        {pay.status === 'paid' && (
                          <StatusBadge label={PAYOUT_BADGE[pay.payoutStatus].label} tone={PAYOUT_BADGE[pay.payoutStatus].tone} />
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty text="No payments yet." />
              )}
            </Section>
          </div>
        );
      })()}
    </Drawer>
    {p.dialog && <ReasonDialog {...p.dialog} />}
  </div>
);

export default UsersLayout;
