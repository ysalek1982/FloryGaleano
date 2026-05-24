import { useTranslation } from 'react-i18next'

import { Badge, Card, EmptyState, ResponsiveTable } from '../../shared/chefUi'
import type { useFreezerState } from '../hooks/useFreezerState'
import { formatNumber } from '../../../lib/utils'

type FreezerState = ReturnType<typeof useFreezerState>

export function FreezerBatchSummary({ freezer }: { freezer: FreezerState }) {
  const { t } = useTranslation()
  return (
    <Card>
      <h2 className="font-serif text-2xl font-semibold">{t('freezer.batchSummary')}</h2>
      <div className="mt-4">
        {freezer.scopedItems.length === 0 ? (
          <EmptyState text={t('empty.recipes')} />
        ) : (
          <ResponsiveTable
            headers={[t('common.recipe'), t('freezer.portionsAvailable'), t('freezer.gramsPerPortion'), t('recipes.reheating'), t('common.status')]}
            rows={freezer.scopedItems.map((item) => {
              const recipe = freezer.data.recipes.find((candidate) => candidate.id === item.recipe_id)
              return [
                recipe?.name || '-',
                formatNumber(item.portions_available),
                `${formatNumber(item.grams_per_portion ?? 0)}g`,
                item.reheating_instructions || '-',
                <Badge key="friendly" status={recipe?.is_freezer_friendly ? 'safe' : 'warning'}>
                  {recipe?.is_freezer_friendly ? t('freezer.freezerFriendly') : t('freezer.reviewStorage')}
                </Badge>,
              ]
            })}
          />
        )}
      </div>
    </Card>
  )
}
