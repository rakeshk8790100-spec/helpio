import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { JobsView } from '../client/default/jobs/jobs.layout.types';
import type { NearbyJobsLayoutProps } from '../client/default/jobs/jobs.layout.types';
import type { NearbyJob } from '../common/CommonDto';
import { RouterKeys, toPath } from '../config/router/RouterKeys';
import { apiErrorMessage } from '../lib/apiError';
import { formatINR } from '../lib/utils';
import { useGetNearbyJobsQuery } from '../pages/jobs/jobs.api';

/** Distance filter steps in km; 0 means any distance within the provider's radius */
const DISTANCES = [0, 2, 5, 10, 25];

const mapMeta = (job: NearbyJob) =>
  [job.approxDistanceKm !== null && `~${job.approxDistanceKm} km`, job.budget !== null ? formatINR(job.budget) : 'Open budget']
    .filter(Boolean)
    .join(' · ');

/** /pro/jobs: open jobs near the provider, filtered, as a list or on an approximate map. */
export const useNearbyJobs = (): NearbyJobsLayoutProps => {
  const navigate = useNavigate();
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
  });

  const radiusKm = data?.area ? data.area.radiusM / 1000 : Infinity;
  const open = (job: NearbyJob) => navigate(toPath(RouterKeys.PRO_JOB_DETAIL, { id: job.id }));

  return {
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
