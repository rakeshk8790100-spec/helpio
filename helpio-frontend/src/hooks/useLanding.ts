import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EARN_SECTION_ID } from '../client/default/hero/hero.layout.types';
import type { LandingLayoutProps } from '../client/default/hero/hero.layout.types';
import { RouterKeys, toPath, withQuery } from '../config/router/RouterKeys';
import { useGetLandingQuery } from '../pages/hero/hero.api';
import { useServiceSearch } from './useServiceSearch';

/** Average weeks per month, for turning weekly hours into a monthly estimate */
const WEEKS_PER_MONTH = 4.3;

/** All landing page behaviour; returns ready-to-render layout props. */
export const useLanding = (): LandingLayoutProps => {
  const navigate = useNavigate();
  const { data } = useGetLandingQuery();

  const search = useServiceSearch();

  const [skillId, setSkillId] = useState<string>();
  const [hours, setHours] = useState(20);
  const [jobText, setJobText] = useState('');

  if (!data) return { loading: true };

  const rate = data.earningRates.find((r) => r.skillId === skillId) ?? data.earningRates[0];
  // Round to the nearest ₹100 so the estimate doesn't look falsely precise
  const monthlyEstimate = Math.round((rate.hourlyAvg * hours * WEEKS_PER_MONTH) / 100) * 100;

  const postJob = (params: Record<string, string> = {}) => navigate(withQuery(RouterKeys.POST_JOB, params));
  const joinProvider = () => navigate(withQuery(RouterKeys.PRO_SIGNUP, { skill: rate.skillId }));

  return {
    loading: false,

    search,
    quickCategories: {
      items: data.categories.slice(0, 6),
      onPick: (c) => search.onChange(c.name),
    },
    stats: data.stats,

    onPostJob: () => postJob(),
    onExploreEarning: () => document.getElementById(EARN_SECTION_ID)?.scrollIntoView({ behavior: 'smooth' }),
    topMonthlyEarning: data.topMonthlyEarning,

    popular: {
      items: data.popular,
      onBook: (s) => postJob({ describe: s.name }),
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
      onSubmit: () => postJob(jobText.trim() ? { describe: jobText.trim() } : {}),
    },
  };
};
