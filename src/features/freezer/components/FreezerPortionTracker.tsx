import { useTranslation } from 'react-i18next'

import { Badge, Card, EmptyState, SimpleList } from '../../shared/chefUi'
import type { useFreezerState } from '../hooks/useFreezerState'

type FreezerState = ReturnType<typeof useFreezerState>

export function FreezerPortionTracker({ freezer }: { freezer: FreezerState }) {
  const { t } = useTranslation()
  const lowRows = freezer.lowPortionRows.map((item) => {
    const recipe = freezer.data.recipes.find((candidate) => candidate.id === item.recipe_id)
    return `${recipe?.name || '-'} - ${item.portions_available} ${t('freezer.portionsAvailable').toLowerCase()}`
  })

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-serif text-2xl font-semibold">{t('freezer.portionTracker')}</h2>
        <Badge status={lowRows.length ? 'warning' : 'safe'}>{lowRows.length}</Badge>
      </div>
      <div className="mt-4">
        {lowRows.length ? <SimpleList items={lowRows} /> : <EmptyState text={t('freezer.noLowPortions')} />}
      </div>
    </Card>
  )
}
