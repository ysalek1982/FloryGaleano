import { useTranslation } from 'react-i18next'

import { Card, EmptyState, MenuItemRow } from '../../shared/chefUi'
import type { useDashboardData } from '../hooks/useDashboardData'

type DashboardData = ReturnType<typeof useDashboardData>

export function TodayKitchenPlan({ dashboard }: { dashboard: DashboardData }) {
  const { t } = useTranslation()
  return (
    <div data-testid="today-kitchen-plan">
      <Card>
      <h2 className="font-serif text-2xl font-semibold">{t('dashboard.todaysKitchenPlan')}</h2>
      <div className="mt-4 grid gap-3">
        {dashboard.todayItems.length === 0
          ? <EmptyState text={t('empty.recipes')} />
          : dashboard.todayItems.map((item) => <MenuItemRow key={item.id} item={item} />)}
      </div>
      </Card>
    </div>
  )
}
