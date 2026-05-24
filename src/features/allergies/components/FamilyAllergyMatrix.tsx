import { useTranslation } from 'react-i18next'

import { Badge, Card, ResponsiveTable } from '../../shared/chefUi'
import { allergyReasonLabel, allergyRecommendation, allergyStatusLabel } from '../utils/allergyFormatters'
import type { useAllergyTester } from '../hooks/useAllergyTester'

type AllergyTesterState = ReturnType<typeof useAllergyTester>

export function FamilyAllergyMatrix({ tester }: { tester: AllergyTesterState }) {
  const { t } = useTranslation()
  return (
    <Card>
      <h2 className="font-serif text-2xl font-semibold">{t('allergies.familyMatrix')}</h2>
      <div className="mt-4">
        <ResponsiveTable
          headers={[t('common.diner'), t('common.status'), t('allergies.matchedAllergen'), t('common.source'), t('allergies.crossContactWarning'), t('allergies.recommendation')]}
          rows={tester.familyMatrix.map((row) => [
            row.diner.full_name,
            <Badge key="status" status={row.status}>{allergyStatusLabel(t, row.status)}</Badge>,
            [...row.blockedIngredients, ...row.reviewIngredients].join(', ') || '-',
            tester.recipe?.scope || '-',
            row.reasons.some((reason) => reason.includes('trace')) ? t('allergies.traceRisk') : t('common.safe'),
            allergyRecommendation(t, row.status),
          ])}
        />
      </div>
      {tester.familyMatrix.length > 0 && (
        <p className="mt-3 text-sm text-slate-600">
          {tester.familyMatrix.flatMap((row) => row.reasons).map((reason) => allergyReasonLabel(t, reason)).join(', ') || t('allergies.noMatchedAllergens')}
        </p>
      )}
    </Card>
  )
}
