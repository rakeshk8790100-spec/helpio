import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { JobsView, ProJobsTab } from '../client/default/jobs/jobs.layout.types';
import type { HiredJobItem, NearbyJobsLayoutProps } from '../client/default/jobs/jobs.layout.types';
import type { NearbyJob, ProviderJob } from '../common/CommonDto';
import { JobStatus, MilestoneStatus } from '../common/CommonEnum';
import type { BadgeTone } from '../component/ui';
import { RouterKeys, toPath } from '../config/router/RouterKeys';
import { apiErrorMessage } from '../lib/apiError';
import { formatINR } from '../lib/utils';
import { useGetNearbyJobsQuery, useGetProviderJobsQuery } from '../pages/jobs/jobs.api';
import { useNow } from './useNow';

/** Distance filter steps in km; 0 means any distance within the provider's radius */
const DISTANCES = [0, 2, 5, 10, 25];

const mapMeta = (job: NearbyJob) =>
  [job.approxDistanceKm !== null && `~${job.approxDistanceKm} km`, job.budget !== null ? formatINR(job.budget) : 'Open budget']
    .filter(Boolean)
    .join(' · ');

const HIRED_EMPTY: Record<ProJobsTab, string> = {
  [ProJobsTab.NEW]: '',
  [ProJobsTab.ACTIVE]: "No active jobs. When a customer accepts your quote, the job shows here with its progress.",
  [ProJobsTab.COMPLETED]: 'Jobs you finish, with every approved stage, show here.',
};

/** The current stage passed its target without an update */
const isOverdue = (job: ProviderJob, now: number) =>
  job.status === JobStatus.IN_PROGRESS &&
  job.nextDueAt !== null &&
  job.milestoneStatus !== MilestoneStatus.SUBMITTED &&
  new Date(job.nextDueAt).getTime() < now;

/** What the pro should do next on a hired job */
const hiredBadge = (job: ProviderJob, now: number): { label: string; tone: BadgeTone } => {
  if (job.status === JobStatus.COMPLETED) return { label: 'Completed', tone: 'success' };
  if (job.status === JobStatus.PAYMENT_DUE) return { label: 'Waiting for payment', tone: 'warning' };
  if (job.status === JobStatus.ACCEPTED) return { label: 'Start with PIN', tone: 'brand' };
  const pct = `${(job.milestoneStage ?? 1) * 25}%`;
  if (isOverdue(job, now)) return { label: `${pct} overdue`, tone: 'error' };
  switch (job.milestoneStatus) {
    case MilestoneStatus.SUBMITTED:
      return { label: `${pct} waiting for approval`, tone: 'warning' };
    case MilestoneStatus.CHANGES_REQUESTED:
      return { label: `Changes requested on ${pct}`, tone: 'error' };
    default:
      return { label: `Send ${pct} update`, tone: 'brand' };
  }
};

/** Four stages for the card: approved up to the current one, which carries its own state */
const hiredStages = (job: ProviderJob, now: number) =>
  [1, 2, 3, 4].map((stage) => ({
    stage,
    percent: stage * 25,
    overdue: stage === job.milestoneStage && isOverdue(job, now),
    status:
      job.status === JobStatus.COMPLETED ||
      job.status === JobStatus.PAYMENT_DUE ||
      (job.milestoneStage !== null && stage < job.milestoneStage)
        ? MilestoneStatus.APPROVED
        : stage === job.milestoneStage
          ? (job.milestoneStatus ?? MilestoneStatus.PENDING)
          : MilestoneStatus.PENDING,
  }));

/** /pro/jobs: new jobs near the provider (filtered, list or map), and jobs they were hired for, with progress. */
export const useNearbyJobs = (): NearbyJobsLayoutProps => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = Object.values(ProJobsTab).find((value) => value === params.get('tab')) ?? ProJobsTab.NEW;
  const active = useGetProviderJobsQuery('active');
  const completed = useGetProviderJobsQuery('completed', { skip: tab !== ProJobsTab.COMPLETED });
  const hired = tab === ProJobsTab.COMPLETED ? completed : active;
  const now = useNow();
  const [categoryId, setCategoryId] = useState('');
  const [maxKm, setMaxKm] = useState(0);
  const [hasBudget, setHasBudget] = useState(false);
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [view, setView] = useState<JobsView>(JobsView.LIST);
  // `data` keeps the last result while new filters load, so the filter row never empties
  const { data, error, isLoading, isFetching, refetch } = useGetNearbyJobsQuery({
    categoryId: categoryId || undefined,
    maxKm: maxKm || undefined,
    hasBudget,
    urgentOnly,
  }, { skip: tab !== ProJobsTab.NEW });

  const radiusKm = data?.area ? data.area.radiusM / 1000 : Infinity;
  const open = (job: NearbyJob) => navigate(toPath(RouterKeys.PRO_JOB_DETAIL, { id: job.id }));

  const toHiredItem = (job: ProviderJob): HiredJobItem => ({
    id: job.id,
    title: job.title,
    categoryName: job.categoryName,
    customerName: job.customerName ?? job.customerLabel,
    areaName: job.areaName,
    badge: hiredBadge(job, now),
    stages: hiredStages(job, now),
    earned: job.earned,
    amount: job.amount,
    unreadMessages: job.unreadMessages,
    onOpen: () => open(job),
  });
  const activeCount = active.data?.length ?? 0;

  return {
    tab,
    tabs: [
      { value: ProJobsTab.NEW, label: 'New jobs' },
      { value: ProJobsTab.ACTIVE, label: activeCount ? `Active (${activeCount})` : 'Active' },
      { value: ProJobsTab.COMPLETED, label: 'Completed' },
    ],
    onTabChange: (value) => setParams(value === ProJobsTab.NEW ? {} : { tab: value }, { replace: true }),
    hired: hired.isLoading
      ? { status: 'loading' }
      : !hired.data
        ? { status: 'error', message: apiErrorMessage(hired.error), onRetry: hired.refetch }
        : { status: 'ready', items: hired.data.map(toHiredItem), emptyText: HIRED_EMPTY[tab] },
    filters: {
      categories: [{ value: '', label: 'All skills' }, ...(data?.categories ?? []).map((c) => ({ value: c.id, label: c.name }))],
      categoryId,
      onCategoryChange: setCategoryId,
      distances: DISTANCES.filter((km) => km < radiusKm).map((km) => ({ value: km, label: km ? `${km} km` : 'Any distance' })),
      maxKm,
      onMaxKmChange: setMaxKm,
      hasBudget,
      onHasBudgetChange: setHasBudget,
      urgentOnly,
      onUrgentOnlyChange: setUrgentOnly,
    },
    view,
    onViewChange: setView,
    results:
      isLoading || (isFetching && !data)
        ? { status: 'loading' }
        : !data
          ? { status: 'error', message: apiErrorMessage(error), onRetry: refetch }
          : {
              status: 'ready',
              items: data.jobs.map((job) => ({ job, onOpen: () => open(job) })),
              map: {
                area: data.area,
                jobs: data.jobs.flatMap((job) =>
                  job.areaCircle
                    ? [{ id: job.id, title: job.title, meta: mapMeta(job), circle: job.areaCircle, urgent: job.isEmergency, onOpen: () => open(job) }]
                    : [],
                ),
              },
              noLocation: data.area ? null : { onAddLocation: () => navigate(RouterKeys.ONBOARDING_AREA) },
            },
  };
};
