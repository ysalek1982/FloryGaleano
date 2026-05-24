import { Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function PublicLanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { t, i18n } = useTranslation()
  const language = i18n.language.startsWith('es') ? 'es' : 'en'

  return (
    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
      <Languages className="h-4 w-4" aria-hidden="true" />
      {!compact && <span>{t('common.language')}</span>}
      <select
        value={language}
        onChange={(event) => {
          i18n.changeLanguage(event.target.value)
          localStorage.setItem('smart-family-meals:language', event.target.value)
        }}
        className="rounded-md border border-stone-300 bg-white px-2 py-1 focus-ring"
        aria-label={t('common.language')}
      >
        <option value="en">{t('common.english')}</option>
        <option value="es">{t('common.spanish')}</option>
      </select>
    </label>
  )
}
