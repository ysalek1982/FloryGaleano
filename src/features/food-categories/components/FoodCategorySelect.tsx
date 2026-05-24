import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { FoodCategory } from '../../../lib/types'
import { Button, EmptyState } from '../../shared/chefUi'
import { useFoodCategories } from '../hooks/useFoodCategories'
import { categoryName } from '../utils/categoryFormatters'

export function FoodCategorySelect({
  value,
  onChange,
}: {
  value?: string
  onChange: (category: FoodCategory) => void
}) {
  const { t, i18n } = useTranslation()
  const [query, setQuery] = useState('')
  const { filtered, categories } = useFoodCategories(query)
  const selected = useMemo(() => categories.find((category) => category.id === value || category.code === value), [categories, value])

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-3" data-testid="food-category-select">
      <label className="grid gap-1.5">
        <span className="label">{t('foodCategories.searchLabel')}</span>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            className="input pl-9"
            placeholder={t('foodCategories.searchPlaceholder')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            data-testid="food-category-search"
          />
        </div>
      </label>
      {selected && (
        <p className="mt-2 text-xs font-semibold text-forest-700" data-testid="food-category-selected">
          {t('foodCategories.selected')}: {categoryName(selected, i18n.language)}
        </p>
      )}
      <div className="mt-3 grid max-h-56 gap-2 overflow-auto pr-1">
        {filtered.map((category) => (
          <Button
            key={category.id}
            type="button"
            variant={selected?.id === category.id ? 'primary' : 'secondary'}
            className="justify-between text-left"
            onClick={() => {
              onChange(category)
              setQuery('')
            }}
            data-testid={`food-category-option-${category.code}`}
          >
            <span>{categoryName(category, i18n.language)}</span>
            <span className="text-xs opacity-70">{category.code}</span>
          </Button>
        ))}
        {filtered.length === 0 && <EmptyState text={t('foodCategories.empty')} />}
      </div>
    </div>
  )
}
