import { describe, expect, it } from 'vitest'
import i18n from '../i18n/config'
import en from '../i18n/locales/en.json'
import es from '../i18n/locales/es.json'

describe('i18n', () => {
  it('loads English by default and switches to Spanish', async () => {
    await i18n.changeLanguage('en')
    expect(i18n.t('nav.families')).toBe('Families')

    await i18n.changeLanguage('es')
    expect(i18n.t('nav.families')).toBe('Familias')
    expect(i18n.t('nav.aiChef')).toBe('Chef IA')
  })

  it('contains translated major navigation labels', () => {
    const required = [
      'dashboard',
      'families',
      'diners',
      'ingredients',
      'recipes',
      'menuPlanner',
      'shoppingList',
      'allergies',
      'aiChef',
      'settings',
    ]

    for (const key of required) {
      expect(en.nav[key as keyof typeof en.nav]).toBeTruthy()
      expect(es.nav[key as keyof typeof es.nav]).toBeTruthy()
      expect(en.nav[key as keyof typeof en.nav]).not.toBe(es.nav[key as keyof typeof es.nav])
    }
  })
})
