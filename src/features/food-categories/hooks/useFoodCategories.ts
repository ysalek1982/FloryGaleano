import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { useAppData } from '../../../lib/AppState'
import type { FoodCategory } from '../../../lib/types'
import { categoryName, categorySearchText, findCategoryByCodeOrId } from '../utils/categoryFormatters'

export function useFoodCategories(query = '') {
  const { i18n } = useTranslation()
  const { data } = useAppData()
  const categories = useMemo(
    () => [...data.foodCategories].filter((category) => category.is_active).sort((a, b) => a.sort_order - b.sort_order),
    [data.foodCategories],
  )
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return categories
    return categories.filter((category) => categorySearchText(category, i18n.language).includes(normalized))
  }, [categories, i18n.language, query])

  return {
    categories,
    filtered,
    getName: (category: FoodCategory | undefined) => categoryName(category, i18n.language),
    findByIdOrCode: (value?: string) => findCategoryByCodeOrId(categories, value),
  }
}
