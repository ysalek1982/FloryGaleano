import { useTranslation } from 'react-i18next'

import { TableCard } from '../../shared/chefUi'
import { formatNumber } from '../../../lib/utils'
import type { calculateDinerPortions } from '../../../services/portionEngine'

export default function DinerPortionTable({ rows }: { rows: ReturnType<typeof calculateDinerPortions> }) {
  const { t } = useTranslation()
  return (
    <TableCard
      title={t('portion.dinerPortions')}
      headers={[t('common.diner'), t('common.meal'), t('common.recipe'), t('diners.portionFactor'), t('portion.servingEquivalent'), t('portion.plannedGrams'), t('common.calories'), t('common.protein'), t('common.status')]}
      rows={rows.map((row) => [row.dinerName, t('planner.dinner'), row.recipeName, row.portionFactor, formatNumber(row.servingEquivalent, 1), `${formatNumber(row.plannedGrams)}g`, formatNumber(row.calories), `${formatNumber(row.protein_g)}g`, t('common.safe')])}
    />
  )
}
