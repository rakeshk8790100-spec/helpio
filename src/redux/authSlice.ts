import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { AuthSession, AuthUser } from '../common/CommonDto';
import type { OnboardingStatus } from '../common/CommonEnum';
import { authStorage } from '../config/base_service/auth.storage';

interface AuthState {
  token: string | null;
  user: AuthUser | null;
}

const stored = authStorage.load();
const initialState: AuthState = { token: stored?.token ?? null, user: stored?.user ?? null };

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    sessionStarted: (state, action: PayloadAction<AuthSession>) => {
      state.token = action.payload.token;
      state.user = action.payload.user;
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
    },
  },
  selectors: {
    selectToken: (state) => state.token,
    selectCurrentUser: (state) => state.user,
  },
});

export const { sessionStarted, userUpdated, onboardingStatusChanged, signedOut } = authSlice.actions;
export const { selectToken, selectCurrentUser } = authSlice.selectors;
export default authSlice;
