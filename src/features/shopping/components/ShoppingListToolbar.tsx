import { Plus, Printer, ShoppingCart } from 'lucide-react'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { ExportMenu } from '../../exports/components/ExportMenu'
import { Button, Card, Field, ReadOnlyNotice } from '../../shared/chefUi'
import type { useShoppingListState } from '../hooks/useShoppingListState'
import { buildShoppingExportReport } from '../utils/shoppingExportData'

type ShoppingState = ReturnType<typeof useShoppingListState>

export function ShoppingListToolbar({
  shopping,
  canWrite,
  onGenerate,
  onManualItem,
}: {
  shopping: ShoppingState
  canWrite: boolean
  onGenerate: (familyId?: string) => void
  onManualItem: () => void
}) {
  const { t } = useTranslation()
  const familySelectRef = useRef<HTMLSelectElement>(null)
  const exportReport = buildShoppingExportReport(shopping, t)
  return (
    <Card className="mb-5 print:hidden">
      <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
        <Field label={t('common.family')}>
          <select ref={familySelectRef} className="input" value={shopping.familyId} onChange={(event) => shopping.setFamilyId(event.target.value)} data-testid="shopping-family">
            <option value="all">{t('common.all')}</option>
            {shopping.data.families.map((family) => <option key={family.id} value={family.id}>{family.name}</option>)}
          </select>
        </Field>
        <div className="flex flex-wrap gap-2">
          {canWrite ? (
            <>
              <Button onClick={() => onGenerate(familySelectRef.current?.value)}>
                <ShoppingCart className="h-4 w-4" />
                {t('shopping.generate')}
              </Button>
              <Button variant="secondary" onClick={onManualItem}>
                <Plus className="h-4 w-4" />
                {t('shopping.manualItem')}
              </Button>
            </>
          ) : (
            <ReadOnlyNotice />
          )}
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            {t('common.print')}
          </Button>
        </div>
      </div>
      <div className="mt-4">
        <ExportMenu report={exportReport} testIdPrefix="shopping-export" />
      </div>
    </Card>
  )
}
