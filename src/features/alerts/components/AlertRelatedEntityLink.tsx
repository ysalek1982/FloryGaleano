import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import type { Alert } from '../../../lib/types'

function routeForAlert(alert: Alert) {
  if (alert.related_table === 'recipes') return '/app/recipes'
  if (alert.related_table === 'family_members') return '/app/diners'
  if (alert.related_table === 'freezer_inventory') return '/app/freezer'
  if (alert.related_table === 'menu_plan_items') return '/app/menu-planner'
  if (alert.related_table === 'pantry_inventory') return '/app/pantry'
  return '/app/dashboard'
}

export function AlertRelatedEntityLink({ alert }: { alert: Alert }) {
  const { t } = useTranslation()
  return (
    <Link className="text-sm font-semibold text-forest-700 underline-offset-4 hover:underline" to={routeForAlert(alert)}>
      {t('alerts.openRelated')}
    </Link>
  )
}
