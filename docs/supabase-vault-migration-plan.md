# Supabase Vault Migration Plan

## Current State

User Gemini keys are encrypted in the `ai-key-manager` Edge Function with AES-GCM and stored in `user_ai_settings.encrypted_key` plus `key_iv`. The frontend receives metadata only.

## Target State

Store Gemini keys in Supabase Vault and keep only `vault_secret_id`, key status, model, last test time, and last 4 characters in `user_ai_settings`.

## Migration Approach

1. Add Vault read/write support to `ai-key-manager`.
2. Store all newly saved keys in Vault first.
3. Keep AES-GCM read support for existing rows.
4. On the next successful user key test, migrate that user's key into Vault and set `vault_secret_id`.
5. Mark `key_storage_method='vault'`.
6. Keep backward compatibility until all active rows have migrated.
7. Remove `encrypted_key` and `key_iv` only after a separate migration and verified rollback window.

## Security Benefits

- Centralized secret storage.
- Less application-managed cryptography.
- Simpler emergency revocation path.
- Metadata and secret material stay more clearly separated.

## Required Testing

- `get_status` never returns Vault IDs unless explicitly needed for admin-only diagnostics.
- `save_key` stores new keys in Vault.
- `test_key` works for both Vault and legacy AES-GCM rows during transition.
- `delete_key` revokes or removes the Vault secret and clears metadata.
- `ai-chef` resolves user keys from Vault first, then legacy AES-GCM during transition.
- RLS and service-role boundaries remain unchanged.

## Rollback Strategy

Keep AES-GCM support until Vault migration is complete. If Vault access fails, `ai-key-manager` should return structured `test_failed` metadata, not expose secrets or silently use a different user's key.
