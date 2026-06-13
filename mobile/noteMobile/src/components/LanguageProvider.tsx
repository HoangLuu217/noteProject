import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations } from '../utils/translations';

export type LanguageType = 'en' | 'vi';

type LanguageContextType = {
  language: LanguageType;
  setLanguage: (lang: LanguageType) => void;
  t: (key: string, variables?: Record<string, string>) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LanguageType>('en');

  // Load language settings on mount
  useEffect(() => {
    async function loadLanguageSettings() {
      try {
        const savedLanguage = await AsyncStorage.getItem('language');
        if (savedLanguage === 'en' || savedLanguage === 'vi') {
          setLanguageState(savedLanguage);
        }
      } catch (e) {
        console.error('Failed to load language settings:', e);
      }
    }
    loadLanguageSettings();
  }, []);

  const setLanguage = async (lang: LanguageType) => {
    setLanguageState(lang);
    try {
      await AsyncStorage.setItem('language', lang);
    } catch (e) {
      console.error('Failed to save language settings:', e);
    }
  };

  const t = (key: string, variables?: Record<string, string>) => {
    const translation = translations[language]?.[key] || translations['en']?.[key] || key;
    if (variables) {
      let result = translation;
      Object.keys(variables).forEach((varKey) => {
        result = result.replace(`{${varKey}}`, variables[varKey]);
      });
      return result;
    }
    return translation;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
