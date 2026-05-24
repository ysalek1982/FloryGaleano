import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { FamilyFormDialog } from '../../features/families/components/FamilyFormDialog'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  ReadOnlyNotice,
} from '../../features/shared/chefUi'
import { useCanWrite } from '../../features/shared/chefHooks'
import { useAppData } from '../../lib/AppState'
import { addDays, safeDate, todayIso } from '../../lib/utils'

export default function FamiliesPage() {
  const { t } = useTranslation()
  const { data, addFamily, updateFamily } = useAppData()
  const canWrite = useCanWrite()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const families = data.families.filter((family) => family.name.toLowerCase().includes(query.toLowerCase()))
  const editingFamily = data.families.find((family) => family.id === editing)

  return (
    <>
      <PageHeader
        title={t('families.title')}
        subtitle={t('families.subtitle')}
        action={
          canWrite ? (
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" />
              {t('families.create')}
            </Button>
          ) : (
            <ReadOnlyNotice />
          )
        }
      />
      <Card>
        <input
          className="input mb-4"
          placeholder={t('common.search')}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          data-testid="families-search"
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {families.map((family) => {
            const diners = data.familyMembers.filter((diner) => diner.family_id === family.id)
            const familyAlerts = data.alerts.filter((alert) => alert.family_id === family.id && alert.severity === 'critical')
            const pantryLow = data.pantryInventory.filter((item) => item.family_id === family.id && item.quantity_available < item.min_quantity_alert)
            const freezerSoon = data.freezerInventory.filter((item) => item.family_id === family.id && safeDate(item.expiration_date) <= addDays(todayIso(), 7))
            return (
              <Link
                key={family.id}
                to={`/app/families/${family.id}`}
                className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm hover:border-forest-200 focus-ring"
                data-testid="family-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-serif text-2xl font-semibold">{family.name}</h2>
                    <p className="mt-2 text-sm text-slate-600">{family.description}</p>
                  </div>
                  <Badge status="active">{t('common.active')}</Badge>
                </div>
                <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-slate-500">{t('families.diners')}</dt>
                    <dd className="font-semibold">{diners.length}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">{t('families.currentMenu')}</dt>
                    <dd className="font-semibold">{data.menuPlans.find((plan) => plan.family_id === family.id)?.status}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">{t('nav.alerts')}</dt>
                    <dd className="font-semibold">{familyAlerts.length}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">{t('pantry.lowStock')}</dt>
                    <dd className="font-semibold">{pantryLow.length + freezerSoon.length}</dd>
                  </div>
                </dl>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-forest-700">{t('families.openFamily')}</span>
                  {canWrite && (
                    <button
                      type="button"
                      className="rounded-md border border-stone-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-stone-50 focus-ring"
                      onClick={(event) => {
                        event.preventDefault()
                        setEditing(family.id)
                      }}
                    >
                      {t('common.edit')}
                    </button>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
        {families.length === 0 && <EmptyState text={t('empty.families')} />}
      </Card>
      {canWrite && open && (
        <FamilyFormDialog
          onClose={() => setOpen(false)}
          onSubmit={(values) => {
            addFamily(values)
            setOpen(false)
          }}
        />
      )}
      {canWrite && editingFamily && (
        <FamilyFormDialog
          family={editingFamily}
          onClose={() => setEditing(null)}
          onSubmit={(values) => {
            updateFamily(editingFamily.id, values)
            setEditing(null)
          }}
        />
      )}
    </>
  )
}
