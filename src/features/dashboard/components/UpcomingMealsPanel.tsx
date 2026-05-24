import { useTranslation } from 'react-i18next'

import { Card, EmptyState, MenuItemRow } from '../../shared/chefUi'
import type { useDashboardData } from '../hooks/useDashboardData'

type DashboardData = ReturnType<typeof useDashboardData>

export function UpcomingMealsPanel({ dashboard }: { dashboard: DashboardData }) {
  const { t } = useTranslation()
  return (
    <Card>
      <h2 className="font-serif text-2xl font-semibold">{t('dashboard.upcomingMeals')}</h2>
      <div className="mt-4 grid gap-3">
        {dashboard.upcomingMeals.length === 0
          ? <EmptyState text={t('dashboard.noUpcomingMeals')} />
          : dashboard.upcomingMeals.map((item) => <MenuItemRow key={item.id} item={item} />)}
      </div>
    </Card>
  )
}
