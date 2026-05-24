import { useTranslation } from 'react-i18next'

import { Badge, Card, Field, SimpleList } from '../../shared/chefUi'
import { allergyReasonLabel, allergyRecommendation, allergyStatusLabel } from '../utils/allergyFormatters'
import type { useAllergyTester } from '../hooks/useAllergyTester'

type AllergyTesterState = ReturnType<typeof useAllergyTester>

export function RecipeAllergyTester({ tester }: { tester: AllergyTesterState }) {
  const { t } = useTranslation()
  const result = tester.recipeResult
  return (
    <Card>
      <h2 className="font-serif text-2xl font-semibold">{t('allergies.testRecipe')}</h2>
      <div className="mt-4 grid gap-3">
        <Field label={t('common.recipe')}>
          <select className="input" value={tester.recipeId} onChange={(event) => tester.setRecipeId(event.target.value)} data-testid="allergy-recipe">
            {tester.data.recipes.map((recipe) => <option key={recipe.id} value={recipe.id}>{recipe.name}</option>)}
          </select>
        </Field>
        {result && (
          <div className="rounded-md border border-stone-200 bg-stone-50 p-3" data-testid="allergy-recipe-result">
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
