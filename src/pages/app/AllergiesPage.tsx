import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import AiCopilotButton from '../../features/ai-copilot/components/AiCopilotButton'
import { AllergyFormDialog } from '../../features/allergies/components/AllergyFormDialog'
import { AllergyList } from '../../features/allergies/components/AllergyList'
import { AllergyRulesSummary } from '../../features/allergies/components/AllergyRulesSummary'
import { AllergyTester } from '../../features/allergies/components/AllergyTester'
import { CrossContactWarningPanel } from '../../features/allergies/components/CrossContactWarningPanel'
import { FamilyAllergyMatrix } from '../../features/allergies/components/FamilyAllergyMatrix'
import { RecipeAllergyTester } from '../../features/allergies/components/RecipeAllergyTester'
import { useAllergyTester } from '../../features/allergies/hooks/useAllergyTester'
import {
  Button,
  Card,
  Field,
  PageHeader,
  ReadOnlyNotice,
} from '../../features/shared/chefUi'
import { useCanWrite } from '../../features/shared/chefHooks'
import { useAppData } from '../../lib/AppState'
import type { Allergy } from '../../lib/types'

export default function AllergiesPage() {
  const { t } = useTranslation()
  const { data, addAllergy, updateAllergy } = useAppData()
  const canWrite = useCanWrite()
  const tester = useAllergyTester()
  const [familyFilter, setFamilyFilter] = useState('all')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Allergy | null>(null)
  const familyDiners = data.familyMembers.filter((diner) => familyFilter === 'all' || diner.family_id === familyFilter)
  const visibleAllergies = data.allergies.filter((allergy) => familyDiners.some((diner) => diner.id === allergy.family_member_id))

  return (
    <>
      <PageHeader
        title={t('allergies.title')}
        subtitle={t('allergies.subtitle')}
        action={
          <div className="flex flex-wrap gap-2">
            <AiCopilotButton
              compact
              context={{ page_id: 'allergies', selected_family_id: familyFilter === 'all' ? data.families[0]?.id : familyFilter, relevant_records: { allergy_count: visibleAllergies.length } }}
              actionKey="allergies.testIngredient"
              labelKey="aiCopilot.actions.allergies.testIngredient.label"
              testId="allergies-ai-test"
            />
            <AiCopilotButton
              compact
              context={{ page_id: 'allergies', selected_family_id: familyFilter === 'all' ? data.families[0]?.id : familyFilter, relevant_records: { allergy_count: visibleAllergies.length } }}
              actionKey="allergies.safeAlternative"
              labelKey="aiCopilot.actions.allergies.safeAlternative.label"
              testId="allergies-ai-alternative"
            />
            {canWrite ? (
              <Button onClick={() => setOpen(true)}>
                <Plus className="h-4 w-4" />
                {t('allergies.create')}
              </Button>
            ) : (
              <ReadOnlyNotice />
            )}
          </div>
        }
      />
      <div className="mb-5 max-w-sm">
        <Field label={t('common.family')}>
          <select className="input" value={familyFilter} onChange={(event) => setFamilyFilter(event.target.value)}>
            <option value="all">{t('common.all')}</option>
            {data.families.map((family) => <option key={family.id} value={family.id}>{family.name}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <AllergyTester tester={tester} />
        <RecipeAllergyTester tester={tester} />
        <FamilyAllergyMatrix tester={tester} />
        <CrossContactWarningPanel />
        <Card className="xl:col-span-2">
          <h2 className="mb-4 font-serif text-2xl font-semibold">{t('allergies.byDiner')}</h2>
          <AllergyList
            allergies={visibleAllergies}
            canWrite={canWrite}
            dinerName={(dinerId) => data.familyMembers.find((diner) => diner.id === dinerId)?.full_name || '-'}
            onEdit={setEditing}
          />
        </Card>
        <AllergyRulesSummary />
      </div>
      {canWrite && open && (
        <AllergyFormDialog
          onClose={() => setOpen(false)}
          onSubmit={(values) => {
            addAllergy(values)
            setOpen(false)
          }}
        />
      )}
      {canWrite && editing && (
        <AllergyFormDialog
          allergy={editing}
          onClose={() => setEditing(null)}
          onSubmit={(values) => {
            updateAllergy(editing.id, values)
            setEditing(null)
          }}
        />
      )}
    </>
  )
}
