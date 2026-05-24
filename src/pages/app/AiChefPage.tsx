import { Brain, Settings } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import AiContextPanel from '../../features/ai-chef/components/AiContextPanel'
import AiResultCards from '../../features/ai-chef/components/AiResultCards'
import { Badge, Button, Card, Field, PageHeader } from '../../features/shared/chefUi'
import { useCanWrite } from '../../features/shared/chefHooks'
import { useAiConnectionTest } from '../../features/settings/hooks/useAiConnectionTest'
import { useAppData } from '../../lib/AppState'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import { todayIso } from '../../lib/utils'

export default function AiChefPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { data, addRecipe, addMenuPlanItem } = useAppData()
  const canWrite = useCanWrite()
  const aiStatus = useAiConnectionTest()
  const [familyId, setFamilyId] = useState(data.families[0]?.id || '')
  const [dinerId, setDinerId] = useState('all')
  const [plannedDate, setPlannedDate] = useState(todayIso())
  const [prompt, setPrompt] = useState('')
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const family = data.families.find((item) => item.id === familyId)
  const diners = data.familyMembers.filter((item) => item.family_id === familyId && (dinerId === 'all' || item.id === dinerId))
  const actions = Object.entries(t('ai.actions', { returnObjects: true }) as Record<string, string>)
  const suggestions = Array.isArray(result?.suggestions) ? result.suggestions as Array<Record<string, unknown>> : []
  const inventoryActionAliases: Record<string, string> = {
    pantryMeals: 'pantry_aware_meals',
    freezerFirst: 'freezer_first_meals',
    wasteReduction: 'reduce_waste_menu',
    purchasePriority: 'purchase_priority',
    explainMissing: 'explain_missing_items',
  }

  const runAction = async (actionKey: string) => {
    setLoading(true)
    setMessage('')
    try {
      if (isSupabaseConfigured && supabase) {
        const { data: response, error } = await supabase.functions.invoke('ai-chef', { body: { action: inventoryActionAliases[actionKey] || actionKey, requested_action: actionKey, family_id: familyId, prompt, language: i18n.language, planned_date: plannedDate } })
        if (error) throw error
        setResult(response as Record<string, unknown>)
      } else {
        setResult({ configured: false, action: actionKey, suggestions: [{ title: t('ai.localSuggestion'), ingredients: ['rice', 'chicken'], safety_status: 'safe', usable: true, nutrition_status: 'available', rotation_status: 'allowed', nutrition: { calories: 420, protein_g: 32 } }] })
      }
    } catch {
      setMessage(t('settings.connectionFailure'))
    } finally {
      setLoading(false)
    }
  }

  const applySuggestion = (suggestion: Record<string, unknown>) => {
    if (!canWrite) return
    if (suggestion.safety_status !== 'safe' && suggestion.usable !== true) return
    const title = String(suggestion.title || t('recipes.create'))
    const recipeId = typeof suggestion.recipe_id === 'string' && data.recipes.some((recipe) => recipe.id === suggestion.recipe_id)
      ? suggestion.recipe_id
      : addRecipe({ name: title, family_id: familyId, ai_generated: true, status: 'draft', servings: 4, instructions: Array.isArray(suggestion.instructions) ? suggestion.instructions.join('\n') : '' }, [{ ingredient_id: data.ingredients[0]?.id, quantity_g: 100 }]).id
    const plan = data.menuPlans.find((item) => item.family_id === familyId)
    if (plan) addMenuPlanItem({ menu_plan_id: plan.id, recipe_id: recipeId, planned_date: plannedDate, meal_time: 'dinner', allergy_status: 'safe', variety_status: 'allowed', ai_generated: true })
    setMessage(t('ai.appliedSuggestion'))
  }

  return (
    <>
      <PageHeader title={t('ai.title')} subtitle={t('ai.subtitle')} />
      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          {!aiStatus.status.configured && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4" data-testid="ai-key-setup-card">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-serif text-xl font-semibold">{t('ai.keySetupTitle')}</h2>
                <Badge status="warning">{t(`settings.aiKeyStatus.${aiStatus.status.key_status}`)}</Badge>
              </div>
              <p className="mt-2 text-sm text-amber-900">{t('ai.keySetupBody')}</p>
              <Button className="mt-3" variant="ai" onClick={() => navigate('/app/settings')} data-testid="ai-go-settings">
                <Settings className="h-4 w-4" />
                {t('ai.goToSettings')}
              </Button>
            </div>
          )}
          {aiStatus.status.configured && (
            <p className="mb-4 rounded-lg border border-forest-100 bg-forest-50 p-3 text-sm font-semibold text-forest-800" data-testid="ai-key-source">
              {t('ai.usingUserGeminiKey')}
            </p>
          )}
          <div className="grid gap-4">
            <Field label={t('common.family')}><select className="input" value={familyId} onChange={(event) => setFamilyId(event.target.value)}>{data.families.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
            <Field label={t('common.diner')}><select className="input" value={dinerId} onChange={(event) => setDinerId(event.target.value)}><option value="all">{t('planner.assignAll')}</option>{data.familyMembers.filter((item) => item.family_id === familyId).map((item) => <option key={item.id} value={item.id}>{item.full_name}</option>)}</select></Field>
            <Field label={t('common.date')}><input className="input" type="date" value={plannedDate} onChange={(event) => setPlannedDate(event.target.value)} /></Field>
            <textarea className="input min-h-32" placeholder={t('ai.chatPlaceholder')} value={prompt} onChange={(event) => setPrompt(event.target.value)} />
          </div>
          <div className="mt-4 grid gap-2">
            {actions.map(([key, label]) => <Button key={key} variant="ai" disabled={loading || !aiStatus.status.configured} onClick={() => runAction(key)} data-testid={`ai-action-${key}`}><Brain className="h-4 w-4" />{label}</Button>)}
          </div>
        </Card>
        <div className="grid gap-5">
          <AiContextPanel family={family} diners={diners} allergies={data.allergies} rotationDays={data.settings.default_variety_days} language={i18n.language} />
          <AiResultCards loading={loading} message={message} suggestions={suggestions} result={result} canWrite={canWrite} onApply={applySuggestion} />
        </div>
      </div>
    </>
  )
}
