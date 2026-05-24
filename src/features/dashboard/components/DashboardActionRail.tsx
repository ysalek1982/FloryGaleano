import {
  Apple,
  Brain,
  Calculator,
  CalendarDays,
  Plus,
  ShoppingCart,
  UserPlus,
  Utensils,
} from 'lucide-react'
import type React from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { Card, ReadOnlyNotice } from '../../shared/chefUi'
import { useCanWrite } from '../../shared/chefHooks'

export function DashboardActionRail() {
  const { t } = useTranslation()
  const canWrite = useCanWrite()
  const actions = [
    ['/app/families', 'dashboard.createFamily', Plus, true],
    ['/app/diners', 'dashboard.addDiner', UserPlus, true],
    ['/app/ingredients', 'dashboard.addIngredient', Apple, true],
    ['/app/recipes', 'dashboard.createRecipe', Utensils, true],
    ['/app/menu-planner', 'dashboard.planWeek', CalendarDays, true],
    ['/app/portion-calculator', 'dashboard.calculatePortions', Calculator, false],
    ['/app/shopping-list', 'dashboard.generateShoppingList', ShoppingCart, true],
    ['/app/ai-chef', 'dashboard.askAiChef', Brain, false],
  ] as const

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-serif text-2xl font-semibold">{t('dashboard.quickActions')}</h2>
        {!canWrite && <ReadOnlyNotice />}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3" data-testid="dashboard-action-rail">
        {actions.map(([href, key, Icon, requiresWrite]) => {
          const TypedIcon = Icon as React.ComponentType<{ className?: string }>
          const disabled = requiresWrite && !canWrite
          return (
            <Link
              key={key}
              to={disabled ? '/app/dashboard' : href}
              aria-disabled={disabled}
              className="rounded-md border border-stone-200 bg-stone-50 p-3 text-sm font-semibold text-slate-800 hover:bg-white focus-ring aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
            >
              <TypedIcon className="mb-2 h-4 w-4 text-forest-700" />
              {t(key)}
            </Link>
          )
        })}
      </div>
    </Card>
  )
}
