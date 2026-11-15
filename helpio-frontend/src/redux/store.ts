import { configureStore, createListenerMiddleware } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { authStorage } from '@/config/base_service/auth.storage';
import { baseApi } from '@/config/base_service/base.api';
import authSlice, { signedOut } from './authSlice';

// When a session ends (logout or a rejected token), drop all cached API data so the next user starts clean.
const sessionListener = createListenerMiddleware();
sessionListener.startListening({
  actionCreator: signedOut,
  effect: (_, { dispatch }) => {
    dispatch(baseApi.util.resetApiState());
  },
});

export const store = configureStore({
  reducer: {
    [authSlice.reducerPath]: authSlice.reducer,
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(sessionListener.middleware).concat(baseApi.middleware),
});

// Enable listener behavior for refetchOnFocus and refetchOnReconnect
setupListeners(store.dispatch);

// Persist the session whenever it changes (reducers stay pure)
let lastAuth = store.getState().auth;
store.subscribe(() => {
  const { auth } = store.getState();
  if (auth === lastAuth) return;
  lastAuth = auth;
  if (auth.token && auth.user) {
    authStorage.save({ token: auth.token, user: auth.user });
  } else {
    authStorage.clear();
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
