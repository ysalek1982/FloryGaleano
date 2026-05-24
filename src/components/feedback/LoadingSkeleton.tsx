import { useTranslation } from 'react-i18next'

export default function LoadingSkeleton() {
  const { t } = useTranslation()

  return (
    <div className="grid gap-4" data-testid="route-loading">
      <div className="h-24 animate-pulse rounded-lg bg-stone-200" />
      <div className="h-48 animate-pulse rounded-lg bg-stone-200" />
      <p className="text-sm text-slate-600">{t('common.loading')}</p>
    </div>
  )
}
