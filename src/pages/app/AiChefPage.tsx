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
  const { data, addMenuPlanItem } = useAppData()
  const canWrite = useCanWrite()
  const aiStatus = useAiConnectionTest()
  const [familyId, setFamilyId] = useState(data.families[0]?.id || '')
  const [dinerId, setDinerId] = useState('all')
  const [plannedDate, setPlannedDate] = useState(todayIso())
  const [prompt, setPrompt] = useState('')
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState('menu')
  const family = data.families.find((item) => item.id === familyId)
  const diners = data.familyMembers.filter((item) => item.family_id === familyId && (dinerId === 'all' || item.id === dinerId))
  const actions = Object.entries(t('ai.actions', { returnObjects: true }) as Record<string, string>)
  const actionsByKey = Object.fromEntries(actions)
  const suggestions = Array.isArray(result?.suggestions) ? result.suggestions as Array<Record<string, unknown>> : []
  const actionTabs = [
    { key: 'menu', label: t('ai.tabs.menuPlanning'), description: t('ai.tabDescriptions.menu'), recommended: t('ai.recommendedActions.menu'), actions: ['weeklyMenu', 'completeSlots', 'repairMenuPlan', 'variety', 'wasteReduction'] },
    { key: 'recipe', label: t('ai.tabs.recipeHelp'), description: t('ai.tabDescriptions.recipe'), recommended: t('ai.recommendedActions.recipe'), actions: ['safeRecipe', 'substitutions', 'schoolMenu', 'translate'] },
    { key: 'inventory', label: t('ai.tabs.inventoryHelp'), description: t('ai.tabDescriptions.inventory'), recommended: t('ai.recommendedActions.inventory'), actions: ['pantryMeals', 'freezerFirst', 'purchasePriority', 'explainMissing', 'shoppingList', 'freezerUsage'] },
    { key: 'safety', label: t('ai.tabs.allergyNutrition'), description: t('ai.tabDescriptions.safety'), recommended: t('ai.recommendedActions.safety'), actions: ['dailyMenu', 'productionPlan'] },
    { key: 'custom', label: t('ai.tabs.customRequest'), description: t('ai.tabDescriptions.custom'), recommended: t('ai.recommendedActions.custom'), actions: actions.map(([key]) => key) },
  ]
  const activeTabConfig = actionTabs.find((tab) => tab.key === activeTab) || actionTabs[0]
  const activeActionKeys = activeTabConfig.actions
  const inventoryActionAliases: Record<string, string> = {
    pantryMeals: 'pantry_aware_meals',
    freezerFirst: 'freezer_first_meals',
    wasteReduction: 'reduce_waste_menu',
    purchasePriority: 'purchase_priority',
    explainMissing: 'explain_missing_items',
    repairMenuPlan: 'repair_menu_plan',
  }
  const keyNeedsSetup = !aiStatus.status.configured && ['not_configured', 'deleted'].includes(aiStatus.status.key_status)
  const keyNeedsRepair = !aiStatus.status.configured && ['invalid', 'test_failed'].includes(aiStatus.status.key_status)
  const keyRateLimited = aiStatus.status.key_status === 'rate_limited'
  const canRunAiActions = aiStatus.status.configured && !keyRateLimited

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
    const recipeId = typeof suggestion.recipe_id === 'string' && data.recipes.some((recipe) => recipe.id === suggestion.recipe_id)
      ? suggestion.recipe_id
      : null
    if (!recipeId) {
      setMessage(t('ai.reviewNeededStructuredData'))
      return
    }
    const plan = data.menuPlans.find((item) => item.family_id === familyId)
    if (plan) addMenuPlanItem({ menu_plan_id: plan.id, recipe_id: recipeId, planned_date: plannedDate, meal_time: 'dinner', allergy_status: 'safe', variety_status: 'allowed', ai_generated: true })
    setMessage(t('ai.appliedSuggestion'))
  }

  return (
    <>
      <PageHeader title={t('ai.title')} subtitle={t('ai.subtitle')} />
      <div className="mb-5 rounded-lg border border-stone-200 bg-white p-4 shadow-panel" data-testid="ai-workspace-status">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ai-700">{t('ai.modelStatus')}</p>
            <p className="mt-1 text-sm text-slate-600">
              {aiStatus.status.configured ? t('ai.usingUserGeminiKey') : t(`settings.aiKeyStatus.${aiStatus.status.key_status}`)}
              {' · '}
              {aiStatus.status.model || 'gemini-2.5-flash'}
            </p>
          </div>
          <Badge status={aiStatus.status.configured ? 'safe' : keyRateLimited ? 'warning' : 'review_needed'}>
            {t(`settings.aiKeyStatus.${aiStatus.status.key_status}`)}
          </Badge>
        </div>
      </div>
      <div className="mb-5 grid gap-2 rounded-lg border border-ai-100 bg-ai-50 p-2 md:grid-cols-5" data-testid="ai-workspace-tabs">
        {actionTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`rounded-md px-3 py-2 text-sm font-semibold focus-ring ${activeTab === tab.key ? 'bg-white text-ai-800 shadow-panel' : 'text-ai-700 hover:bg-white/70'}`}
            onClick={() => setActiveTab(tab.key)}
            data-testid={`ai-tab-${tab.key}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[0.75fr_1fr_1fr]">
        <Card>
          <div className="mb-4 rounded-lg border border-stone-200 bg-stone-50 p-4" data-testid="ai-tab-guidance">
            <h2 className="font-serif text-xl font-semibold">{activeTabConfig.label}</h2>
            <p className="mt-1 text-sm text-slate-600">{activeTabConfig.description}</p>
            <p className="mt-2 text-sm font-semibold text-ai-800">{t('ai.recommendedFirstAction')}: {activeTabConfig.recommended}</p>
          </div>
          {keyNeedsSetup && (
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
          {keyNeedsRepair && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4" data-testid="ai-key-invalid-card">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-serif text-xl font-semibold">{t('ai.keyInvalidTitle')}</h2>
                <Badge status="blocked">{t(`settings.aiKeyStatus.${aiStatus.status.key_status}`)}</Badge>
              </div>
              <p className="mt-2 text-sm text-red-900">{t('ai.keyInvalidBody')}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => void aiStatus.testConnection(undefined, aiStatus.status.model)} disabled={aiStatus.testing} data-testid="ai-test-again">
                  {aiStatus.testing ? t('common.loading') : t('settings.testAgain')}
                </Button>
                <Button variant="ai" onClick={() => navigate('/app/settings')} data-testid="ai-replace-key">
                  <Settings className="h-4 w-4" />
                  {t('settings.replaceKey')}
                </Button>
              </div>
            </div>
          )}
          {keyRateLimited && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4" data-testid="ai-key-rate-limited-card">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-serif text-xl font-semibold">{t('ai.keyRateLimitedTitle')}</h2>
                <Badge status="warning">{t('settings.aiKeyStatus.rate_limited')}</Badge>
              </div>
              <p className="mt-2 text-sm text-amber-900">{t('ai.keyRateLimitedBody')}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => void aiStatus.testConnection(undefined, aiStatus.status.model)} disabled={aiStatus.testing} data-testid="ai-test-rate-limited">
                  {aiStatus.testing ? t('common.loading') : t('settings.testAgain')}
                </Button>
                <Button variant="ai" onClick={() => navigate('/app/settings')} data-testid="ai-change-model">
                  <Settings className="h-4 w-4" />
                  {t('settings.changeModel')}
                </Button>
              </div>
            </div>
          )}
          {aiStatus.status.configured && (
            <p className="mb-4 rounded-lg border border-forest-100 bg-forest-50 p-3 text-sm font-semibold text-forest-800" data-testid="ai-key-source">
              {t('ai.usingUserGeminiKey')} - {aiStatus.status.model}
            </p>
          )}
          <div className="grid gap-4">
            <Field label={t('common.family')}><select className="input" value={familyId} onChange={(event) => setFamilyId(event.target.value)}>{data.families.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
            <Field label={t('common.diner')}><select className="input" value={dinerId} onChange={(event) => setDinerId(event.target.value)}><option value="all">{t('planner.assignAll')}</option>{data.familyMembers.filter((item) => item.family_id === familyId).map((item) => <option key={item.id} value={item.id}>{item.full_name}</option>)}</select></Field>
            <Field label={t('common.date')}><input className="input" type="date" value={plannedDate} onChange={(event) => setPlannedDate(event.target.value)} /></Field>
            <textarea className="input min-h-32" placeholder={t('ai.chatPlaceholder')} value={prompt} onChange={(event) => setPrompt(event.target.value)} />
          </div>
          <div className="mt-4 grid gap-2">
            <h2 className="font-serif text-xl font-semibold">{t('ai.actionTemplates')}</h2>
            {activeActionKeys.filter((key) => actionsByKey[key]).map((key) => (
              <Button key={key} variant="ai" disabled={loading || !canRunAiActions} onClick={() => runAction(key)} data-testid={`ai-template-action-${key}`}>
                <Brain className="h-4 w-4" />
                {actionsByKey[key]}
              </Button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2 rounded-md border border-stone-200 bg-stone-50 p-3" aria-label={t('ai.quickShortcuts')}>
            {actions.map(([key, label]) => (
              <button
                key={key}
                type="button"
                className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:border-ai-300 hover:text-ai-700 focus-ring disabled:opacity-50"
                disabled={loading || !canRunAiActions}
                onClick={() => runAction(key)}
                data-testid={`ai-action-${key}`}
              >
                {label}
              </button>
            ))}
          </div>
        </Card>
        <div className="grid gap-5">
          <AiContextPanel family={family} diners={diners} allergies={data.allergies} rotationDays={data.settings.default_variety_days} language={i18n.language} />
        </div>
        <div className="grid gap-5">
          <AiResultCards loading={loading} message={message} suggestions={suggestions} result={result} canWrite={canWrite} onApply={applySuggestion} />
        </div>
      </div>
    </>
  )
}
