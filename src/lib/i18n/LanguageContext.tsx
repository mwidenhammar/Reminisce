import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SupportedLanguage, translations } from './translations';

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (category: string, key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = 'appLanguage';

// Get browser language or fallback to English
const getBrowserLanguage = (): SupportedLanguage => {
  if (typeof navigator === 'undefined') return 'en';
  
  const browserLang = navigator.language.split('-')[0] as SupportedLanguage;
  const supportedLanguages: SupportedLanguage[] = ['en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko', 'sv'];
  
  return supportedLanguages.includes(browserLang) ? browserLang : 'en';
};

// Get initial language from localStorage or browser
const getInitialLanguage = (): SupportedLanguage => {
  if (typeof localStorage === 'undefined') return 'en';
  
  const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (saved && ['en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko', 'sv'].includes(saved)) {
    return saved as SupportedLanguage;
  }
  
  return getBrowserLanguage();
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(getInitialLanguage);

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  };

  // Translation function
  const t = (category: string, key: string): string => {
    const langTranslations = translations[language];
    if (!langTranslations) return key;
    
    const categoryTranslations = langTranslations[category];
    if (!categoryTranslations) return key;
    
    return categoryTranslations[key] || translations['en']?.[category]?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;
