import { Plus, Printer } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ExpirationForecastTable } from '../../features/inventory-forecast/components/ExpirationForecastTable'
import { InventoryForecastPanel } from '../../features/inventory-forecast/components/InventoryForecastPanel'
import { PurchasePriorityPanel } from '../../features/inventory-forecast/components/PurchasePriorityPanel'
import { useInventoryForecast } from '../../features/inventory-forecast/hooks/useInventoryForecast'
import { PantryCategorySummary } from '../../features/pantry/components/PantryCategorySummary'
import { PantryExpirationPanel } from '../../features/pantry/components/PantryExpirationPanel'
import { PantryItemDialog } from '../../features/pantry/components/PantryItemDialog'
import { PantryLowStockPanel } from '../../features/pantry/components/PantryLowStockPanel'
import { PantryTable } from '../../features/pantry/components/PantryTable'
import { PantryUsagePanel } from '../../features/pantry/components/PantryUsagePanel'
import { usePantryState } from '../../features/pantry/hooks/usePantryState'
import { Button, Card, Field, PageHeader, ReadOnlyNotice } from '../../features/shared/chefUi'
import { useCanWrite } from '../../features/shared/chefHooks'
import { useAppData } from '../../lib/AppState'

export default function PantryPage() {
  const { t } = useTranslation()
  const { addPantryItem, updatePantryItem } = useAppData()
  const canWrite = useCanWrite()
  const pantry = usePantryState()
  const inventoryForecast = useInventoryForecast(pantry.familyId)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const editingItem = pantry.data.pantryInventory.find((item) => item.id === editing)

  return (
    <>
      <PageHeader
        title={t('pantry.title')}
        subtitle={t('pantry.subtitle')}
        action={
          <div className="flex flex-wrap gap-2">
            {canWrite ? (
              <Button onClick={() => setOpen(true)} data-testid="create-pantry-item">
                <Plus className="h-4 w-4" />
                {t('pantry.addStock')}
              </Button>
            ) : (
              <ReadOnlyNotice />
            )}
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              {t('pantry.printChecklist')}
            </Button>
          </div>
        }
      />

      <Card className="mb-5 print:hidden">
        <div className="grid gap-3 md:grid-cols-3">
          <Field label={t('common.family')}>
            <select className="input" value={pantry.familyId} onChange={(event) => pantry.setFamilyId(event.target.value)} data-testid="pantry-family">
              <option value="all">{t('common.all')}</option>
              {pantry.data.families.map((family) => <option key={family.id} value={family.id}>{family.name}</option>)}
            </select>
          </Field>
          <Field label={t('common.category')}>
            <select className="input" value={pantry.category} onChange={(event) => pantry.setCategory(event.target.value)} data-testid="pantry-category">
              <option value="all">{t('common.all')}</option>
              {pantry.categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </Field>
          <Field label={t('common.filter')}>
            <select className="input" value={pantry.filter} onChange={(event) => pantry.setFilter(event.target.value as 'all' | 'low' | 'expiring')} data-testid="pantry-filter">
              <option value="all">{t('common.all')}</option>
              <option value="low">{t('pantry.lowStock')}</option>
              <option value="expiring">{t('pantry.expiringSoon')}</option>
            </select>
          </Field>
        </div>
      </Card>

      <div className="grid gap-5">
        <InventoryForecastPanel forecast={inventoryForecast.forecast} />
        <div className="grid gap-5 xl:grid-cols-2">
          <PurchasePriorityPanel forecast={inventoryForecast.forecast} />
          <ExpirationForecastTable forecast={inventoryForecast.forecast} data={inventoryForecast.data} />
        </div>
        <div className="grid gap-5 xl:grid-cols-3">
          <PantryLowStockPanel pantry={pantry} />
          <PantryExpirationPanel pantry={pantry} />
          <PantryCategorySummary pantry={pantry} />
        </div>
        <Card>
          <h2 className="mb-4 font-serif text-2xl font-semibold">{t('pantry.checklist')}</h2>
          <PantryTable pantry={pantry} canWrite={canWrite} onEdit={setEditing} />
        </Card>
        <PantryUsagePanel pantry={pantry} />
      </div>

      {canWrite && open && (
        <PantryItemDialog
          onClose={() => setOpen(false)}
          onSubmit={(values) => {
            addPantryItem(values)
            setOpen(false)
          }}
        />
      )}
      {canWrite && editingItem && (
        <PantryItemDialog
          item={editingItem}
          onClose={() => setEditing(null)}
          onSubmit={(values) => {
            updatePantryItem(editingItem.id, values)
            setEditing(null)
          }}
        />
      )}
    </>
  )
}
