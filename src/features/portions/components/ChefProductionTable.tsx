import { useTranslation } from 'react-i18next'

import { TableCard } from '../../shared/chefUi'
import { formatNumber } from '../../../lib/utils'
import type { calculateProductionRows } from '../../../services/portionEngine'

export default function ChefProductionTable({ rows }: { rows: ReturnType<typeof calculateProductionRows> }) {
  const { t } = useTranslation()
  return (
    <TableCard
      title={t('portion.productionQuantities')}
      headers={[t('common.ingredient'), t('common.required'), t('common.available'), t('common.missing'), t('common.unit'), t('portion.usedInRecipes'), t('portion.allergyNotes'), t('portion.purchaseNeeded')]}
      rows={rows.map((row) => [row.ingredientName, formatNumber(row.requiredQuantity), formatNumber(row.availableQuantity), formatNumber(row.missingQuantity), row.unit, row.usedInRecipes.join(', '), row.allergyNotes.join(', ') || '-', row.purchaseNeeded ? t('common.warning') : t('common.safe')])}
    />
  )
}
