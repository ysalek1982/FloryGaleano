import { useTranslation } from 'react-i18next'

import { Card } from '../../shared/chefUi'
import type { Allergy, Family, FamilyMember } from '../../../lib/types'

export default function AiContextPanel({
  family,
  diners,
  allergies,
  rotationDays,
  language,
}: {
  family?: Family
  diners: FamilyMember[]
  allergies: Allergy[]
  rotationDays: number
  language: string
}) {
  const { t } = useTranslation()
  return (
    <Card>
      <h2 className="font-serif text-2xl font-semibold">{t('ai.contextPreview')}</h2>
      <pre className="mt-4 max-h-72 overflow-auto rounded-md bg-slate-950 p-4 text-xs text-stone-100">{JSON.stringify({ family: family?.name, diners: diners.map((diner) => diner.full_name), allergies: allergies.map((allergy) => allergy.allergen_name), rotationDays, language }, null, 2)}</pre>
    </Card>
  )
}
