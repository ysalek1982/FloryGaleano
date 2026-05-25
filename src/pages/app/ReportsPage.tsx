import { useTranslation } from 'react-i18next'

import AiCopilotButton from '../../features/ai-copilot/components/AiCopilotButton'
import { AllergySafetyReport } from '../../features/reports/components/AllergySafetyReport'
import { ChefProductionSheetReport } from '../../features/reports/components/ChefProductionSheetReport'
import { DinerMenuReport } from '../../features/reports/components/DinerMenuReport'
import { FreezerInventoryReport } from '../../features/reports/components/FreezerInventoryReport'
import { MissingIngredientsReport } from '../../features/reports/components/MissingIngredientsReport'
import { NutritionSummaryReport } from '../../features/reports/components/NutritionSummaryReport'
import { PantryLowStockReport } from '../../features/reports/components/PantryLowStockReport'
import { ReportToolbar } from '../../features/reports/components/ReportToolbar'
import { ShoppingListReport } from '../../features/reports/components/ShoppingListReport'
import { WeeklyFamilyMenuReport } from '../../features/reports/components/WeeklyFamilyMenuReport'
import { usePrintableReport } from '../../features/reports/hooks/usePrintableReport'
import { useReportsData, type ReportType } from '../../features/reports/hooks/useReportsData'
import { PageHeader } from '../../features/shared/chefUi'

export default function ReportsPage() {
  const { t } = useTranslation()
  const reports = useReportsData()
  const printable = usePrintableReport()

  const shouldShow = (type: ReportType) => reports.reportType === 'all' || reports.reportType === type

  return (
    <>
      <PageHeader
        title={t('reports.title')}
        subtitle={t('reports.subtitle')}
        action={(
          <div className="flex flex-wrap gap-2">
            <AiCopilotButton
              compact
              context={{ page_id: 'reports', selected_family_id: reports.familyId, selected_week: reports.activePlan?.start_date, relevant_records: { report_type: reports.reportType } }}
              actionKey="reports.summarize"
              labelKey="aiCopilot.actions.reports.summarize.label"
              testId="reports-ai-summarize"
            />
          </div>
        )}
      />
      <ReportToolbar reports={reports} onPrint={printable.print} />
      <div className="grid gap-5 print:block" data-testid="reports-print-layout">
        {shouldShow('weeklyMenu') && <WeeklyFamilyMenuReport reports={reports} />}
        {shouldShow('dinerMenu') && <DinerMenuReport reports={reports} />}
        {shouldShow('productionSheet') && <ChefProductionSheetReport reports={reports} />}
        {shouldShow('shoppingList') && <ShoppingListReport reports={reports} />}
        {shouldShow('missingIngredients') && <MissingIngredientsReport reports={reports} />}
        {shouldShow('allergyReport') && <AllergySafetyReport reports={reports} />}
        {shouldShow('nutritionReport') && <NutritionSummaryReport reports={reports} />}
        {shouldShow('freezerReport') && <FreezerInventoryReport reports={reports} />}
        {shouldShow('pantryLow') && <PantryLowStockReport reports={reports} />}
      </div>
    </>
  )
}
