import { describe, expect, it } from 'vitest'

import { foodCategories } from '../lib/demoData'
import { categorySearchText, mapUnknownCategory } from '../features/food-categories/utils/categoryFormatters'

describe('food categories', () => {
  it('searches categories in English and Spanish aliases', () => {
    const protein = foodCategories.find((category) => category.code === 'proteins')
    expect(protein).toBeTruthy()
    expect(categorySearchText(protein!, 'en')).toContain('beef')
    expect(categorySearchText(protein!, 'es')).toContain('pollo')
    const fats = foodCategories.find((category) => category.code === 'fats_oils')
    expect(fats).toBeTruthy()
    expect(categorySearchText(fats!, 'es')).toContain('aceite')
  })

  it('maps unknown category suggestions to predefined categories or other', () => {
    expect(mapUnknownCategory(foodCategories, 'proteína')?.code).toBe('proteins')
    expect(mapUnknownCategory(foodCategories, 'aceite')?.code).toBe('fats_oils')
    expect(mapUnknownCategory(foodCategories, 'mystery category')?.code).toBe('other')
  })
})
