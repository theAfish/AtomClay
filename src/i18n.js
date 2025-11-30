import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import es from './locales/es.json';
import zh from './locales/zh.json';

// the translations
const resources = {
  en: {
    translation: en
  },
  es: {
    translation: es
  },
  zh: {
    translation: zh
  }
};

i18n
  // pass the i18n instance to react-i18next.
  .use(initReactI18next)
  // init i18next
  .init({
    resources,
    lng: 'zh', // default language
    interpolation: {
      escapeValue: false // react already does escaping
    }
  });

export default i18n;