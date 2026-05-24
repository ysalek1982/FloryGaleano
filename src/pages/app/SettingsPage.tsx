import { AiSettingsPanel } from '../../features/settings/components/AiSettingsPanel'
import { LanguageSettingsPanel } from '../../features/settings/components/LanguageSettingsPanel'
import { MenuRulesSettingsPanel } from '../../features/settings/components/MenuRulesSettingsPanel'
import { ProfileSettingsForm } from '../../features/settings/components/ProfileSettingsForm'
import { QaEnvironmentPanel } from '../../features/settings/components/QaEnvironmentPanel'
import { RuntimeHealthPanel } from '../../features/settings/components/RuntimeHealthPanel'
import { SecurityStatusPanel } from '../../features/settings/components/SecurityStatusPanel'
import { UnitsSettingsPanel } from '../../features/settings/components/UnitsSettingsPanel'
import { useSettingsForm } from '../../features/settings/hooks/useSettingsForm'
import { PageHeader } from '../../features/shared/chefUi'
import { useAuth } from '../../lib/AppState'
import { isProductionApp } from '../../lib/env'
import { useTranslation } from 'react-i18next'

export default function SettingsPage() {
  const { t } = useTranslation()
  const settings = useSettingsForm()
  const { profile } = useAuth()
  const showQaPanel = !isProductionApp || profile?.role === 'super_admin'

  return (
    <>
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />
      <div className="grid gap-5 lg:grid-cols-2">
        <ProfileSettingsForm settings={settings} />
        <LanguageSettingsPanel settings={settings} />
        <UnitsSettingsPanel settings={settings} />
        <MenuRulesSettingsPanel settings={settings} />
        <AiSettingsPanel settings={settings} />
        <SecurityStatusPanel />
        <RuntimeHealthPanel />
        {showQaPanel && <QaEnvironmentPanel />}
      </div>
    </>
  )
}
