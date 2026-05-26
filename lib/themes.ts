export type ThemeConfig = {
  name: string;
  primary: string;
  hover: string;
  bgSoft: string;
};

export const THEMES: Record<string, ThemeConfig> = {
  monochrome: { name: 'Monochrome', primary: '#FFFFFF', hover: '#E5E5E5', bgSoft: '#111111' },
};

export const DEFAULT_THEME_KEY = 'monochrome';

/**
 * Returns the full ThemeConfig based on Monochrome scheme.
 * The identifier is now ignored since we enforce a static theme.
 */
export function getThemeConfig(identifier?: string | null): ThemeConfig {
  return THEMES[DEFAULT_THEME_KEY];
}
