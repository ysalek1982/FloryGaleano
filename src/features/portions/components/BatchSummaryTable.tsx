import { useTranslation } from 'react-i18next'

import { TableCard } from '../../shared/chefUi'
import { formatNumber } from '../../../lib/utils'
import type { calculateBatchSummary } from '../../../services/portionEngine'

export default function BatchSummaryTable({ rows }: { rows: ReturnType<typeof calculateBatchSummary> }) {
  const { t } = useTranslation()
  return (
    <TableCard
      title={t('portion.batchSummary')}
      headers={[t('common.recipe'), t('portion.totalServings'), t('portion.totalGrams'), t('portion.storageRecommendation'), t('recipes.freezerFriendly'), t('recipes.reheating')]}
      rows={rows.map((row) => [row.recipeName, formatNumber(row.totalServings, 1), `${formatNumber(row.totalGrams)}g`, t(row.storageRecommendation === 'freeze_or_refrigerate' ? 'portion.freezeOrRefrigerate' : 'portion.serveFresh'), row.freezerFriendly ? t('common.enabled') : t('common.disabled'), row.reheatingNotes || '-'])}
    />
  )
}
