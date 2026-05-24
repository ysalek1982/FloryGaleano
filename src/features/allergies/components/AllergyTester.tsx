import { useTranslation } from 'react-i18next'

import { Badge, Card, Field, SimpleList } from '../../shared/chefUi'
import { allergyReasonLabel, allergyRecommendation, allergyStatusLabel } from '../utils/allergyFormatters'
import type { useAllergyTester } from '../hooks/useAllergyTester'

type AllergyTesterState = ReturnType<typeof useAllergyTester>

export function AllergyTester({ tester }: { tester: AllergyTesterState }) {
  const { t } = useTranslation()
  const result = tester.ingredientResult
  return (
    <Card>
      <h2 className="font-serif text-2xl font-semibold">{t('allergies.testIngredient')}</h2>
      <div className="mt-4 grid gap-3">
        <Field label={t('common.family')}>
          <select className="input" value={tester.familyId} onChange={(event) => tester.setFamilyId(event.target.value)} data-testid="allergy-family">
            {tester.data.families.map((family) => <option key={family.id} value={family.id}>{family.name}</option>)}
          </select>
        </Field>
        <Field label={t('common.diner')}>
          <select className="input" value={tester.dinerId} onChange={(event) => tester.setDinerId(event.target.value)} data-testid="allergy-diner">
            {tester.diners.map((item) => <option key={item.id} value={item.id}>{item.full_name}</option>)}
          </select>
        </Field>
        <Field label={t('common.ingredient')}>
          <select className="input" value={tester.ingredientId} onChange={(event) => tester.setIngredientId(event.target.value)} data-testid="allergy-ingredient">
            {tester.data.ingredients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </Field>
        {result && (
          <div className="rounded-md border border-stone-200 bg-stone-50 p-3" data-testid="allergy-ingredient-result">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Badge status={result.status}>{allergyStatusLabel(t, result.status)}</Badge>
              <span className="text-sm font-semibold text-slate-700">{allergyRecommendation(t, result.status)}</span>
            </div>
            <div className="mt-3">
              <SimpleList items={result.reasons.map((reason) => allergyReasonLabel(t, reason))} />
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
