import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Fallback to memory state if not available, or standard AsyncStorage
import { getActiveColors, ColorTheme } from '../theme';

type ThemeContextType = {
  isDark: boolean;
  toggleDarkMode: () => void;
  colorTheme: ColorTheme;
  setColorTheme: (theme: ColorTheme) => void;
  colors: any;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  
  const [isDark, setIsDark] = useState(false);
  const [colorTheme, setColorTheme] = useState<ColorTheme>('blue');

  // Load settings on mount
  useEffect(() => {
    async function loadThemeSettings() {
      try {
        const savedTheme = await AsyncStorage.getItem('theme');
        if (savedTheme) {
          setIsDark(savedTheme === 'dark');
        } else {
          setIsDark(systemColorScheme === 'dark');
        }

        const savedColorTheme = await AsyncStorage.getItem('colorTheme');
        if (savedColorTheme) {
          setColorTheme(savedColorTheme as ColorTheme);
        }
      } catch (e) {
        // Fallback if AsyncStorage is not configured/imported correctly
        setIsDark(systemColorScheme === 'dark');
      }
    }
    loadThemeSettings();
  }, [systemColorScheme]);

  const toggleDarkMode = async () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    try {
      await AsyncStorage.setItem('theme', nextDark ? 'dark' : 'light');
    } catch (e) {}
  };

  const handleSetColorTheme = async (theme: ColorTheme) => {
    setColorTheme(theme);
    try {
      await AsyncStorage.setItem('colorTheme', theme);
    } catch (e) {}
  };

  const colors = getActiveColors(isDark, colorTheme);

  return (
    <ThemeContext.Provider
      value={{
        isDark,
        toggleDarkMode,
        colorTheme,
        setColorTheme: handleSetColorTheme,
        colors,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
