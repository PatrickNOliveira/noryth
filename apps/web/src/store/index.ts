import { combineReducers, configureStore } from '@reduxjs/toolkit';
import {
  FLUSH,
  PAUSE,
  PERSIST,
  persistReducer,
  persistStore,
  PURGE,
  REGISTER,
  REHYDRATE,
} from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import authReducer from './slices/auth.slice';
import themeReducer from './slices/theme.slice';
import uiReducer from './slices/ui.slice';
import languageReducer from './slices/language.slice';
import campaignsReducer from './slices/campaigns.slice';
import campaignAttributesReducer from './slices/campaignAttributes.slice';
import participantsReducer from './slices/participants.slice';
import factionsReducer from './slices/factions.slice';
import charactersReducer from './slices/characters.slice';
import mapsReducer from './slices/maps.slice';
import itemsReducer from './slices/items.slice';

const rootReducer = combineReducers({
  auth: authReducer,
  theme: themeReducer,
  ui: uiReducer,
  language: languageReducer,
  campaigns: campaignsReducer,
  campaignAttributes: campaignAttributesReducer,
  participants: participantsReducer,
  factions: factionsReducer,
  characters: charactersReducer,
  maps: mapsReducer,
  items: itemsReducer,
});

/**
 * `auth`, `theme` and `language` are persisted so the session, appearance and
 * chosen language survive reloads. `ui` is transient session state and
 * intentionally left out so spinners/toasts never survive a reload.
 */
const persistConfig = {
  key: 'noryth',
  version: 1,
  storage,
  whitelist: ['auth', 'theme', 'language'],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
