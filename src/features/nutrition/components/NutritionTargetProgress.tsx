import { useTranslation } from 'react-i18next'

import { Badge } from '../../shared/chefUi'
import { formatNumber } from '../../../lib/utils'
import { nutritionStatusLabel } from '../utils/nutritionFormatters'

export function NutritionTargetProgress({
  label,
  value,
  target,
  status,
  unit = '',
}: {
  label: string
  value: number
  target: number
  status: string
  unit?: string
}) {
  const { t } = useTranslation()
  const percent = target ? Math.min(140, Math.round((value / target) * 100)) : 0
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        <Badge status={status === 'low' || status === 'high' ? 'warning' : 'safe'}>{nutritionStatusLabel(t, status)}</Badge>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-200" role="progressbar" aria-valuemin={0} aria-valuemax={target || 100} aria-valuenow={Math.round(value)}>
        <div className="h-full rounded-full bg-forest-600" style={{ width: `${Math.min(100, percent)}%` }} />
      </div>
      <p className="mt-1 text-xs text-slate-500">{formatNumber(value)}{unit} / {formatNumber(target)}{unit}</p>
    </div>
  )
}
