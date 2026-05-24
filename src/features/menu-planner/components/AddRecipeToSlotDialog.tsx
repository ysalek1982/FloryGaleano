import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button, Dialog, Field, Info } from '../../shared/chefUi'
import { useAppData } from '../../../lib/AppState'
import type { MealTime } from '../../../lib/types'
import { safeDate } from '../../../lib/utils'

export default function AddRecipeToSlotDialog({
  familyId,
  slot,
  plan,
  onClose,
  onSubmit,
}: {
  familyId: string
  slot: { date: string; mealTime: MealTime }
  plan?: { id: string }
  onClose: () => void
  onSubmit: (values: { recipeId: string; dinerId: string; overrideReason?: string }) => void
}) {
  const { t } = useTranslation()
  const { data } = useAppData()
  const [recipeId, setRecipeId] = useState(data.recipes.find((recipe) => recipe.status === 'active')?.id || data.recipes[0]?.id || '')
  const [dinerId, setDinerId] = useState('all')
  const [overrideReason, setOverrideReason] = useState('')
  const diners = data.familyMembers.filter((diner) => diner.family_id === familyId && diner.is_active)
  void plan
  return (
    <Dialog title={t('planner.addRecipe')} onClose={onClose}>
      <form className="grid gap-4" data-testid="menu-slot-form" onSubmit={(event) => { event.preventDefault(); onSubmit({ recipeId, dinerId, overrideReason }) }}>
        <Info label={t('common.date')} value={safeDate(slot.date)} />
        <Info label={t('common.meal')} value={t(`planner.${slot.mealTime}`)} />
        <Field label={t('common.recipe')}>
          <select className="input" value={recipeId} onChange={(event) => setRecipeId(event.target.value)}>
            {data.recipes.filter((recipe) => recipe.status === 'active').map((recipe) => <option key={recipe.id} value={recipe.id}>{recipe.name}</option>)}
          </select>
        </Field>
        <Field label={t('common.diner')}>
          <select className="input" value={dinerId} onChange={(event) => setDinerId(event.target.value)}>
            <option value="all">{t('planner.assignAll')}</option>
            {diners.map((diner) => <option key={diner.id} value={diner.id}>{diner.full_name}</option>)}
          </select>
        </Field>
        <Field label={t('validation.overrideRequired')}><textarea className="input min-h-20" value={overrideReason} onChange={(event) => setOverrideReason(event.target.value)} /></Field>
        <Button type="submit">{t('common.save')}</Button>
      </form>
    </Dialog>
  )
}
