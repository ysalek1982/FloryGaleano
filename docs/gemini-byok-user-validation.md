# Gemini BYOK User Validation

Use this checklist against production after deploying BYOK changes. Do not paste real API keys into logs, screenshots, tickets, or committed files.

Production app: `https://smart-family-meals.vercel.app`

## Manual Validation Steps

1. Create or log in as a real user.
2. Open `Settings`.
3. Confirm the AI / Gemini panel shows `Not configured`.
4. Enter an invalid Gemini API key such as a disposable fake value.
5. Click `Test connection`.
6. Confirm the status becomes `invalid` or `test_failed`.
7. Confirm the full key is not visible after the test.
8. Replace it with a valid Gemini API key from Google AI Studio.
9. Click `Test connection`.
10. Confirm the status becomes `valid`.
11. Confirm only the last 4 characters are shown.
12. Open `AI Chef`.
13. Run a safe recipe or menu suggestion.
14. Confirm the response reports `ai_key_source=user`.
15. Confirm allergy, nutrition, rotation, and inventory validation sections still appear.
16. Return to `Settings` and delete the key.
17. Open `AI Chef` again.
18. Confirm it returns a setup-needed `review_needed` state instead of a generic error.

## Rate Limit Validation

HTTP 429 means Gemini quota or rate limits were reached. It must not be treated as an invalid key.

1. Save or test a key that returns HTTP 429.
2. Confirm `Settings` shows `rate_limited` or a quota/rate-limit explanation.
3. Confirm the full key is not visible.
4. Confirm only the last 4 characters are shown.
5. Confirm the key can be tested again without pasting it again.
6. Confirm `AI Chef` returns structured `review_needed` JSON with `code: gemini_rate_limited`.
7. Confirm the user is guided to wait, retry, or switch to Gemini 2.5 Flash-Lite.

## Expected Security Behavior

- The full Gemini key is never shown after save or test.
- The browser never receives `encrypted_key`, `key_iv`, `vault_secret_id`, or decrypted key material.
- `ai-chef` uses the authenticated user from the JWT, not a user id supplied by the browser.
- Missing or invalid keys return structured JSON that the UI can explain.
- Gemini provider failures return `review_needed` JSON, not a broken user flow.
