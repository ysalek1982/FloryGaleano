import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { isSupabaseConfigured, supabase } from '../../../lib/supabase'

export interface AiKeyStatus {
  provider: 'gemini'
  model: string
  is_enabled: boolean
  configured: boolean
  key_status: 'not_configured' | 'valid' | 'invalid' | 'test_failed' | 'rate_limited' | 'deleted'
  key_last4: string | null
  last_tested_at: string | null
  last_error: string | null
  last_rate_limited_at?: string | null
  retry_after_seconds?: number | null
}

const emptyStatus: AiKeyStatus = {
  provider: 'gemini',
  model: 'gemini-2.5-flash',
  is_enabled: false,
  configured: false,
  key_status: 'not_configured',
  key_last4: null,
  last_tested_at: null,
  last_error: null,
}

export function useAiConnectionTest() {
  const { t } = useTranslation()
  const [status, setStatus] = useState<AiKeyStatus>(emptyStatus)
  const [message, setMessage] = useState('')
  const [testing, setTesting] = useState(false)

  const invoke = useCallback(async (body: Record<string, unknown>, updateStatus = true) => {
    if (!isSupabaseConfigured || !supabase) throw new Error('Supabase is not configured')
    const { data, error } = await supabase.functions.invoke('ai-key-manager', { body })
    if (error) throw error
    if (updateStatus) setStatus({ ...emptyStatus, ...(data as Partial<AiKeyStatus>) })
    return data as AiKeyStatus
  }, [])

  const refresh = useCallback(async () => {
    try {
      await invoke({ action: 'get_status' })
    } catch {
      setStatus(emptyStatus)
    }
  }, [invoke])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [refresh])

  const testConnection = async (apiKey?: string, model = status.model) => {
    setTesting(true)
    try {
      const next = await invoke({ action: 'test_key', api_key: apiKey, model })
      setMessage(next.key_status === 'valid' ? t('settings.connectionSuccess') : next.last_error || t('settings.connectionFailure'))
      return next
    } catch {
      setMessage(t('settings.connectionFailure'))
      return null
    } finally {
      setTesting(false)
    }
  }

  const saveKey = async (apiKey: string, model: string) => {
    setTesting(true)
    try {
      const next = await invoke({ action: 'save_key', api_key: apiKey, model })
      setMessage(next.key_status === 'valid' ? t('settings.geminiKeySaved') : next.last_error || t('settings.connectionFailure'))
      return next
    } catch {
      setMessage(t('settings.connectionFailure'))
      return null
    } finally {
      setTesting(false)
    }
  }

  const deleteKey = async () => {
    setTesting(true)
    try {
      const next = await invoke({ action: 'delete_key', model: status.model })
      setMessage(t('settings.geminiKeyDeleted'))
      return next
    } catch {
      setMessage(t('settings.connectionFailure'))
      return null
    } finally {
      setTesting(false)
    }
  }

  const listModels = async (apiKey?: string, model = status.model) => {
    setTesting(true)
    try {
      const data = await invoke({ action: 'list_models', api_key: apiKey, model }, false) as unknown as { models?: string[]; status?: AiKeyStatus; error?: string }
      if (data.status) setStatus({ ...emptyStatus, ...data.status })
      if (data.error) setMessage(data.error)
      return Array.isArray(data.models) ? data.models : []
    } catch {
      setMessage(t('settings.connectionFailure'))
      return []
    } finally {
      setTesting(false)
    }
  }

  return { message, testing, status, refresh, testConnection, saveKey, deleteKey, listModels }
}
