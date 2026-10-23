import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MAX_SKILLS, MIN_SKILLS } from '../client/default/onboarding/onboarding.layout.types';
import type { SkillsLayoutProps } from '../client/default/onboarding/onboarding.layout.types';
import type { ProviderSkill } from '../common/CommonDto';
import { Proficiency } from '../common/CommonEnum';
import { RouterKeys } from '../config/router/RouterKeys';
import { apiErrorMessage } from '../lib/apiError';
import { useGetOnboardingQuery, useGetSkillCatalogQuery, useSaveSkillsMutation } from '../pages/onboarding/onboarding.api';

/** /onboarding/skills?category= behaviour: pick 3–15 skills with a level, then continue to step 3. */
export const useOnboardingSkills = (): SkillsLayoutProps => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const catalog = useGetSkillCatalogQuery();
  const onboarding = useGetOnboardingQuery();
  const [saveSkills, { isLoading: saving }] = useSaveSkillsMutation();
  // null until the provider changes something, so saved skills show when they come back
  const [draft, setDraft] = useState<ProviderSkill[] | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [error, setError] = useState<string>();

  if (catalog.isLoading || onboarding.isLoading) return { loading: true };

  const categories = catalog.data ?? [];
  const selected = draft ?? onboarding.data?.skills ?? [];
  const update = (skillId: string, change: Partial<ProviderSkill>) =>
    setDraft(selected.map((s) => (s.skillId === skillId ? { ...s, ...change } : s)));

  return {
    loading: false,
    loadError: catalog.isError || onboarding.isError || categories.length === 0,
    onRetry: () => {
      void catalog.refetch();
      void onboarding.refetch();
    },
    picker: {
      categories,
      activeCategoryId: categoryId ?? params.get('category') ?? categories[0]?.id ?? '',
      onCategoryChange: setCategoryId,
      selected,
      onToggle: (skillId) =>
        setDraft(
          selected.some((s) => s.skillId === skillId)
            ? selected.filter((s) => s.skillId !== skillId)
            : [...selected, { skillId, proficiency: Proficiency.INTERMEDIATE, yearsExperience: null }].slice(0, MAX_SKILLS),
        ),
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
        navigate(RouterKeys.ONBOARDING_AREA);
      } catch (e) {
        setError(apiErrorMessage(e));
      }
    },
  };
};
