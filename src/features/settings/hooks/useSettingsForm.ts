import { useTranslation } from 'react-i18next'

import { useAppData, useAuth } from '../../../lib/AppState'

export function useSettingsForm() {
  const { i18n } = useTranslation()
  const { data, updateSettings } = useAppData()
  const { profile, updateProfile } = useAuth()

  const updateLanguage = (language: 'en' | 'es') => {
    void i18n.changeLanguage(language)
    localStorage.setItem('smart-family-meals:language', language)
    if (profile) updateProfile({ ...profile, preferred_language: language })
  }

  return {
    data,
    settings: data.settings,
    profile,
    updateProfile,
    updateSettings,
    updateLanguage,
  }
}
