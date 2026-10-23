import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EARN_SECTION_ID } from '../client/default/hero/hero.layout.types';
import type { LandingLayoutProps } from '../client/default/hero/hero.layout.types';
import { useSearchServicesQuery } from '../common/CommonApi';
import { UserRole } from '../common/CommonEnum';
import { RouterKeys, toPath, withQuery } from '../config/router/RouterKeys';
import { useDebouncedValue } from './useDebouncedValue';
import { draftJobDescription } from '../lib/utils';
import { useGetLandingQuery } from '../pages/hero/hero.api';

/** Average weeks per month, for turning weekly hours into a monthly estimate */
const WEEKS_PER_MONTH = 4.3;

/** All landing page behaviour; returns ready-to-render layout props. */
export const useLanding = (): LandingLayoutProps => {
  const navigate = useNavigate();
  const { data } = useGetLandingQuery();

  const [searchText, setSearchText] = useState('');
  const debounced = useDebouncedValue(searchText.trim());
  // Only search from 2 characters
  const term = debounced.length >= 2 ? debounced : '';
  const { data: results = [], isFetching: searching } = useSearchServicesQuery(term, { skip: !term });

  const [skillId, setSkillId] = useState<string>();
  const [hours, setHours] = useState(20);
  const [jobText, setJobText] = useState('');

  if (!data) return { loading: true };

  const rate = data.earningRates.find((r) => r.skillId === skillId) ?? data.earningRates[0];
  // Round to the nearest ₹100 so the estimate doesn't look falsely precise
  const monthlyEstimate = Math.round((rate.hourlyAvg * hours * WEEKS_PER_MONTH) / 100) * 100;

  const postJob = (params: Record<string, string> = {}) => navigate(withQuery(RouterKeys.POST_JOB, params));
  const joinProvider = () => navigate(withQuery(RouterKeys.REGISTER, { role: UserRole.PROVIDER, skill: rate.skillId }));

  return {
    loading: false,

    search: {
      value: searchText,
      onChange: setSearchText,
      term,
      results,
      loading: searching,
      onSelect: (s) => navigate(toPath(RouterKeys.SERVICE_DETAIL, { id: s.id })),
      onPostCustom: (t) => postJob({ title: t }),
    },
    quickCategories: {
      items: data.categories.slice(0, 6),
      onPick: (c) => setSearchText(c.name),
    },
    stats: data.stats,

    onPostJob: () => postJob(),
    onExploreEarning: () => document.getElementById(EARN_SECTION_ID)?.scrollIntoView({ behavior: 'smooth' }),
    topMonthlyEarning: data.topMonthlyEarning,

    popular: {
      items: data.popular,
      onBook: (s) => navigate(toPath(RouterKeys.SERVICE_DETAIL, { id: s.id })),
      onSeeAll: () => navigate(RouterKeys.SEARCH),
    },
    categories: {
      items: data.categories,
      onSelect: (c) => navigate(toPath(RouterKeys.CATEGORY, { id: c.id })),
      onMore: () => navigate(RouterKeys.SEARCH),
    },

    earnings: {
      rates: data.earningRates,
      skillId: rate.skillId,
      onSkillChange: setSkillId,
      hours,
      onHoursChange: setHours,
      monthlyEstimate,
    },
    onJoinProvider: joinProvider,

    testimonials: data.testimonials,
    faqs: data.faqs,

    composer: {
      value: jobText,
      onChange: setJobText,
      onImprove: () => setJobText(draftJobDescription(jobText)),
      onSubmit: () => postJob(jobText ? { description: jobText } : {}),
    },
  };
};
