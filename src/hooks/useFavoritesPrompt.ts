import { useState } from 'react';
import { App } from 'antd';
import type { FavoritesModalLayoutProps } from '../client/default/customer/favoritesModal.layout.types';
import type { AuthUser } from '../common/CommonDto';
import { useGetSkillCatalogQuery } from '../common/CommonApi';
import { apiErrorMessage } from '../lib/apiError';
import {
  useAddFavoritesMutation,
  useReplaceFavoritesMutation,
  useSkipFavoritesMutation,
} from '../pages/customer/favorites.api';

/** Favourites in all, and new picks per popup (the API enforces both too) */
export const MAX_FAVORITES = 8;
const MAX_PER_PROMPT = 4;

/**
 * The favourites popup. `add` (after sign-in): saved ones are locked, up to 4 new picks; skipping counts toward
 * the 3 that stop it. `edit` (profile or home): the whole set, up to 8.
 */
export const useFavoritesPrompt = (user: AuthUser, mode: 'add' | 'edit', onDone: () => void): FavoritesModalLayoutProps => {
  const { message } = App.useApp();
  const catalog = useGetSkillCatalogQuery();
  const [addFavorites, { isLoading: adding }] = useAddFavoritesMutation();
  const [replaceFavorites, { isLoading: replacing }] = useReplaceFavoritesMutation();
  const [skipFavorites, { isLoading: skipping }] = useSkipFavoritesMutation();
  const saved = user.favoriteSkillIds;
  // Add: only the new picks; edit: the whole set, starting from what's saved
  const [picked, setPicked] = useState<string[]>(mode === 'edit' ? saved : []);
  const [error, setError] = useState<string>();

  const limit = mode === 'add' ? Math.min(MAX_PER_PROMPT, MAX_FAVORITES - saved.length) : MAX_FAVORITES;
  const full = picked.length >= limit;

  const close = async () => {
    if (mode === 'add') {
      try {
        await skipFavorites().unwrap();
      } catch {
        // A failed skip just means the popup may show once more
      }
    }
    onDone();
  };

  const common = {
    mode,
    counter: mode === 'add' ? `${picked.length}/${limit} selected` : `${picked.length}/${MAX_FAVORITES} favourites`,
    saving: adding || replacing,
    skipping,
    error,
    // Edit mode may clear everything; the popup needs at least one new pick
    canSave: mode === 'edit' || picked.length > 0,
    onToggle: (skillId: string) => {
      setError(undefined);
      setPicked((prev) =>
        prev.includes(skillId) ? prev.filter((id) => id !== skillId) : prev.length < limit ? [...prev, skillId] : prev,
      );
    },
    onSave: async () => {
      try {
        if (mode === 'add') await addFavorites(picked).unwrap();
        else await replaceFavorites(picked).unwrap();
        message.success(mode === 'add' ? 'Saved. Your home now shows pros for these.' : 'Favourite services updated.');
        onDone();
      } catch (e) {
        setError(apiErrorMessage(e));
      }
    },
    onClose: () => void close(),
  };

  if (catalog.isLoading) return { ...common, status: 'loading' };
  if (!catalog.data) return { ...common, status: 'error', message: apiErrorMessage(catalog.error), onRetry: catalog.refetch };

  return {
    ...common,
    status: 'ready',
    sections: catalog.data
      .filter((category) => category.skills.length > 0)
      .map((category) => ({
        id: category.id,
        name: category.name,
        choices: category.skills.map((skill) => {
          const locked = mode === 'add' && saved.includes(skill.id);
          const selected = locked || picked.includes(skill.id);
          return { id: skill.id, label: skill.name, selected, locked, disabled: !selected && full };
        }),
      })),
  };
};
