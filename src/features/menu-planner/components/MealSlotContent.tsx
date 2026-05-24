import { useTranslation } from 'react-i18next'

import { Badge } from '../../shared/chefUi'
import type { AllergyStatus, Recipe } from '../../../lib/types'
import { formatNumber } from '../../../lib/utils'

export default function MealSlotContent({
  item,
  recipe,
}: {
  item: { allergy_status: AllergyStatus; variety_status: string; calories?: number; protein_g?: number; ai_generated?: boolean }
  recipe: Recipe
}) {
  const { t } = useTranslation()
  return (
    <div className="mt-1">
      <p className="text-sm font-semibold">{recipe.name}</p>
      <p className="text-xs text-slate-500">{formatNumber(item.calories ?? 0)} {t('common.calories')} / {formatNumber(item.protein_g ?? 0)}g {t('common.protein')}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        <Badge status={item.allergy_status}>{t(item.allergy_status === 'review_needed' ? 'common.reviewNeeded' : `common.${item.allergy_status}`)}</Badge>
        <Badge status={item.variety_status}>{item.variety_status}</Badge>
        {item.ai_generated && <Badge status="ai">{t('nav.aiChef')}</Badge>}
      </div>
    </div>
  )
}
