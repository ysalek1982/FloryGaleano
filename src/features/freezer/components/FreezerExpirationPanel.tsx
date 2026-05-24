import { useTranslation } from 'react-i18next'

import { Badge, Card, EmptyState, SimpleList } from '../../shared/chefUi'
import type { useFreezerState } from '../hooks/useFreezerState'
import { safeDate } from '../../../lib/utils'

type FreezerState = ReturnType<typeof useFreezerState>

export function FreezerExpirationPanel({ freezer }: { freezer: FreezerState }) {
  const { t } = useTranslation()
  const items = freezer.expiringRows.map((item) => {
    const recipe = freezer.data.recipes.find((candidate) => candidate.id === item.recipe_id)
    return `${recipe?.name || '-'} - ${safeDate(item.expiration_date) || '-'}`
  })

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-serif text-2xl font-semibold">{t('freezer.expirationPanel')}</h2>
        <Badge status={items.length ? 'warning' : 'safe'}>{items.length}</Badge>
      </div>
      <div className="mt-4">
        {items.length ? <SimpleList items={items} /> : <EmptyState text={t('freezer.noExpiring')} />}
      </div>
    </Card>
  )
}
