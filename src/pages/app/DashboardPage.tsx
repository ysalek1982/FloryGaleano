import { useTranslation } from 'react-i18next'

import AiCopilotButton from '../../features/ai-copilot/components/AiCopilotButton'
import { AiQuickSuggestions } from '../../features/dashboard/components/AiQuickSuggestions'
import { CriticalAlertsPanel } from '../../features/dashboard/components/CriticalAlertsPanel'
import { DashboardActionRail } from '../../features/dashboard/components/DashboardActionRail'
import { DashboardFamilyOverview } from '../../features/dashboard/components/DashboardFamilyOverview'
import { DashboardStats } from '../../features/dashboard/components/DashboardStats'
import { MissingIngredientsPanel } from '../../features/dashboard/components/MissingIngredientsPanel'
import { NutritionSnapshot } from '../../features/dashboard/components/NutritionSnapshot'
import { TodayKitchenPlan } from '../../features/dashboard/components/TodayKitchenPlan'
import { UpcomingMealsPanel } from '../../features/dashboard/components/UpcomingMealsPanel'
import { useDashboardData } from '../../features/dashboard/hooks/useDashboardData'
import { PageHeader } from '../../features/shared/chefUi'

export default function DashboardPage() {
  const { t } = useTranslation()
  const dashboard = useDashboardData()

  return (
    <>
      <PageHeader
        title={t('dashboard.title')}
        subtitle={t('dashboard.subtitle')}
        action={(
          <div className="flex flex-wrap gap-2">
            <AiCopilotButton
              compact
              context={{ page_id: 'dashboard', selected_family_id: dashboard.family?.id, relevant_records: { critical_alerts: dashboard.criticalAlerts.length, missing_ingredients: dashboard.missingIngredients.length } }}
              actionKey="dashboard.summarizeRisks"
              labelKey="aiCopilot.actions.dashboard.summarizeRisks.label"
              testId="dashboard-ai-risks"
            />
            <AiCopilotButton
              compact
              context={{ page_id: 'dashboard', selected_family_id: dashboard.family?.id, relevant_records: { critical_alerts: dashboard.criticalAlerts.length } }}
              actionKey="dashboard.nextAction"
              labelKey="aiCopilot.actions.dashboard.nextAction.label"
              testId="dashboard-ai-next"
            />
          </div>
        )}
      />
      <DashboardStats dashboard={dashboard} />
      <div className="mt-6 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <TodayKitchenPlan dashboard={dashboard} />
        <DashboardActionRail />
        <CriticalAlertsPanel dashboard={dashboard} />
        <MissingIngredientsPanel dashboard={dashboard} />
        <DashboardFamilyOverview dashboard={dashboard} />
        <NutritionSnapshot />
        <UpcomingMealsPanel dashboard={dashboard} />
        <AiQuickSuggestions dashboard={dashboard} />
      </div>
    </>
  )
}
