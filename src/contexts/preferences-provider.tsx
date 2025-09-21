import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';

import { PreferencesContext } from './preferences-context';

import type { ColorTheme } from '@/types/preferences';
import { defaultPreferences } from '@/types/preferences';

const COLOR_THEMES: ColorTheme[] = [
  'default',
  'green',
  'blue',
  'violet',
  'orange',
  'rose',
];

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(defaultPreferences);

  useEffect(() => {
    const storedPreferences = localStorage.getItem('appPreferences');
    if (!storedPreferences) return;

    const parsed = JSON.parse(storedPreferences);
    setPreferences((current) => ({ ...current, ...parsed }));
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle(
      'focus-contrast',
      preferences.focusContrast,
    );
  }, [preferences.focusContrast]);

  useEffect(() => {
    COLOR_THEMES.forEach((t) => {
      document.documentElement.classList.remove(`theme-${t}`);
    });
    if (preferences.colorTheme !== 'default') {
      document.documentElement.classList.add(`theme-${preferences.colorTheme}`);
    }
  }, [preferences.colorTheme]);

  const value = useMemo(
    () => ({
      preferences,
      updatePreference: (
        key: 'confirmDestructiveActions' | 'focusContrast',
      ) => {
        setPreferences((current) => {
          const next = { ...current, [key]: !current[key] };
          localStorage.setItem('appPreferences', JSON.stringify(next));
          return next;
        });
      },
      setColorTheme: (theme: ColorTheme) => {
        setPreferences((current) => {
          const next = { ...current, colorTheme: theme };
          localStorage.setItem('appPreferences', JSON.stringify(next));
          return next;
        });
      },
      resetPreferences: () => {
        localStorage.setItem(
          'appPreferences',
          JSON.stringify(defaultPreferences),
        );
        setPreferences(defaultPreferences);
      },
    }),
    [preferences],
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}
