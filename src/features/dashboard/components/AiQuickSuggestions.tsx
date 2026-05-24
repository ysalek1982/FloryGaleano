import { Brain } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { Badge, Card } from '../../shared/chefUi'
import type { useDashboardData } from '../hooks/useDashboardData'

type DashboardData = ReturnType<typeof useDashboardData>

export function AiQuickSuggestions({ dashboard }: { dashboard: DashboardData }) {
  const { t } = useTranslation()
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-semibold">{t('dashboard.aiSuggestions')}</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">{t('dashboard.aiReadyBody')}</p>
        </div>
        <Badge status={dashboard.aiEnabled ? 'ai' : 'warning'}>{dashboard.aiEnabled ? t('common.enabled') : t('common.disabled')}</Badge>
      </div>
      <Link to="/app/ai-chef" className="mt-5 inline-flex items-center gap-2 rounded-md bg-ai-600 px-4 py-2 text-sm font-semibold text-white hover:bg-ai-700 focus-ring">
        <Brain className="h-4 w-4" />
        {t('dashboard.askAiChef')}
      </Link>
    </Card>
  )
}
