import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ManualShoppingItemDialog } from '../../features/shopping/components/ManualShoppingItemDialog'
import { PrintableShoppingList } from '../../features/shopping/components/PrintableShoppingList'
import { ShoppingListTable } from '../../features/shopping/components/ShoppingListTable'
import { ShoppingListToolbar } from '../../features/shopping/components/ShoppingListToolbar'
import { ShoppingMissingSummary } from '../../features/shopping/components/ShoppingMissingSummary'
import { ShoppingPantryComparison } from '../../features/shopping/components/ShoppingPantryComparison'
import { useShoppingListGeneration } from '../../features/shopping/hooks/useShoppingListGeneration'
import { useShoppingListState } from '../../features/shopping/hooks/useShoppingListState'
import { PageHeader } from '../../features/shared/chefUi'
import { useCanWrite } from '../../features/shared/chefHooks'
import { useAppData } from '../../lib/AppState'

export default function ShoppingListPage() {
  const { t } = useTranslation()
  const { toggleShoppingItem, addShoppingListItem, updateShoppingListItem } = useAppData()
  const canWrite = useCanWrite()
  const shopping = useShoppingListState()
  const { generate } = useShoppingListGeneration(shopping.familyId)
  const [manualOpen, setManualOpen] = useState(false)

  return (
    <>
      <PageHeader title={t('shopping.title')} subtitle={t('shopping.subtitle')} />
      <ShoppingListToolbar
        shopping={shopping}
        canWrite={canWrite}
        onGenerate={generate}
        onManualItem={() => {
          if (!shopping.activeList) generate(shopping.familyId)
          setManualOpen(true)
        }}
      />
      <div className="grid gap-5">
        <ShoppingMissingSummary shopping={shopping} />
        <ShoppingListTable shopping={shopping} canWrite={canWrite} onToggle={toggleShoppingItem} onEdit={shopping.setEditingItemId} />
        <ShoppingPantryComparison shopping={shopping} />
        <PrintableShoppingList shopping={shopping} />
      </div>
      {canWrite && manualOpen && (
        <ManualShoppingItemDialog
          onClose={() => setManualOpen(false)}
          onSubmit={(values) => {
            addShoppingListItem(values)
            setManualOpen(false)
          }}
        />
      )}
      {canWrite && shopping.editingItem && (
        <ManualShoppingItemDialog
          item={shopping.editingItem}
          onClose={() => shopping.setEditingItemId(null)}
          onSubmit={(values) => {
            updateShoppingListItem(shopping.editingItem!.id, values)
            shopping.setEditingItemId(null)
          }}
        />
      )}
    </>
  )
}
