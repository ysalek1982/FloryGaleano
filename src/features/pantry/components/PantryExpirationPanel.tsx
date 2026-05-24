import { useTranslation } from 'react-i18next'

import { Badge, Card, EmptyState, SimpleList } from '../../shared/chefUi'
import type { usePantryState } from '../hooks/usePantryState'
import { safeDate } from '../../../lib/utils'

type PantryState = ReturnType<typeof usePantryState>

export function PantryExpirationPanel({ pantry }: { pantry: PantryState }) {
  const { t } = useTranslation()
  const items = pantry.expiringRows.map((item) => {
    const ingredient = pantry.data.ingredients.find((candidate) => candidate.id === item.ingredient_id)
    return `${ingredient?.name || '-'} - ${safeDate(item.expiration_date) || '-'}`
  })

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-serif text-2xl font-semibold">{t('pantry.expirationPanel')}</h2>
        <Badge status={items.length ? 'warning' : 'safe'}>{items.length}</Badge>
      </div>
      <div className="mt-4">
        {items.length ? <SimpleList items={items} /> : <EmptyState text={t('pantry.noExpiring')} />}
      </div>
    </Card>
  )
}
