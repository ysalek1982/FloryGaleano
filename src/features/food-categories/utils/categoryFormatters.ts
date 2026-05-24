import type { FoodCategory } from '../../../lib/types'

export function categoryName(category: FoodCategory | undefined, language: string) {
  if (!category) return ''
  return language.startsWith('es') ? category.name_es : category.name_en
}

export function categorySearchText(category: FoodCategory, language: string) {
  const localized = language.startsWith('es')
    ? [category.name_es, ...category.aliases_es, category.name_en, ...category.aliases_en]
    : [category.name_en, ...category.aliases_en, category.name_es, ...category.aliases_es]
  return [category.code, ...localized].join(' ').toLowerCase()
}

export function findCategoryByCodeOrId(categories: FoodCategory[], value?: string) {
  if (!value) return undefined
  return categories.find((category) => category.id === value || category.code === value)
}

export function mapUnknownCategory(categories: FoodCategory[], value: string) {
  const query = value.toLowerCase()
  return categories.find((category) => categorySearchText(category, 'en').includes(query))
    || categories.find((category) => categorySearchText(category, 'es').includes(query))
    || categories.find((category) => category.code === 'other')
}
