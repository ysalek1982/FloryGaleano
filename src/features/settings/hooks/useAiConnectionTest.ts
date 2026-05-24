import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { isSupabaseConfigured, supabase } from '../../../lib/supabase'

export function useAiConnectionTest() {
  const { t } = useTranslation()
  const [message, setMessage] = useState('')
  const [testing, setTesting] = useState(false)

  const testConnection = async () => {
    if (!isSupabaseConfigured || !supabase) {
      setMessage(t('settings.connectionFailure'))
      return
    }
    setTesting(true)
    const { data, error } = await supabase.functions.invoke('ai-chef', { body: { action: 'ping' } })
    setTesting(false)
    setMessage(error || !data?.configured ? t('settings.connectionFailure') : t('settings.connectionSuccess'))
  }

  return { message, testing, testConnection }
}
