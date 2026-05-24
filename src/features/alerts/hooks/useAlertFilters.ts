import { useMemo, useState } from 'react'

import { useAppData } from '../../../lib/AppState'
import { generateAlerts } from '../../../services/alertsEngine'
import { alertSeverityOrder } from '../utils/alertFormatters'

export function useAlertFilters(localReadIds: Set<string>) {
  const { data } = useAppData()
  const [familyId, setFamilyId] = useState('all')
  const [severity, setSeverity] = useState('all')
  const [type, setType] = useState('all')
  const [readStatus, setReadStatus] = useState<'all' | 'unread' | 'read'>('all')

  return useMemo(() => {
    const generatedAlerts = data.families.flatMap((family) => generateAlerts({
      family,
      diners: data.familyMembers.filter((diner) => diner.family_id === family.id && diner.is_active),
      allergies: data.allergies,
      ingredients: data.ingredients,
      recipes: data.recipes,
      recipeIngredients: data.recipeIngredients,
      menuItems: data.menuPlanItems,
      pantry: data.pantryInventory,
      freezer: data.freezerInventory,
      settings: data.settings,
    }))
    const allAlerts = [...data.alerts, ...generatedAlerts].map((alert) => ({
      ...alert,
      is_read: alert.is_read || localReadIds.has(alert.id),
    }))
    const filteredAlerts = allAlerts
      .filter((alert) => familyId === 'all' || alert.family_id === familyId)
      .filter((alert) => severity === 'all' || alert.severity === severity)
      .filter((alert) => type === 'all' || alert.type === type)
      .filter((alert) => readStatus === 'all' || (readStatus === 'read' ? alert.is_read : !alert.is_read))
      .sort((a, b) => alertSeverityOrder[a.severity] - alertSeverityOrder[b.severity] || Number(a.is_read) - Number(b.is_read))
    const types = Array.from(new Set(allAlerts.map((alert) => alert.type))).sort()

    return {
      data,
      familyId,
      setFamilyId,
      severity,
      setSeverity,
      type,
      setType,
      readStatus,
      setReadStatus,
      alerts: filteredAlerts,
      allAlerts,
      types,
      summary: {
        critical: allAlerts.filter((alert) => alert.severity === 'critical' && !alert.is_read).length,
        warning: allAlerts.filter((alert) => alert.severity === 'warning' && !alert.is_read).length,
        unread: allAlerts.filter((alert) => !alert.is_read).length,
        total: allAlerts.length,
      },
    }
  }, [data, familyId, localReadIds, readStatus, severity, type])
}
