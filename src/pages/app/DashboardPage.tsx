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
import { useTranslation } from 'react-i18next'

export default function DashboardPage() {
  const { t } = useTranslation()
  const dashboard = useDashboardData()

  return (
    <>
      <PageHeader title={t('dashboard.title')} subtitle={t('dashboard.subtitle')} />
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
