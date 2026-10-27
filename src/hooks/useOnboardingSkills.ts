import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { App } from 'antd';
import { MAX_SKILLS, MIN_SKILLS } from '../client/default/onboarding/onboarding.layout.types';
import type { SkillsLayoutProps } from '../client/default/onboarding/onboarding.layout.types';
import type { ProviderSkill } from '../common/CommonDto';
import { Proficiency } from '../common/CommonEnum';
import { RouterKeys } from '../config/router/RouterKeys';
import { apiErrorMessage } from '../lib/apiError';
import { useGetSkillCatalogQuery } from '../common/CommonApi';
import { useGetOnboardingQuery, useSaveSkillsMutation } from '../pages/onboarding/onboarding.api';

/**
 * /onboarding/skills?category= behaviour: search or browse, pick 4–20 skills with a level, then continue to step 3.
 * With `editing` (/profile/skills) the same screen saves and returns to Profile.
 */
export const useOnboardingSkills = ({ editing = false }: { editing?: boolean } = {}): SkillsLayoutProps => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [params] = useSearchParams();
  const catalog = useGetSkillCatalogQuery();
  const onboarding = useGetOnboardingQuery();
  const [saveSkills, { isLoading: saving }] = useSaveSkillsMutation();
  // null until the provider changes something, so saved skills show when they come back
  const [draft, setDraft] = useState<ProviderSkill[] | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string>();

  if (catalog.isLoading || onboarding.isLoading) return { loading: true };

  const categories = catalog.data ?? [];
  const selected = draft ?? onboarding.data?.skills ?? [];
  const update = (skillId: string, change: Partial<ProviderSkill>) =>
    setDraft(selected.map((s) => (s.skillId === skillId ? { ...s, ...change } : s)));
  const added = (skillId: string): ProviderSkill => ({ skillId, proficiency: Proficiency.INTERMEDIATE, yearsExperience: null });

  return {
    loading: false,
    editing,
    loadError: catalog.isError || onboarding.isError || categories.length === 0,
    onRetry: () => {
      void catalog.refetch();
      void onboarding.refetch();
    },
    picker: {
      categories,
      activeCategoryId: categoryId ?? params.get('category') ?? categories[0]?.id ?? '',
      onCategoryChange: setCategoryId,
      query,
      onQueryChange: setQuery,
      selected,
      onToggle: (skillId) =>
        setDraft(
          selected.some((s) => s.skillId === skillId)
            ? selected.filter((s) => s.skillId !== skillId)
            : [...selected, added(skillId)].slice(0, MAX_SKILLS),
        ),
      onToggleCategory: (id) => {
        const ids = categories.find((c) => c.id === id)?.skills.map((s) => s.id) ?? [];
        const picked = new Set(selected.map((s) => s.skillId));
        setDraft(
          ids.every((skillId) => picked.has(skillId))
            ? selected.filter((s) => !ids.includes(s.skillId))
            : [...selected, ...ids.filter((skillId) => !picked.has(skillId)).map(added)].slice(0, MAX_SKILLS),
        );
      },
      onProficiencyChange: (skillId, proficiency) => update(skillId, { proficiency }),
      onYearsChange: (skillId, yearsExperience) => update(skillId, { yearsExperience }),
    },
    selectedCount: selected.length,
    saving,
    error,
    onContinue: async () => {
      if (selected.length < MIN_SKILLS) return;
      setError(undefined);
      try {
        await saveSkills(selected).unwrap();
        if (editing) {
          message.success('Skills saved. Jobs near you now match them.');
          navigate(RouterKeys.PROFILE);
        } else {
          navigate(RouterKeys.ONBOARDING_AREA);
        }
      } catch (e) {
        setError(apiErrorMessage(e));
      }
    },
  };
};
