import type { TFunction } from 'i18next'
import type { AllergyStatus } from '../../../lib/types'

export function allergyStatusLabel(t: TFunction, status: AllergyStatus) {
  return t(status === 'review_needed' ? 'common.reviewNeeded' : `common.${status}`)
}

export function allergyRecommendation(t: TFunction, status: AllergyStatus) {
  if (status === 'blocked') return t('allergies.recommendations.blocked')
  if (status === 'review_needed') return t('allergies.recommendations.review')
  return t('allergies.recommendations.safe')
}

export function allergyReasonLabel(t: TFunction, reason: string) {
  const key = `allergies.reasons.${reason}`
  const translated = t(key)
  return translated === key ? reason.replaceAll('_', ' ') : translated
}
