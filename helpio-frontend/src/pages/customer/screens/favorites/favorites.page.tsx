import { App } from 'antd';
import { useState } from 'react';
import { FavoritesLayout } from '@/clients';
import { useGetSkillCatalogQuery } from '@/common/CommonApi';
import type { AuthUser, SkillCategory } from '@/common/CommonDto';
import SuspenseWrapper from '@/components/wrapper/SuspenseWrapper';
import { apiErrorMessage } from '@/lib/apiError';
import {
  useAddFavoritesMutation,
  useReplaceFavoritesMutation,
  useSkipFavoritesMutation,
} from './favorites.api';
import type { FavoriteChoice, FavoritesModalLayoutProps } from './types/favorites.dto';
import { MAX_FAVORITES } from './types/favorites.enum';

const NAME_PREFIX = 'name:';

/** Same rule as the API: "Solar Panel  cleaning!" and "solar panel cleaning" are one service */
const nameKey = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const tidy = (name: string) => name.trim().replace(/\s+/g, ' ');

const SUGGESTIONS = 12;

/** Tap-to-add picks: each category's 1st service, then each one's 2nd…, so the first few cover many trades */
const suggest = (catalog: SkillCategory[], chosen: Set<string>) => {
  const queues = catalog.map((category) => category.skills.filter((skill) => !chosen.has(skill.id)));
  const out: { value: string; label: string }[] = [];
  for (let round = 0; out.length < SUGGESTIONS && queues.some((q) => q.length > round); round++) {
    for (const queue of queues) {
      const skill = queue[round];
      if (skill && out.length < SUGGESTIONS) out.push({ value: skill.id, label: skill.name });
    }
  }
  return out;
};

/**
 * The favourites popup. `add` (after sign-in): saved ones are locked, pick the rest until there are 8; skipping
 * closes it until the next visit. `edit` (profile or home): the whole set, up to 8. Services missing from the
 * catalog can be typed in; they count as favourites and wait for an admin to add them.
 */
const useFavoritesPrompt = (user: AuthUser, mode: 'add' | 'edit', onDone: () => void): FavoritesModalLayoutProps => {
  const { message } = App.useApp();
  const catalog = useGetSkillCatalogQuery();
  const [addFavorites, { isLoading: adding }] = useAddFavoritesMutation();
  const [replaceFavorites, { isLoading: replacing }] = useReplaceFavoritesMutation();
  const [skipFavorites, { isLoading: skipping }] = useSkipFavoritesMutation();
  const saved = user.favoriteSkillIds;
  const savedRequests = user.favoriteRequests;
  // Add: only the new picks; edit: the whole set, starting from what's saved
  const [picked, setPicked] = useState<string[]>(mode === 'edit' ? saved : []);
  const [customNames, setCustomNames] = useState<string[]>(mode === 'edit' ? savedRequests.map((r) => r.name) : []);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string>();

  const lockedCount = mode === 'add' ? saved.length + savedRequests.length : 0;
  const total = lockedCount + picked.length + customNames.length;
  const full = total >= MAX_FAVORITES;

  const skillNames = new Map(catalog.data?.flatMap((c) => c.skills.map((s) => [s.id, s.name] as const)) ?? []);
  const skillByKey = new Map(catalog.data?.flatMap((c) => c.skills.map((s) => [nameKey(s.name), s.id] as const)) ?? []);
  const chosenSkills = new Set(mode === 'add' ? [...saved, ...picked] : picked);
  const chosenNameKeys = new Set(
    [...(mode === 'add' ? savedRequests.map((r) => r.name) : []), ...customNames].map(nameKey),
  );

  const close = async () => {
    if (mode === 'add') {
      try {
        await skipFavorites().unwrap();
      } catch {
        // Skip is only bookkeeping; the popup closes either way
      }
    }
    onDone();
  };

  const chosen: FavoriteChoice[] = [
    ...(mode === 'add'
      ? [
          ...saved.map((id) => ({ key: id, label: skillNames.get(id) ?? 'Service', requested: false, locked: true })),
          ...savedRequests.map((r) => ({ key: NAME_PREFIX + r.name, label: r.name, requested: true, locked: true })),
        ]
      : []),
    ...picked.map((id) => ({ key: id, label: skillNames.get(id) ?? 'Service', requested: false, locked: false })),
    ...customNames.map((name) => ({ key: NAME_PREFIX + name, label: name, requested: true, locked: false })),
  ];

  const common = {
    mode,
    progress: {
      picked: Math.min(total, MAX_FAVORITES),
      total: MAX_FAVORITES,
      hint: full
        ? 'All set'
        : mode === 'add' && picked.length + customNames.length > 0
          ? `Save now, add ${MAX_FAVORITES - total} more later`
          : `${MAX_FAVORITES - total} more to go`,
    },
    saving: adding || replacing,
    skipping,
    error,
    full,
    chosen,
    // Save any time there's something new; the popup comes back until there are 8. Edit mode may save fewer.
    canSave: mode === 'edit' || picked.length + customNames.length > 0,
    onRemove: (key: string) => {
      setError(undefined);
      if (key.startsWith(NAME_PREFIX)) setCustomNames((prev) => prev.filter((n) => NAME_PREFIX + n !== key));
      else setPicked((prev) => prev.filter((id) => id !== key));
    },
    onSave: async () => {
      try {
        const choice = { skillIds: picked, serviceNames: customNames };
        if (mode === 'add') await addFavorites(choice).unwrap();
        else await replaceFavorites(choice).unwrap();
        message.success(
          customNames.length
            ? "Saved. We'll add the services you typed once our team has checked them."
            : mode === 'add' && total < MAX_FAVORITES
              ? `Saved ${total} of ${MAX_FAVORITES}. We'll ask for the rest next time.`
              : mode === 'add'
                ? 'Saved. Your home now shows pros for these.'
                : 'Favourite services updated.',
        );
        onDone();
      } catch (e) {
        setError(apiErrorMessage(e));
      }
    },
    onClose: () => void close(),
  };

  if (catalog.isLoading) return { ...common, status: 'loading' };
  if (!catalog.data) return { ...common, status: 'error', message: apiErrorMessage(catalog.error), onRetry: catalog.refetch };

  const query = tidy(search);
  const words = query.toLowerCase().split(' ').filter(Boolean);
  const matches = (text: string) => words.every((word) => text.toLowerCase().includes(word));
  const typedKey = nameKey(query);

  return {
    ...common,
    status: 'ready',
    search,
    onSearch: setSearch,
    options: catalog.data
      .map((category) => ({
        label: category.name,
        options: category.skills
          .filter((skill) => !chosenSkills.has(skill.id) && (matches(skill.name) || matches(category.name)))
          .map((skill) => ({ value: skill.id, label: skill.name })),
      }))
      .filter((group) => group.options.length > 0),
    suggestions: suggest(catalog.data, chosenSkills),
    onPick: (skillId) => {
      setError(undefined);
      setSearch('');
      setPicked((prev) => (prev.includes(skillId) || full ? prev : [...prev, skillId]));
    },
    // Offered only for a real name the catalog doesn't have and that isn't chosen already
    addOption:
      query.length >= 2 && typedKey && !skillByKey.has(typedKey) && !chosenNameKeys.has(typedKey) && !full
        ? query.slice(0, 60)
        : undefined,
    onAddCustom: (name) => {
      setError(undefined);
      setSearch('');
      setCustomNames((prev) => (full ? prev : [...prev, tidy(name)]));
    },
  };
};

interface Props {
  user: AuthUser;
  mode: 'add' | 'edit';
  onDone: () => void;
}

/** Favourite services popup. Mounted only while open, so picks start fresh each time. */
const FavoritesPage = ({ user, mode, onDone }: Props) => (
  <SuspenseWrapper fallback={null}>
    <FavoritesLayout {...useFavoritesPrompt(user, mode, onDone)} />
  </SuspenseWrapper>
);

export default FavoritesPage;
