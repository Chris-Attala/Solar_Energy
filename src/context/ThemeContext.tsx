import { createContext, useContext, type ReactNode } from 'react';

export type ThemeContextValue = {
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextValue>({ isDark: true });

export function ThemeProvider({ isDark, children }: { isDark: boolean; children: ReactNode }) {
  return <ThemeContext.Provider value={{ isDark }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

/** Couleurs Plotly selon le thème */
export function plotThemeColors(isDark: boolean) {
  const base = {
    /** Virgule décimale + espace fine milliers (hover, axes Plotly) */
    separators: ',\u202f' as const,
  };
  if (isDark) {
    return {
      ...base,
      paper: '#0d1520',
      plot: '#0d1520',
      text: '#94a3b8',
      grid: '#1e293b',
    };
  }
  return {
    ...base,
    paper: '#f8fafc',
    plot: '#f8fafc',
    text: '#64748b',
    grid: '#e2e8f0',
  };
}
