import { useTranslation } from 'react-i18next'

export function useTranslationKeys() {
  const { t, i18n } = useTranslation()
  return {
    t,
    language: i18n.language.startsWith('es') ? 'es' : 'en',
  }
}
