import { useTranslation } from 'react-i18next'

import { DinerNutritionTable } from '../../features/nutrition/components/DinerNutritionTable'
import { MacroDistributionPanel } from '../../features/nutrition/components/MacroDistributionPanel'
import { MissingNutritionDataPanel } from '../../features/nutrition/components/MissingNutritionDataPanel'
import { NutritionSummaryCards } from '../../features/nutrition/components/NutritionSummaryCards'
import { NutritionTargetProgress } from '../../features/nutrition/components/NutritionTargetProgress'
import { NutritionWarningsPanel } from '../../features/nutrition/components/NutritionWarningsPanel'
import { PrintableNutritionReport } from '../../features/nutrition/components/PrintableNutritionReport'
import { WeeklyNutritionTable } from '../../features/nutrition/components/WeeklyNutritionTable'
import { useNutritionView } from '../../features/nutrition/hooks/useNutritionView'
import { Card, PageHeader } from '../../features/shared/chefUi'

export default function NutritionPage() {
  const { t } = useTranslation()
  const nutrition = useNutritionView()

  return (
    <>
      <PageHeader title={t('nutrition.title')} subtitle={t('nutrition.subtitle')} />
      <PrintableNutritionReport nutrition={nutrition} />
      <div className="mt-5">
        <NutritionSummaryCards nutrition={nutrition} />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <DinerNutritionTable nutrition={nutrition} />
        <Card>
          <h2 className="font-serif text-2xl font-semibold">{t('nutrition.targetProgress')}</h2>
          <div className="mt-4 grid gap-4">
            {nutrition.dinerRows.slice(0, 4).map((row) => (
              <div key={row.diner.id} className="rounded-md border border-stone-200 bg-white p-3">
                <p className="mb-3 font-semibold text-slate-900">{row.diner.full_name}</p>
                <div className="grid gap-3">
                  <NutritionTargetProgress label={t('common.calories')} value={row.daily.calories} target={row.diner.daily_calorie_target ?? 0} status={row.calorieStatus} />
                  <NutritionTargetProgress label={t('common.protein')} value={row.daily.protein_g} target={row.diner.daily_protein_target_g ?? 0} status={row.proteinStatus} unit="g" />
                </div>
              </div>
            ))}
          </div>
        </Card>
        <WeeklyNutritionTable nutrition={nutrition} />
        <MacroDistributionPanel nutrition={nutrition} />
        <MissingNutritionDataPanel nutrition={nutrition} />
        <NutritionWarningsPanel nutrition={nutrition} />
      </div>
    </>
  )
}
