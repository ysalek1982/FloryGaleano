import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { DinerFormDialog, type DinerExtras } from '../../features/diners/components/DinerFormDialog'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Info,
  PageHeader,
  ReadOnlyNotice,
} from '../../features/shared/chefUi'
import { useCanWrite } from '../../features/shared/chefHooks'
import { useAppData } from '../../lib/AppState'
import { validateRecipeForFamily } from '../../services/allergyShield'

export default function DinersPage() {
  const { t } = useTranslation()
  const { data, addDiner, updateDiner, addAllergy, addDietaryRestriction, addFoodPreference, setData } = useAppData()
  const canWrite = useCanWrite()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [familyFilter, setFamilyFilter] = useState('all')
  const editingDiner = data.familyMembers.find((diner) => diner.id === editing)
  const diners = data.familyMembers.filter((diner) => familyFilter === 'all' || diner.family_id === familyFilter)

  const saveExtras = (dinerId: string, extras: DinerExtras) => {
    if (extras.allergy_name) {
      addAllergy({
        family_member_id: dinerId,
        allergen_name: extras.allergy_name,
        severity: extras.allergy_severity,
        avoid_traces: extras.avoid_traces,
      })
    }
    if (extras.restriction_type) {
      addDietaryRestriction({
        family_member_id: dinerId,
        restriction_type: extras.restriction_type,
        description: extras.restriction_description,
        is_medical: extras.restriction_medical,
      })
    }
    if (extras.preference_item) {
      addFoodPreference({
        family_member_id: dinerId,
        preference_type: extras.preference_type,
        item_name: extras.preference_item,
        notes: extras.preference_notes,
      })
    }
  }

  return (
    <>
      <PageHeader
        title={t('diners.title')}
        subtitle={t('diners.subtitle')}
        action={
          canWrite ? (
            <Button onClick={() => setOpen(true)} data-testid="create-diner">
              <Plus className="h-4 w-4" />
              {t('diners.create')}
            </Button>
          ) : (
            <ReadOnlyNotice />
          )
        }
      />
      <div className="mb-4 max-w-sm">
        <Field label={t('common.family')}>
          <select className="input" value={familyFilter} onChange={(event) => setFamilyFilter(event.target.value)} data-testid="diner-family-filter">
            <option value="all">{t('common.all')}</option>
            {data.families.map((family) => (
              <option key={family.id} value={family.id}>{family.name}</option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {diners.map((diner) => {
          const safety = data.recipes.map((recipe) => validateRecipeForFamily(recipe, [diner], data.allergies, data.recipeIngredients, data.ingredients)[0])
          const extras =
            data.allergies.filter((item) => item.family_member_id === diner.id).length +
            data.foodPreferences.filter((item) => item.family_member_id === diner.id).length +
            data.dietaryRestrictions.filter((item) => item.family_member_id === diner.id).length
          return (
            <Card key={diner.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-serif text-2xl font-semibold">{diner.full_name}</h2>
                  <p className="text-sm text-slate-500">{diner.nickname || data.families.find((family) => family.id === diner.family_id)?.name}</p>
                </div>
                <Badge status={diner.is_active ? 'active' : 'warning'}>{diner.is_active ? t('common.active') : t('common.disabled')}</Badge>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3">
                <Info label={t('diners.activityLevel')} value={diner.activity_level} />
                <Info label={t('diners.portionFactor')} value={diner.portion_factor} />
                <Info label={t('diners.calorieTarget')} value={diner.daily_calorie_target ?? 0} />
                <Info label={t('diners.proteinTarget')} value={`${diner.daily_protein_target_g ?? 0}g`} />
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge status="safe">{t('diners.safeRecipes')}: {safety.filter((row) => row.status === 'safe').length}</Badge>
                <Badge status="blocked">{t('diners.blockedRecipes')}: {safety.filter((row) => row.status === 'blocked').length}</Badge>
                <Badge>{t('diners.preferences')}: {extras}</Badge>
              </div>
              {canWrite && (
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => setEditing(diner.id)}>{t('common.edit')}</Button>
                  <Button
                    variant="ghost"
                    onClick={() =>
                      setData((current) => ({
                        ...current,
                        familyMembers: current.familyMembers.map((item) =>
                          item.id === diner.id ? { ...item, is_active: !item.is_active, updated_at: new Date().toISOString() } : item,
                        ),
                      }))
                    }
                  >
                    {diner.is_active ? t('diners.deactivate') : t('diners.activate')}
                  </Button>
                </div>
              )}
            </Card>
          )
        })}
      </div>
      {diners.length === 0 && <EmptyState text={t('empty.diners')} />}
      {canWrite && open && (
        <DinerFormDialog
          onClose={() => setOpen(false)}
          onSubmit={(values, extras) => {
            const diner = addDiner(values)
            saveExtras(diner.id, extras)
            setOpen(false)
          }}
        />
      )}
      {canWrite && editingDiner && (
        <DinerFormDialog
          diner={editingDiner}
          onClose={() => setEditing(null)}
          onSubmit={(values, extras) => {
            updateDiner(editingDiner.id, values)
            saveExtras(editingDiner.id, extras)
            setEditing(null)
          }}
        />
      )}
    </>
  )
}
