import { useTranslation } from 'react-i18next'

import { Button, Card, EmptyState, SimpleList } from '../../shared/chefUi'
import type { FreezerFirstSuggestion } from '../utils/inventoryForecastEngine'

export function FreezerFirstSuggestions({
  suggestions,
  onApply,
}: {
  suggestions: FreezerFirstSuggestion[]
  onApply?: (suggestion: FreezerFirstSuggestion) => void
}) {
  const { t } = useTranslation()
  return (
    <Card data-testid="freezer-first-panel">
      <h2 className="font-serif text-2xl font-semibold">{t('forecast.freezerFirst')}</h2>
      <p className="mt-2 text-sm text-slate-600">{t('forecast.freezerFirstBody')}</p>
      <div className="mt-4">
        {suggestions.length ? (
          <div className="grid gap-3">
            <SimpleList items={suggestions.slice(0, 5).map((suggestion) => `${suggestion.recipe?.name || t('common.recipe')} - ${t(`forecast.reasons.${suggestion.reason}`)}`)} />
            {onApply && suggestions[0] && (
              <Button variant="secondary" disabled={!suggestions[0].safeToApply} onClick={() => onApply(suggestions[0])} data-testid="apply-freezer-first">
                {t('forecast.applyFreezerFirst')}
              </Button>
            )}
          </div>
        ) : (
          <EmptyState text={t('forecast.noFreezerFirst')} />
        )}
      </div>
    </Card>
  )
}
