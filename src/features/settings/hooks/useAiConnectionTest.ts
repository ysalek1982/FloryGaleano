import type { ReactNode } from 'react'
import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
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
  message?: string | null
}

export interface AiConnectionState {
  message: string
  testing: boolean
  status: AiKeyStatus
  refresh: () => Promise<void>
  testConnection: (apiKey?: string, model?: string) => Promise<AiKeyStatus | null>
  saveKey: (apiKey: string, model: string) => Promise<AiKeyStatus | null>
  deleteKey: () => Promise<AiKeyStatus | null>
  listModels: (apiKey?: string, model?: string) => Promise<string[]>
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

const AiConnectionContext = createContext<AiConnectionState | null>(null)

function useAiConnectionState(): AiConnectionState {
  const { t } = useTranslation()
  const [status, setStatus] = useState<AiKeyStatus>(emptyStatus)
  const [message, setMessage] = useState('')
  const [pendingOperations, setPendingOperations] = useState(0)
  const refreshInFlight = useRef<Promise<void> | null>(null)

  const trackOperation = useCallback(async <T,>(task: () => Promise<T>) => {
    setPendingOperations((count) => count + 1)
    try {
      return await task()
    } finally {
      setPendingOperations((count) => Math.max(0, count - 1))
    }
  }, [])

  const invoke = useCallback(async (body: Record<string, unknown>, updateStatus = true) => {
    if (!isSupabaseConfigured || !supabase) throw new Error('Supabase is not configured')
    const { data, error } = await supabase.functions.invoke('ai-key-manager', { body })
    if (error) throw error
    if (updateStatus) setStatus({ ...emptyStatus, ...(data as Partial<AiKeyStatus>) })
    return data as AiKeyStatus
  }, [])

  const refresh = useCallback(async () => {
    if (!refreshInFlight.current) {
      refreshInFlight.current = (async () => {
        try {
          await invoke({ action: 'get_status' })
        } catch {
          setStatus(emptyStatus)
        } finally {
          refreshInFlight.current = null
        }
      })()
    }
    await refreshInFlight.current
  }, [invoke])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [refresh])

  const testConnection = useCallback(async (apiKey?: string, model = status.model) => {
    return trackOperation(async () => {
      const next = await invoke({ action: 'test_key', api_key: apiKey, model })
      setMessage(next.message || (next.key_status === 'valid' && !next.configured ? t('settings.keyValidSavePrompt') : next.key_status === 'valid' ? t('settings.connectionSuccess') : next.last_error || t('settings.connectionFailure')))
      return next
    }).catch(() => {
      setMessage(t('settings.connectionFailure'))
      return null
    })
  }, [invoke, status.model, t, trackOperation])

  const saveKey = useCallback(async (apiKey: string, model: string) => {
    return trackOperation(async () => {
      const next = await invoke({ action: 'save_key', api_key: apiKey, model })
      setMessage(next.key_status === 'valid' ? t('settings.geminiKeySaved') : next.last_error || t('settings.connectionFailure'))
      return next
    }).catch(() => {
      setMessage(t('settings.connectionFailure'))
      return null
    })
  }, [invoke, t, trackOperation])

  const deleteKey = useCallback(async () => {
    return trackOperation(async () => {
      const next = await invoke({ action: 'delete_key', model: status.model })
      setMessage(t('settings.geminiKeyDeleted'))
      return next
    }).catch(() => {
      setMessage(t('settings.connectionFailure'))
      return null
    })
  }, [invoke, status.model, t, trackOperation])

  const listModels = useCallback(async (apiKey?: string, model = status.model) => {
    return trackOperation(async () => {
      const data = await invoke({ action: 'list_models', api_key: apiKey, model }, false) as unknown as { models?: string[]; status?: AiKeyStatus; error?: string }
      if (data.status) setStatus({ ...emptyStatus, ...data.status })
      if (data.error) setMessage(data.error)
      return Array.isArray(data.models) ? data.models : []
    }).catch(() => {
      setMessage(t('settings.connectionFailure'))
      return []
    })
  }, [invoke, status.model, t, trackOperation])

  return useMemo(
    () => ({ message, testing: pendingOperations > 0, status, refresh, testConnection, saveKey, deleteKey, listModels }),
    [deleteKey, listModels, message, pendingOperations, refresh, saveKey, status, testConnection],
  )
}

export function AiConnectionProvider({ children }: { children: ReactNode }) {
  const value = useAiConnectionState()
  return createElement(AiConnectionContext.Provider, { value }, children)
}

export function useAiConnectionTest() {
  const context = useContext(AiConnectionContext)
  if (!context) {
    throw new Error('useAiConnectionTest must be used inside AiConnectionProvider')
  }
  return context
}
