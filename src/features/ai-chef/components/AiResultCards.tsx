import { useTranslation } from 'react-i18next'

import { Badge, Button, Card, EmptyState, ResponsiveTable, SkeletonBlock } from '../../shared/chefUi'

export default function AiResultCards({
  loading,
  message,
  suggestions,
  result,
  canWrite,
  onApply,
}: {
  loading: boolean
  message: string
  suggestions: Array<Record<string, unknown>>
  result: Record<string, unknown> | null
  canWrite: boolean
  onApply: (suggestion: Record<string, unknown>) => void
}) {
  const { t } = useTranslation()
  const validationSummary = result?.validation_summary as Record<string, unknown> | undefined
  const missingIngredients = toRows(result?.missing_ingredients)
  const expiringItems = toRows(result?.expiring_items)
  const freezerFirstCandidates = toRows(result?.freezer_first_candidates)
  const purchasePriority = toRows(result?.purchase_priority)
  const menuPlan = result?.menu_plan as Record<string, unknown> | undefined
  const warnings = Array.isArray(validationSummary?.warnings) ? validationSummary.warnings.map(String) : []
  const reasons = Array.isArray(validationSummary?.reasons) ? validationSummary.reasons.map(String) : []
  return (
    <Card>
      <h2 className="font-serif text-2xl font-semibold">{t('ai.safetyResult')}</h2>
      {loading && <SkeletonBlock />}
      {message && <p className="mt-3 rounded-md bg-stone-50 p-3 text-sm text-slate-700">{message}</p>}
      {result?.code === 'gemini_rate_limited' && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" data-testid="ai-rate-limited-result">
          <p className="font-semibold">{String(result.message || t('settings.geminiQuotaTitle'))}</p>
          <p className="mt-1">{String(result.suggested_action || t('settings.geminiQuotaBody'))}</p>
        </div>
      )}
      {menuPlan && <MenuPlanGrid menuPlan={menuPlan} />}
      <div className="mt-4 grid gap-3">
        {suggestions.length === 0 && !loading ? <EmptyState text={t('common.empty')} /> : suggestions.map((suggestion, index) => (
          <SuggestionCard key={index} suggestion={suggestion} canWrite={canWrite} onApply={onApply} />
        ))}
      </div>
      {result && (
        <div className="mt-5 grid gap-4" data-testid="ai-inventory-validation">
          <div className="rounded-md border border-stone-200 bg-stone-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">{t('ai.inventoryValidation')}</h3>
              <Badge status={String(validationSummary?.status || 'review_needed')}>{String(validationSummary?.status || 'review_needed')}</Badge>
            </div>
            {reasons.length > 0 && <p className="mt-2 text-sm text-slate-600">{reasons.join(' ')}</p>}
            {warnings.length > 0 && <p className="mt-2 text-sm text-amber-700">{warnings.join(' ')}</p>}
          </div>
          <InventoryRows title={t('ai.missingIngredients')} rows={missingIngredients} />
          <InventoryRows title={t('ai.expiringItems')} rows={expiringItems} />
          <InventoryRows title={t('ai.freezerFirstCandidates')} rows={freezerFirstCandidates} />
          <InventoryRows title={t('ai.purchasePriority')} rows={purchasePriority} />
        </div>
      )}
      <h3 className="mt-5 font-semibold">{t('ai.structuredJson')}</h3>
      <pre className="mt-3 max-h-72 overflow-auto rounded-md bg-stone-50 p-4 text-xs text-slate-700">{JSON.stringify(result, null, 2)}</pre>
    </Card>
  )
}

function MenuPlanGrid({ menuPlan }: { menuPlan: Record<string, unknown> }) {
  const { t } = useTranslation()
  const days = toRows(menuPlan.days)
  return (
    <div className="mt-4 rounded-lg border border-stone-200 bg-stone-50 p-4" data-testid="ai-menu-plan-grid">
      <h3 className="font-semibold">{String(menuPlan.title || t('planner.weeklyView'))}</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {days.map((day, dayIndex) => (
          <div key={`${day.date}-${dayIndex}`} className="rounded-md border border-stone-200 bg-white p-3">
            <p className="font-semibold">{String(day.date || '')}</p>
            <div className="mt-2 space-y-2">
              {toRows(day.meals).map((meal, mealIndex) => (
                <div key={`${meal.meal_time}-${mealIndex}`} className="rounded-md bg-stone-50 p-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{String(meal.meal_time || '')}: {String(meal.recipe_name || '')}</span>
                    <Badge status={String(meal.status || 'review_needed')}>{String(meal.status || 'review_needed')}</Badge>
                  </div>
                  {Array.isArray(meal.warnings) && meal.warnings.length > 0 && (
                    <p className="mt-1 text-amber-700">{meal.warnings.map(String).join(' ')}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SuggestionCard({
  suggestion,
  canWrite,
  onApply,
}: {
  suggestion: Record<string, unknown>
  canWrite: boolean
  onApply: (suggestion: Record<string, unknown>) => void
}) {
  const { t } = useTranslation()
  const safetyNotes = Array.isArray(suggestion.safety_notes) ? suggestion.safety_notes.map(String) : []
  return (
    <div className="rounded-md border border-stone-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{String(suggestion.title || t('nav.aiChef'))}</h3>
                <p className="mt-1 text-sm text-slate-600">{Array.isArray(suggestion.ingredients) ? suggestion.ingredients.join(', ') : ''}</p>
              </div>
              <Badge status={String(suggestion.safety_status)}>{String(suggestion.safety_status || 'review_needed')}</Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge status={String(suggestion.rotation_status)}>{t('ai.rotationValidation')}: {String(suggestion.rotation_status || '-')}</Badge>
              <Badge status={String(suggestion.nutrition_status)}>{t('ai.nutritionValidation')}: {String(suggestion.nutrition_status || '-')}</Badge>
              <Badge status={String(suggestion.safety_status)}>{t('ai.allergyValidation')}: {String(suggestion.safety_status || '-')}</Badge>
              {Boolean(suggestion.inventory_status) && <Badge status={String(suggestion.inventory_status)}>{t('ai.inventoryValidation')}: {String(suggestion.inventory_status)}</Badge>}
              {Boolean(suggestion.category_code) && <Badge>{t('foodCategories.searchLabel')}: {String(suggestion.category_code)}</Badge>}
            </div>
            {safetyNotes.length > 0 && (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
                {safetyNotes.map((note, noteIndex) => <li key={`${note}-${noteIndex}`}>{note}</li>)}
              </ul>
            )}
            <Button className="mt-4" variant="secondary" disabled={!canWrite || (suggestion.safety_status !== 'safe' && suggestion.usable !== true)} onClick={() => onApply(suggestion)}>
              {canWrite ? t('ai.applySuggestion') : t('roles.readOnly')}
            </Button>
    </div>
  )
}

function InventoryRows({ title, rows }: { title: string; rows: Array<Record<string, unknown>> }) {
  const { t } = useTranslation()
  if (rows.length === 0) return null
  const headers = Array.from(rows.reduce<Set<string>>((set, row) => {
    Object.keys(row).slice(0, 5).forEach((key) => set.add(key))
    return set
  }, new Set()))
  return (
    <div>
      <h3 className="mb-2 font-semibold">{title}</h3>
      <ResponsiveTable
        headers={headers.map((header) => t(`ai.validationFields.${header}`))}
        rows={rows.slice(0, 5).map((row) => headers.map((header) => String(row[header] ?? '')))}
      />
    </div>
  )
}

function toRows(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object') : []
}
