export type PreferenceKey = 'confirmDestructiveActions' | 'focusContrast';

export type ColorTheme =
  | 'default'
  | 'green'
  | 'blue'
  | 'violet'
  | 'orange'
  | 'rose';

export interface AppPreferences {
  confirmDestructiveActions: boolean;
  focusContrast: boolean;
  colorTheme: ColorTheme;
}

export const defaultPreferences: AppPreferences = {
  confirmDestructiveActions: true,
  focusContrast: false,
  colorTheme: 'default',
};
