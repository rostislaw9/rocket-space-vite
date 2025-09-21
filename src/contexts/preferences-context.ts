import { createContext } from 'react';

import type {
  AppPreferences,
  ColorTheme,
  PreferenceKey,
} from '@/types/preferences';

interface PreferencesContextType {
  preferences: AppPreferences;
  updatePreference: (key: PreferenceKey) => void;
  setColorTheme: (theme: ColorTheme) => void;
  resetPreferences: () => void;
}

export const PreferencesContext = createContext<
  PreferencesContextType | undefined
>(undefined);
