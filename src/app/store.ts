import { configureStore, ThunkAction, Action } from '@reduxjs/toolkit';
import walletconnectReducer from '../features/walletconnect/walletconnectSlice';
export const store = configureStore({
  reducer: {
    walletconnect: walletconnectReducer
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({
    serializableCheck: false,
  }),
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;
