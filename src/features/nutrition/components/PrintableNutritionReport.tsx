import { Printer } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button, Card } from '../../shared/chefUi'
import type { useNutritionView } from '../hooks/useNutritionView'

type NutritionView = ReturnType<typeof useNutritionView>

export function PrintableNutritionReport({ nutrition }: { nutrition: NutritionView }) {
  const { t } = useTranslation()
  return (
    <Card className="print:shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-forest-700">{t('nutrition.printSummary')}</p>
          <h2 className="font-serif text-2xl font-semibold">{nutrition.today} - {nutrition.weekEnd}</h2>
        </div>
        <Button variant="secondary" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          {t('nutrition.printReport')}
        </Button>
      </div>
    </Card>
  )
}
