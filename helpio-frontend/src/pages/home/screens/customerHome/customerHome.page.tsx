import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CustomerHomeLayout } from '@/clients';
import { useGetSkillCatalogQuery } from '@/common/CommonApi';
import { useGetAddressesQuery } from '@/common/CommonApi';
import type { AuthUser, Category, Job } from '@/common/CommonDto';
import { JobStatus, MilestoneStatus } from '@/common/CommonEnum';
import { MOCK_CATEGORIES } from '@/common/CommonMock';
import { toJobItem } from '@/common/JobDisplay';
import SuspenseWrapper from '@/components/wrapper/SuspenseWrapper';
import { LIVE } from '@/config/base_service/base.api';
import { RouterKeys, toPath, withQuery } from '@/config/router/RouterKeys';
import { apiErrorMessage } from '@/lib/apiError';
import { callEmergency } from '@/lib/safety';
import { firstName } from '@/lib/utils';
import { useSearchProvidersQuery } from '@/pages/pros/pros.api';
import { useAppDispatch } from '@/redux';
import { favoritesEditorOpened } from '@/redux/authSlice';
import { MAX_FAVORITES } from '@/pages/customer/screens/favorites/types/favorites.enum';
import { useGetCustomerHomeQuery } from './customerHome.api';
import type { CustomerHomeLayoutProps } from './types/customerHome.dto';

const HOME_PROS = 6;
/** Grid tile ids for requested services, so they never clash with skill ids */
const REQUEST_TILE = 'req:';

/** What the active-job card says for each hired stage: status, next step and button. */
const ACTIVE_COPY: Partial<Record<JobStatus, (job: Job) => { statusLabel: string; nextStep: string; actionLabel: string }>> = {
  [JobStatus.ACCEPTED]: () => ({
    statusLabel: 'Pro hired',
    nextStep: 'Share your start PIN only when the pro is at your door. Work starts with it.',
    actionLabel: 'View PIN',
  }),
  [JobStatus.FUNDED]: () => ({
    statusLabel: 'Payment secured',
    nextStep: 'Share your start PIN when the pro arrives. Work begins only with it.',
    actionLabel: 'View start PIN',
  }),
  [JobStatus.IN_PROGRESS]: (job) =>
    job.milestoneStatus === MilestoneStatus.SUBMITTED
      ? {
          statusLabel: 'Approval needed',
          nextStep: `Your pro finished ${(job.milestoneStage ?? 1) * 25}% and sent photos. Check them and approve.`,
          actionLabel: 'Review update',
        }
      : {
          statusLabel: 'Work in progress',
          nextStep: "Your pro has started. You'll approve the work in 25% steps, with photos at each.",
          actionLabel: 'Open job',
        },
  [JobStatus.PAYMENT_DUE]: () => ({
    statusLabel: 'Payment due',
    nextStep: 'All four stages are approved. Pay with UPI or netbanking to complete the job, then rate your pro.',
    actionLabel: 'Pay now',
  }),
};

/** Signed-in customer home: live job, quotes to review, posted jobs and drafts, plus search and discovery. */
const useCustomerHome = (user: AuthUser): CustomerHomeLayoutProps => {
  const navigate = useNavigate();
  const { data, error, isLoading, refetch } = useGetCustomerHomeQuery(undefined, { ...LIVE, pollingInterval: 60_000 });
  const addresses = useGetAddressesQuery();
  // Searches from the default address; skipped until the customer has one
  const pros = useSearchProvidersQuery({}, { skip: !addresses.data?.length });
  const [jobText, setJobText] = useState('');
  const dispatch = useAppDispatch();
  const favoriteIds = user.favoriteSkillIds;
  // '' = all favourites
  const [favoriteFilter, setFavoriteFilter] = useState('');
  const activeFilter = favoriteIds.includes(favoriteFilter) ? favoriteFilter : '';
  const catalog = useGetSkillCatalogQuery();
  const favoritePros = useSearchProvidersQuery(
    { skillIds: activeFilter ? [activeFilter] : favoriteIds },
    { skip: !favoriteIds.length || !addresses.data?.length },
  );
  const skills = new Map(
    catalog.data?.flatMap((c) => c.skills.map((s) => [s.id, { name: s.name, categoryId: c.id, icon: c.icon }] as const)) ?? [],
  );
  const skillNames = new Map([...skills].map(([id, s]) => [id, s.name] as const));
  // Chosen favourites (services still in the catalogue, plus ones asked for), shown under the categories
  const requests = user.favoriteRequests;
  const favoriteTiles: Category[] = [
    ...favoriteIds.flatMap((id) => {
      const skill = skills.get(id);
      return skill ? [{ id, name: skill.name, icon: skill.icon }] : [];
    }),
    // Not in the catalogue yet: generic icon, opens a search for the name
    ...requests.map((r) => ({ id: REQUEST_TILE + r.id, name: r.name, icon: '' })),
  ];
  const openPro = (id: string) => navigate(toPath(RouterKeys.PRO_PROFILE, { id }));

  const openJob = (job: Job) => navigate(toPath(RouterKeys.JOB_DETAIL, { id: job.id }));
  const postJob = (params: Record<string, string> = {}) => navigate(withQuery(RouterKeys.POST_JOB, params));

  const jobs = ((): CustomerHomeLayoutProps['jobs'] => {
    if (isLoading) return { status: 'loading' };
    if (!data) return { status: 'error', message: apiErrorMessage(error), onRetry: refetch };

    const active = data.activeJob;
    const copy = active && ACTIVE_COPY[active.status]?.(active);
    const item = (job: Job) => toJobItem(job, openJob, (draft) => postJob({ job: draft.id }));
    const decisions = data.awaitingDecision.map(item);
    const waiting = data.waitingForQuotes.map(item);
    const drafts = data.drafts.map(item);

    return {
      status: 'ready',
      active: active && copy ? {
        eyebrow: 'Your active job',
        title: active.title,
        progressPct: active.progressPct,
        ...copy,
        onAction: () => openJob(active),
        onSafety: callEmergency,
      } : null,
      decisions,
      waiting,
      drafts,
      onSeeAll: () => navigate(RouterKeys.JOBS),
    };
  })();

  return {
    firstName: firstName(user.name),
    onSearch: () => navigate(RouterKeys.SEARCH),
    jobs,
    onPostJob: () => postJob(),
    onEmergencyJob: () => postJob({ emergency: '1' }),
    composer: {
      value: jobText,
      onChange: setJobText,
      onSubmit: () => postJob(jobText.trim() ? { describe: jobText.trim() } : {}),
    },
    categories: {
      title: 'Browse categories',
      // Catalogue mocks until a categories/services endpoint exists
      items: MOCK_CATEGORIES,
      onSelect: (c) => navigate(toPath(RouterKeys.CATEGORY, { id: c.id })),
      onMore: () => navigate(RouterKeys.SEARCH),
    },
    myFavorites: favoriteTiles.length
      ? {
          items: favoriteTiles,
          // Skill tiles open the skill's category; requested ones search pros by the name
          onSelect: (c) =>
            navigate(
              c.id.startsWith(REQUEST_TILE)
                ? withQuery(RouterKeys.SEARCH, { q: c.name })
                : toPath(RouterKeys.CATEGORY, { id: skills.get(c.id)?.categoryId ?? c.id }),
            ),
          onEdit: () => dispatch(favoritesEditorOpened()),
          remaining: Math.max(0, MAX_FAVORITES - favoriteIds.length - requests.length),
        }
      : null,
    pros: pros.data?.providers.length
      ? {
          items: pros.data.providers.slice(0, HOME_PROS).map((provider) => ({
            provider,
            onOpen: () => navigate(toPath(RouterKeys.PRO_PROFILE, { id: provider.id })),
          })),
          onSeeAll: () => navigate(RouterKeys.SEARCH),
        }
      : null,
    favorites: !favoriteIds.length
      ? { kind: 'pick', onPick: () => dispatch(favoritesEditorOpened()) }
      : !addresses.data?.length
        ? null
        : {
            kind: 'pros',
            chips: [
              { value: '', label: 'All' },
              ...favoriteIds.map((id) => ({ value: id, label: skillNames.get(id) ?? 'Service' })),
            ],
            selected: activeFilter,
            onSelect: setFavoriteFilter,
            onEdit: () => dispatch(favoritesEditorOpened()),
            results: favoritePros.isLoading || (favoritePros.isFetching && !favoritePros.data)
              ? { status: 'loading' }
              : !favoritePros.data
                ? { status: 'error', message: apiErrorMessage(favoritePros.error), onRetry: favoritePros.refetch }
                : {
                    status: 'ready',
                    items: favoritePros.data.providers.slice(0, HOME_PROS).map((provider) => ({
                      provider,
                      onOpen: () => openPro(provider.id),
                    })),
                  },
          },
  };
};

const CustomerHomePage = ({ user }: { user: AuthUser }) => (
  <SuspenseWrapper>
    <CustomerHomeLayout {...useCustomerHome(user)} />
  </SuspenseWrapper>
);

export default CustomerHomePage;
