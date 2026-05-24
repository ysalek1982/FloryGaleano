import { useTranslation } from 'react-i18next'

import { Badge, Button, EmptyState, ResponsiveTable } from '../../shared/chefUi'
import type { usePantryState } from '../hooks/usePantryState'
import { formatPantryQuantity } from '../utils/pantryFormatters'
import { safeDate } from '../../../lib/utils'

type PantryState = ReturnType<typeof usePantryState>

export function PantryTable({
  pantry,
  canWrite,
  onEdit,
}: {
  pantry: PantryState
  canWrite: boolean
  onEdit: (itemId: string) => void
}) {
  const { t } = useTranslation()
  if (pantry.rows.length === 0) return <EmptyState text={t('empty.ingredients')} />

  return (
    <ResponsiveTable
      headers={[
        t('common.ingredient'),
        t('common.category'),
        t('common.available'),
        t('pantry.minimumAlert'),
        t('pantry.expirationDate'),
        t('pantry.location'),
        t('common.status'),
        t('common.actions'),
      ]}
      rows={pantry.rows.map((row) => [
        row.ingredient?.name || '-',
        row.ingredient?.category || '-',
        formatPantryQuantity(row.item.quantity_available, row.item.unit),
        formatPantryQuantity(row.item.min_quantity_alert, row.item.unit),
        safeDate(row.item.expiration_date) || '-',
        row.item.location || '-',
        <Badge key="status" status={row.lowStock || row.expiringSoon ? 'warning' : 'safe'}>
          {row.lowStock ? t('pantry.lowStock') : row.expiringSoon ? t('pantry.expiringSoon') : t('common.safe')}
        </Badge>,
        canWrite ? (
          <Button key="edit" variant="secondary" onClick={() => onEdit(row.item.id)}>{t('common.edit')}</Button>
        ) : (
          '-'
        ),
      ])}
    />
  )
}
