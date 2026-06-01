import { act, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import '../i18n/config'
import { AiConnectionProvider, useAiConnectionTest } from '../features/settings/hooks/useAiConnectionTest'

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
}))

vi.mock('../lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    functions: {
      invoke: mocks.invoke,
    },
  },
}))

const status = {
  provider: 'gemini',
  model: 'gemini-2.5-flash',
  is_enabled: false,
  configured: false,
  key_status: 'not_configured',
  key_last4: null,
  last_tested_at: null,
  last_error: null,
}

function StatusConsumer({ label }: { label: string }) {
  const ai = useAiConnectionTest()
  return <div data-testid={label}>{ai.status.key_status}</div>
}

function SaveConsumer() {
  const ai = useAiConnectionTest()
  return (
    <button type="button" onClick={() => void ai.saveKey('fake-gemini-key', 'gemini-2.5-flash')}>
      save
    </button>
  )
}

describe('AI connection provider', () => {
  beforeEach(() => {
    mocks.invoke.mockReset()
    mocks.invoke.mockResolvedValue({ data: status, error: null })
  })

  it('shares one initial AI key status request across consumers', async () => {
    render(
      <AiConnectionProvider>
        <StatusConsumer label="first" />
        <StatusConsumer label="second" />
      </AiConnectionProvider>,
    )

    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledTimes(1))
    expect(mocks.invoke).toHaveBeenCalledWith('ai-key-manager', { body: { action: 'get_status' } })
    expect(screen.getByTestId('first')).toHaveTextContent('not_configured')
    expect(screen.getByTestId('second')).toHaveTextContent('not_configured')
  })

  it('updates the shared status after saving a key', async () => {
    mocks.invoke
      .mockResolvedValueOnce({ data: status, error: null })
      .mockResolvedValueOnce({
        data: {
          ...status,
          is_enabled: true,
          configured: true,
          key_status: 'valid',
          key_last4: '1234',
        },
        error: null,
      })

    render(
      <AiConnectionProvider>
        <StatusConsumer label="first" />
        <SaveConsumer />
      </AiConnectionProvider>,
    )

    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledTimes(1))
    await act(async () => {
      screen.getByRole('button', { name: 'save' }).click()
    })

    await waitFor(() => expect(screen.getByTestId('first')).toHaveTextContent('valid'))
    expect(mocks.invoke).toHaveBeenLastCalledWith('ai-key-manager', {
      body: { action: 'save_key', api_key: 'fake-gemini-key', model: 'gemini-2.5-flash' },
    })
  })
})
