import { useTranslation } from 'react-i18next'

import type { Allergy } from '../../../lib/types'
import { Badge, Button, EmptyState, ResponsiveTable } from '../../shared/chefUi'

export function AllergyList({
  allergies,
  dinerName,
  canWrite,
  onEdit,
}: {
  allergies: Allergy[]
  dinerName: (dinerId: string) => string
  canWrite: boolean
  onEdit: (allergy: Allergy) => void
}) {
  const { t } = useTranslation()
  if (allergies.length === 0) return <EmptyState text={t('allergies.noAllergies')} />
  return (
    <ResponsiveTable
      headers={[t('common.diner'), t('common.ingredient'), t('allergies.severity'), t('allergies.avoidTraces'), t('allergies.crossContactRisk'), t('common.actions')]}
      rows={allergies.map((allergy) => [
        dinerName(allergy.family_member_id),
        allergy.allergen_name,
        <Badge key="severity" status={allergy.severity === 'mild' ? 'warning' : 'blocked'}>{t(`allergies.${allergy.severity}`)}</Badge>,
        allergy.avoid_traces ? t('common.enabled') : t('common.disabled'),
        allergy.cross_contact_risk ? t('common.enabled') : t('common.disabled'),
        canWrite ? <Button key="edit" variant="secondary" onClick={() => onEdit(allergy)}>{t('common.edit')}</Button> : '-',
      ])}
    />
  )
}
