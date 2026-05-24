import { useTranslation } from 'react-i18next'

import { Badge, Button, EmptyState, ResponsiveTable } from '../../shared/chefUi'
import type { useFreezerState } from '../hooks/useFreezerState'
import { formatNumber, safeDate } from '../../../lib/utils'

type FreezerState = ReturnType<typeof useFreezerState>

export function FreezerTable({
  freezer,
  canWrite,
  onEdit,
  onUse,
  onAddToMenu,
}: {
  freezer: FreezerState
  canWrite: boolean
  onEdit: (itemId: string) => void
  onUse: (itemId: string, portions: number) => void
  onAddToMenu: (itemId: string) => void
}) {
  const { t } = useTranslation()
  if (freezer.rows.length === 0) return <EmptyState text={t('empty.recipes')} />

  return (
    <ResponsiveTable
      headers={[
        t('common.recipe'),
        t('freezer.preparedDate'),
        t('freezer.expirationDate'),
        t('freezer.portionsAvailable'),
        t('freezer.gramsPerPortion'),
        t('common.status'),
        t('common.actions'),
      ]}
      rows={freezer.rows.map((row) => [
        row.recipe?.name || '-',
        safeDate(row.item.prepared_date) || '-',
        safeDate(row.item.expiration_date) || '-',
        formatNumber(row.item.portions_available),
        `${formatNumber(row.item.grams_per_portion ?? 0)}g`,
        <Badge key="status" status={row.expiringSoon || row.lowPortions ? 'warning' : 'safe'}>
          {row.expiringSoon ? t('freezer.expiringSoon') : row.lowPortions ? t('freezer.lowPortions') : t('common.safe')}
        </Badge>,
        canWrite ? (
          <div key="actions" className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => onUse(row.item.id, Math.max(0, row.item.portions_available - 1))}>{t('freezer.subtractPortion')}</Button>
            <Button variant="secondary" onClick={() => onAddToMenu(row.item.id)}>{t('freezer.addToMenu')}</Button>
            <Button variant="ghost" onClick={() => onEdit(row.item.id)}>{t('common.edit')}</Button>
          </div>
        ) : (
          '-'
        ),
      ])}
    />
  )
}
