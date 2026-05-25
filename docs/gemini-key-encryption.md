# Gemini Key Encryption

Smart Family Meals currently uses a BYOK model for Gemini. Each authenticated user stores their own Gemini API key through the `ai-key-manager` Supabase Edge Function.

## Current Storage Model

- The browser sends a new key only to `ai-key-manager`.
- `ai-key-manager` requires a valid Supabase Auth JWT.
- The user id comes from the JWT through `auth.getUser()`.
- The key is tested server-side against Gemini.
- Valid keys are encrypted in the Edge Function using AES-GCM.
- The encrypted key and IV are stored in `user_ai_settings`.
- The UI receives only metadata: provider, model, status, last test time, and last 4 characters.
- HTTP 429 quota/rate-limit responses are stored as `rate_limited`, not `invalid`; the encrypted key remains retryable and only retry metadata is exposed.

## Required Secret

Set this Supabase Edge Function secret in every environment:

```bash
npx supabase secrets set APP_USER_SECRET_ENCRYPTION_KEY="<long-random-secret>"
```

Use a long random value. Do not use a password, repository secret, frontend variable, or value committed to source control.

## Why The Frontend Cannot Decrypt

The encryption key lives only in Supabase Edge Function secrets. It is not exposed through Vercel, the React app, exported files, localStorage, or Supabase public tables. The frontend has no access to the AES-GCM key and cannot decrypt `encrypted_key`.

## Rotation Procedure

1. Disable AI key writes briefly if the environment is active.
2. Generate a new `APP_USER_SECRET_ENCRYPTION_KEY`.
3. Ask users to re-test or replace their Gemini key, or run a controlled re-encryption job while both old and new keys are available in a secure maintenance function.
4. Verify `ai-key-manager get_status` still returns metadata only.
5. Verify `ai-chef` still returns `ai_key_source=user` for users who have revalidated.
6. Remove the old secret from the environment.

## Risks

- If `APP_USER_SECRET_ENCRYPTION_KEY` is lost, existing encrypted user keys cannot be decrypted.
- If the encryption key is compromised, stored encrypted keys must be treated as compromised and rotated by users.
- AES-GCM protects stored key material, but Gemini usage remains controlled by the user's Google account and key restrictions.

## Emergency Compromise Procedure

1. Rotate the Edge Function encryption secret.
2. Mark all `user_ai_settings` rows as `not_configured` or `deleted`.
3. Clear `encrypted_key` and `key_iv`.
4. Redeploy `ai-key-manager` and `ai-chef`.
5. Notify users to create and save new Gemini API keys.
6. Review logs for accidental secret exposure.

## Future Vault Path

Supabase Vault is the preferred long-term storage target. Keep the current metadata contract stable so the frontend does not need to change when storage moves from AES-GCM columns to Vault secret references.
