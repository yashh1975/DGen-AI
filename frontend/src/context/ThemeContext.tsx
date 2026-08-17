import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeId = 'cyber' | 'nebula' | 'emerald' | 'solar';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  subtitle: string;
  primaryColor: string;
  secondaryColor: string;
  previewBg: string;
  accentBadge: string;
}

export const THEMES: ThemeConfig[] = [
  {
    id: 'cyber',
    name: 'Cyber Synth',
    subtitle: 'Electric Cyan & Neon Emerald',
    primaryColor: '#06b6d4',
    secondaryColor: '#10b981',
    previewBg: 'from-cyan-500 via-blue-500 to-emerald-400',
    accentBadge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
  },
  {
    id: 'nebula',
    name: 'Cosmic Nebula',
    subtitle: 'Ultra Violet & Neon Fuchsia',
    primaryColor: '#a855f7',
    secondaryColor: '#ec4899',
    previewBg: 'from-purple-500 via-indigo-500 to-pink-500',
    accentBadge: 'bg-purple-500/10 text-purple-400 border-purple-500/30'
  },
  {
    id: 'emerald',
    name: 'Emerald Fintech',
    subtitle: 'Banking Green & Liquid Gold',
    primaryColor: '#10b981',
    secondaryColor: '#f59e0b',
    previewBg: 'from-emerald-500 via-teal-500 to-amber-400',
    accentBadge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
  },
  {
    id: 'solar',
    name: 'Solar Flare',
    subtitle: 'Crimson Rose & Sunset Amber',
    primaryColor: '#f43f5e',
    secondaryColor: '#f59e0b',
    previewBg: 'from-rose-500 via-orange-500 to-amber-400',
    accentBadge: 'bg-rose-500/10 text-rose-400 border-rose-500/30'
  }
];

interface ThemeContextType {
  theme: ThemeId;
  themeConfig: ThemeConfig;
  setTheme: (theme: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'cyber',
  themeConfig: THEMES[0],
  setTheme: () => {}
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    const saved = localStorage.getItem('dgen_theme') as ThemeId;
    return ['cyber', 'nebula', 'emerald', 'solar'].includes(saved) ? saved : 'cyber';
  });

  const setTheme = (newTheme: ThemeId) => {
    setThemeState(newTheme);
    localStorage.setItem('dgen_theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const themeConfig = THEMES.find((t) => t.id === theme) || THEMES[0];

  return (
    <ThemeContext.Provider value={{ theme, themeConfig, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
