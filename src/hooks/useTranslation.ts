import { useLanguage } from '@/lib/i18n/LanguageContext';

export const useTranslation = () => {
  const { language, setLanguage, t } = useLanguage();
  
  return {
    language,
    setLanguage,
    t,
  };
};

export default useTranslation;
