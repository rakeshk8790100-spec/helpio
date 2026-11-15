import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { AuthSession, AuthUser, Favorites } from '@/common/CommonDto';
import type { OnboardingStatus } from '@/common/CommonEnum';
import { authStorage } from '@/config/base_service/auth.storage';

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  /** Set by an actual sign-in (not a page refresh): the favourites popup may show once. Never persisted. */
  favoritesPromptPending: boolean;
  /** The favourites popup opened from the profile or home, to edit the whole set */
  favoritesEditorOpen: boolean;
}

const stored = authStorage.load();
const initialState: AuthState = {
  token: stored?.token ?? null,
  // Sessions saved before favourites existed lack these fields
  user: stored?.user
    ? {
        ...stored.user,
        favoriteSkillIds: stored.user.favoriteSkillIds ?? [],
        favoritesPromptOpen: stored.user.favoritesPromptOpen ?? false,
        isOwner: stored.user.isOwner ?? false,
        approvalStatus: stored.user.approvalStatus ?? 'approved',
      }
    : null,
  favoritesPromptPending: false,
  favoritesEditorOpen: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    sessionStarted: (state, action: PayloadAction<AuthSession>) => {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.favoritesPromptPending = true;
    },
    /** Same person, new token (e.g. after a password change): not a sign-in, so no favourites popup */
    sessionRenewed: (state, action: PayloadAction<AuthSession>) => {
      state.token = action.payload.token;
      state.user = action.payload.user;
    },
    favoritesPromptDismissed: (state) => {
      state.favoritesPromptPending = false;
    },
    favoritesEditorOpened: (state) => {
      state.favoritesEditorOpen = true;
    },
    favoritesEditorClosed: (state) => {
      state.favoritesEditorOpen = false;
    },
    favoritesChanged: (state, action: PayloadAction<Favorites>) => {
      if (!state.user) return;
      state.user.favoriteSkillIds = action.payload.skillIds;
      state.user.favoritesPromptOpen = action.payload.promptOpen;
    },
    userUpdated: (state, action: PayloadAction<AuthUser>) => {
      state.user = action.payload;
    },
    onboardingStatusChanged: (state, action: PayloadAction<OnboardingStatus>) => {
      if (state.user) state.user.onboardingStatus = action.payload;
    },
    signedOut: (state) => {
      state.token = null;
      state.user = null;
      state.favoritesPromptPending = false;
      state.favoritesEditorOpen = false;
    },
  },
  selectors: {
    selectToken: (state) => state.token,
    selectCurrentUser: (state) => state.user,
    selectFavoritesPromptPending: (state) => state.favoritesPromptPending,
    selectFavoritesEditorOpen: (state) => state.favoritesEditorOpen,
  },
});

export const {
  sessionStarted,
  sessionRenewed,
  userUpdated,
  onboardingStatusChanged,
  signedOut,
  favoritesPromptDismissed,
  favoritesEditorOpened,
  favoritesEditorClosed,
  favoritesChanged,
} = authSlice.actions;
export const {
  selectToken,
  selectCurrentUser,
  selectFavoritesPromptPending,
  selectFavoritesEditorOpen,
} = authSlice.selectors;
export default authSlice;
