import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const supportedActions = new Set(['get_status', 'save_key', 'test_key', 'delete_key'])

serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true })

  try {
    const body = await req.json().catch(() => ({}))
    const action = String(body?.action || 'get_status')
    if (!supportedActions.has(action)) return json({ error: 'Unsupported AI key action.' }, 400)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('APP_SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Supabase service configuration is missing.' }, 500)

    const authorization = req.headers.get('Authorization') || ''
    const token = authorization.replace('Bearer ', '')
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: userData, error: userError } = await admin.auth.getUser(token)
    if (userError || !userData.user) return json({ error: 'Unauthorized.' }, 401)

    const userId = userData.user.id
    if (action === 'get_status') {
      return json(await getStatus(admin, userId))
    }
    if (action === 'delete_key') {
      await admin.from('user_ai_settings').upsert({
        profile_id: userId,
        provider: 'gemini',
        model: String(body?.model || 'gemini-2.5-flash'),
        is_enabled: false,
        key_storage_method: 'encrypted',
        vault_secret_id: null,
        encrypted_key: null,
        key_iv: null,
        key_last4: null,
        key_status: 'deleted',
        last_error: null,
        last_tested_at: new Date().toISOString(),
      }, { onConflict: 'profile_id,provider' })
      return json(await getStatus(admin, userId))
    }

    const model = String(body?.model || 'gemini-2.5-flash')
    const providedKey = typeof body?.api_key === 'string' ? body.api_key.trim() : ''
    const stored = await getRawSettings(admin, userId)
    const apiKey = providedKey || (stored?.encrypted_key && stored?.key_iv ? await decryptSecret(String(stored.encrypted_key), String(stored.key_iv)) : '')
    if (!apiKey) {
      await upsertStatus(admin, userId, model, 'not_configured', null, null)
      return json(await getStatus(admin, userId))
    }

    const test = await testGeminiKey(apiKey, model)
    if (action === 'test_key' && !providedKey) {
      await upsertStatus(admin, userId, model, test.status, stored?.key_last4 ? String(stored.key_last4) : null, test.error)
      return json(await getStatus(admin, userId))
    }

    if (!test.ok) {
      await upsertStatus(admin, userId, model, test.status, last4(apiKey), test.error)
      return json(await getStatus(admin, userId))
    }

    if (action === 'test_key') {
      return json({
        provider: 'gemini',
        model,
        is_enabled: false,
        key_status: 'valid',
        key_last4: last4(apiKey),
        last_tested_at: new Date().toISOString(),
        configured: false,
      })
    }

    const encrypted = await encryptSecret(apiKey)
    const { error } = await admin.from('user_ai_settings').upsert({
      profile_id: userId,
      provider: 'gemini',
      model,
      is_enabled: true,
      key_storage_method: 'encrypted',
      vault_secret_id: null,
      encrypted_key: encrypted.ciphertext,
      key_iv: encrypted.iv,
      key_last4: last4(apiKey),
      key_status: 'valid',
      last_error: null,
      last_tested_at: new Date().toISOString(),
    }, { onConflict: 'profile_id,provider' })
    if (error) throw error
    return json(await getStatus(admin, userId))
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500)
  }
})

async function getStatus(admin: ReturnType<typeof createClient>, userId: string) {
  const raw = await getRawSettings(admin, userId)
  if (!raw) {
    return {
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      is_enabled: false,
      configured: false,
      key_status: 'not_configured',
      key_last4: null,
      last_tested_at: null,
      last_error: null,
    }
  }
  return publicMetadata(raw)
}

async function getRawSettings(admin: ReturnType<typeof createClient>, userId: string) {
  const { data, error } = await admin
    .from('user_ai_settings')
    .select('provider, model, is_enabled, key_storage_method, encrypted_key, key_iv, key_last4, key_status, last_tested_at, last_error')
    .eq('profile_id', userId)
    .eq('provider', 'gemini')
    .maybeSingle()
  if (error) throw error
  return data as Record<string, unknown> | null
}

function publicMetadata(row: Record<string, unknown>) {
  const configured = row.is_enabled === true && row.key_status === 'valid' && Boolean(row.key_last4)
  return {
    provider: 'gemini',
    model: String(row.model || 'gemini-2.5-flash'),
    is_enabled: Boolean(row.is_enabled),
    configured,
    key_status: String(row.key_status || 'not_configured'),
    key_last4: row.key_last4 ? String(row.key_last4) : null,
    last_tested_at: row.last_tested_at ? String(row.last_tested_at) : null,
    last_error: row.last_error ? String(row.last_error).slice(0, 180) : null,
  }
}

async function upsertStatus(
  admin: ReturnType<typeof createClient>,
  userId: string,
  model: string,
  status: string,
  keyLast4: string | null,
  lastError: string | null,
) {
  const { error } = await admin.from('user_ai_settings').upsert({
    profile_id: userId,
    provider: 'gemini',
    model,
    is_enabled: status === 'valid' && Boolean(keyLast4),
    key_storage_method: 'encrypted',
    key_last4: keyLast4,
    key_status: status,
    last_error: lastError,
    last_tested_at: new Date().toISOString(),
  }, { onConflict: 'profile_id,provider' })
  if (error) throw error
}

async function testGeminiKey(apiKey: string, model: string) {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Return {"ok":true} as JSON.' }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0 },
      }),
    })
    if (response.ok) return { ok: true, status: 'valid', error: null }
    const status = response.status === 400 || response.status === 401 || response.status === 403 ? 'invalid' : 'test_failed'
    return { ok: false, status, error: `Gemini test returned HTTP ${response.status}` }
  } catch {
    return { ok: false, status: 'test_failed', error: 'Gemini test request failed.' }
  }
}

async function encryptSecret(secret: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(secret)
  const key = await encryptionKey()
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  return {
    ciphertext: bytesToBase64(new Uint8Array(encrypted)),
    iv: bytesToBase64(iv),
  }
}

async function decryptSecret(ciphertext: string, ivText: string) {
  const key = await encryptionKey()
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(ivText) },
    key,
    base64ToBytes(ciphertext),
  )
  return new TextDecoder().decode(decrypted)
}

async function encryptionKey() {
  const secret = Deno.env.get('APP_USER_SECRET_ENCRYPTION_KEY')
  if (!secret || secret.length < 32) throw new Error('User key encryption secret is not configured.')
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret))
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function base64ToBytes(value: string) {
  const binary = atob(value)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

function last4(value: string) {
  return value.slice(-4)
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
