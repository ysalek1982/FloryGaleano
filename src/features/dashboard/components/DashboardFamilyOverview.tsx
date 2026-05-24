import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { Badge, Card, EmptyState } from '../../shared/chefUi'
import type { useDashboardData } from '../hooks/useDashboardData'

type DashboardData = ReturnType<typeof useDashboardData>

export function DashboardFamilyOverview({ dashboard }: { dashboard: DashboardData }) {
  const { t } = useTranslation()
  return (
    <Card>
      <h2 className="font-serif text-2xl font-semibold">{t('dashboard.familyOverview')}</h2>
      <div className="mt-4 grid gap-3">
        {dashboard.data.families.length === 0 ? (
          <EmptyState text={t('empty.families')} />
        ) : (
          dashboard.data.families.slice(0, 4).map((family) => {
            const diners = dashboard.data.familyMembers.filter((diner) => diner.family_id === family.id && diner.is_active)
            const familyAlerts = dashboard.alerts.filter((alert) => alert.family_id === family.id && alert.severity === 'critical')
            return (
              <Link key={family.id} to={`/app/families/${family.id}`} className="rounded-md border border-stone-200 bg-white p-3 hover:border-forest-200 focus-ring">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-slate-950">{family.name}</span>
                  <Badge status={familyAlerts.length ? 'critical' : 'safe'}>{familyAlerts.length ? t('common.critical') : t('common.safe')}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-600">{diners.length} {t('families.diners')}</p>
              </Link>
            )
          })
        )}
      </div>
    </Card>
  )
}
