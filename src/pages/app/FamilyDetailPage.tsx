import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useParams } from 'react-router-dom'

import { FamilyFormDialog } from '../../features/families/components/FamilyFormDialog'
import {
  AlertList,
  Button,
  Card,
  EmptyState,
  Info,
  MenuItemRow,
  PageHeader,
  ReadOnlyNotice,
  SimpleList,
  TableCard,
} from '../../features/shared/chefUi'
import { useCanWrite, useOperationalContext } from '../../features/shared/chefHooks'
import { useAppData } from '../../lib/AppState'
import { cn, formatNumber, safeDate } from '../../lib/utils'
import ReportsPage from './ReportsPage'

export default function FamilyDetailPage() {
  const { t } = useTranslation()
  const { familyId } = useParams()
  const { data, updateFamily } = useAppData()
  const operational = useOperationalContext()
  const canWrite = useCanWrite()
  const [tab, setTab] = useState('overview')
  const [editing, setEditing] = useState(false)
  const family = data.families.find((candidate) => candidate.id === familyId) || data.families[0]
  const diners = data.familyMembers.filter((diner) => diner.family_id === family?.id)
  const allergies = data.allergies.filter((allergy) => diners.some((diner) => diner.id === allergy.family_member_id))
  const preferences = data.foodPreferences.filter((preference) => diners.some((diner) => diner.id === preference.family_member_id))
  const menuItems = data.menuPlanItems.filter((item) => data.menuPlans.find((plan) => plan.id === item.menu_plan_id)?.family_id === family?.id)
  const pantry = data.pantryInventory.filter((item) => item.family_id === family?.id)
  const freezer = data.freezerInventory.filter((item) => item.family_id === family?.id)
  const shoppingLists = data.shoppingLists.filter((item) => item.family_id === family?.id)
  const alerts = operational.alerts.filter((alert) => alert.family_id === family?.id)
  const tabs = [
    ['overview', 'families.overview'],
    ['diners', 'families.diners'],
    ['menus', 'families.weeklyMenu'],
    ['pantry', 'nav.pantry'],
    ['freezer', 'nav.freezer'],
    ['shopping', 'nav.shoppingList'],
    ['alerts', 'nav.alerts'],
    ['reports', 'nav.reports'],
  ]

  if (!family) return <Navigate to="/app/families" replace />

  return (
    <>
      <PageHeader
        title={family.name}
        subtitle={t('families.detailTitle')}
        action={
          <div className="flex flex-wrap gap-2">
            {canWrite && (
              <Button variant="secondary" onClick={() => setEditing(true)}>
                {t('common.edit')}
              </Button>
            )}
            <Link to="/app/ai-chef" className="inline-flex rounded-md bg-ai-600 px-4 py-2 text-sm font-semibold text-white focus-ring">
              {t('families.aiAction')}
            </Link>
            {!canWrite && <ReadOnlyNotice />}
          </div>
        }
      />
      <div className="mb-5 flex gap-2 overflow-x-auto rounded-lg border border-stone-200 bg-white p-2" data-testid="family-detail-tabs">
        {tabs.map(([id, key]) => (
          <button
            key={id}
            type="button"
            className={cn('rounded-md px-3 py-2 text-sm font-semibold focus-ring', tab === id ? 'bg-forest-700 text-white' : 'text-slate-700 hover:bg-stone-50')}
            onClick={() => setTab(id)}
          >
            {t(key)}
          </button>
        ))}
      </div>
      {tab === 'overview' && (
        <div className="grid gap-5 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <h2 className="font-serif text-2xl font-semibold">{t('families.overview')}</h2>
            <dl className="mt-4 grid gap-4 md:grid-cols-2">
              <Info label={t('families.primaryContact')} value={family.primary_contact_name || ''} />
              <Info label={t('families.contactEmail')} value={family.primary_contact_email || ''} />
              <Info label={t('families.contactPhone')} value={family.primary_contact_phone || ''} />
              <Info label={t('families.address')} value={family.address || ''} />
              <Info label={t('common.notes')} value={family.notes || '-'} />
            </dl>
          </Card>
          <Card>
            <h2 className="font-serif text-2xl font-semibold">{t('nav.alerts')}</h2>
            <AlertList alerts={alerts.slice(0, 4)} />
          </Card>
          <Card>
            <h2 className="font-serif text-2xl font-semibold">{t('families.diners')}</h2>
            <SimpleList items={diners.map((diner) => `${diner.full_name} - ${diner.portion_factor}x`)} />
          </Card>
          <Card>
            <h2 className="font-serif text-2xl font-semibold">{t('families.allergiesSummary')}</h2>
            <SimpleList items={allergies.map((allergy) => `${allergy.allergen_name} - ${allergy.severity}`)} />
          </Card>
          <Card>
            <h2 className="font-serif text-2xl font-semibold">{t('families.preferencesSummary')}</h2>
            <SimpleList items={preferences.map((pref) => `${pref.preference_type}: ${pref.item_name}`)} />
          </Card>
        </div>
      )}
      {tab === 'diners' && (
        <TableCard
          title={t('families.diners')}
          headers={[t('diners.fullName'), t('diners.activityLevel'), t('diners.portionFactor'), t('diners.calorieTarget'), t('common.status')]}
          rows={diners.map((diner) => [
            diner.full_name,
            diner.activity_level,
            diner.portion_factor,
            diner.daily_calorie_target ?? '-',
            diner.is_active ? t('common.active') : t('common.disabled'),
          ])}
        />
      )}
      {tab === 'menus' && (
        <Card>
          <h2 className="font-serif text-2xl font-semibold">{t('families.weeklyMenu')}</h2>
          <div className="mt-4 grid gap-3">
            {menuItems.length ? menuItems.map((item) => <MenuItemRow key={item.id} item={item} />) : <EmptyState text={t('empty.recipes')} />}
          </div>
        </Card>
      )}
      {tab === 'pantry' && (
        <TableCard
          title={t('nav.pantry')}
          headers={[t('common.ingredient'), t('common.available'), t('pantry.minimumAlert'), t('common.status')]}
          rows={pantry.map((item) => [
            data.ingredients.find((ingredient) => ingredient.id === item.ingredient_id)?.name || '',
            `${formatNumber(item.quantity_available)} ${item.unit}`,
            `${formatNumber(item.min_quantity_alert)} ${item.unit}`,
            item.quantity_available < item.min_quantity_alert ? t('pantry.lowStock') : t('common.safe'),
          ])}
        />
      )}
      {tab === 'freezer' && (
        <TableCard
          title={t('nav.freezer')}
          headers={[t('common.recipe'), t('freezer.portionsAvailable'), t('freezer.expirationDate'), t('freezer.gramsPerPortion')]}
          rows={freezer.map((item) => [
            data.recipes.find((recipe) => recipe.id === item.recipe_id)?.name || '',
            item.portions_available,
            safeDate(item.expiration_date),
            `${item.grams_per_portion ?? 0}g`,
          ])}
        />
      )}
      {tab === 'shopping' && (
        <TableCard
          title={t('nav.shoppingList')}
          headers={[t('common.status'), t('common.date'), t('common.actions')]}
          rows={shoppingLists.map((item) => [item.status, safeDate(item.created_at), item.name])}
        />
      )}
      {tab === 'alerts' && <AlertList alerts={alerts} />}
      {tab === 'reports' && <ReportsPage />}
      {canWrite && editing && (
        <FamilyFormDialog
          family={family}
          onClose={() => setEditing(false)}
          onSubmit={(values) => {
            updateFamily(family.id, values)
            setEditing(false)
          }}
        />
      )}
    </>
  )
}
