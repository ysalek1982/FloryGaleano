import { useTranslation } from 'react-i18next'

import { Card, SimpleList } from '../../shared/chefUi'

export function AllergyRulesSummary() {
  const { t } = useTranslation()
  const rules = t('allergies.sorenRules', { returnObjects: true }) as string[]
  return (
    <Card>
      <h2 className="font-serif text-2xl font-semibold">{t('allergies.rulesSummary')}</h2>
      <div className="mt-4">
        <SimpleList items={rules} />
      </div>
    </Card>
  )
}
