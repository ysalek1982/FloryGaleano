import { useTranslation } from 'react-i18next'

import { Badge, Card, EmptyState } from '../../shared/chefUi'
import type { useNutritionView } from '../hooks/useNutritionView'

type NutritionView = ReturnType<typeof useNutritionView>

export function NutritionWarningsPanel({ nutrition }: { nutrition: NutritionView }) {
  const { t } = useTranslation()
  return (
    <Card>
      <h2 className="font-serif text-2xl font-semibold">{t('nutrition.warnings')}</h2>
      <div className="mt-4 grid gap-3">
        {nutrition.warningRows.length === 0 ? (
          <EmptyState text={t('nutrition.noWarnings')} />
        ) : (
          nutrition.warningRows.map((row) => (
            <div key={row.diner.id} className="rounded-md border border-stone-200 bg-white p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-slate-900">{row.diner.full_name}</span>
                <Badge status="warning">{t('common.warning')}</Badge>
              </div>
              <p className="mt-1 text-sm text-slate-600">{t('nutrition.warningBody')}</p>
            </div>
          ))
        )}
      </div>
    </Card>
  )
}
