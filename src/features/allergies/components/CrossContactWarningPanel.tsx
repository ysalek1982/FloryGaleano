import { AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Card } from '../../shared/chefUi'

export function CrossContactWarningPanel() {
  const { t } = useTranslation()
  return (
    <Card className="border-amber-200 bg-amber-50">
      <div className="flex gap-3">
        <AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
        <div>
          <h2 className="font-serif text-2xl font-semibold text-amber-950">{t('allergies.crossContactWarning')}</h2>
          <p className="mt-2 text-sm leading-6 text-amber-900">{t('allergies.crossContactBody')}</p>
        </div>
      </div>
    </Card>
  )
}
