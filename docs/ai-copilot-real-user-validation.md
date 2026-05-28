# AI Copilot Real User Validation

Use this checklist on production or staging after a real user has logged in. Do not record or share API keys during validation.

## Setup

- [ ] Open Settings.
- [ ] Configure a personal Gemini API key.
- [ ] Confirm the full key is never shown after save or test.
- [ ] Confirm the panel shows status, model, last tested date, and last four characters only.

## Contextual Copilot

- [ ] Open Dashboard and launch the AI Copilot.
- [ ] Run "Suggest next best action."
- [ ] Confirm the drawer shows the current page context and validated suggestions.
- [ ] Open Recipes and ask AI to improve a recipe.
- [ ] Confirm generic recipe suggestions do not create recipes automatically.
- [ ] Open Menu Planner and generate or repair a menu draft.
- [ ] Confirm unsafe slots remain blocked and review-needed slots require confirmation.
- [ ] Open Pantry and ask for meals using expiring ingredients.
- [ ] Open Shopping List and prioritize purchases.
- [ ] Confirm missing ingredients and warnings are shown in plain language.

## Safety And UX

- [ ] Confirm blocked suggestions cannot be applied.
- [ ] Confirm review-needed suggestions require a written reason.
- [ ] Confirm every apply dialog explains exactly what will be created or updated.
- [ ] Confirm Escape closes the Copilot drawer.
- [ ] Confirm the drawer works on a mobile viewport.
- [ ] Switch to Spanish and confirm Copilot labels, buttons, and statuses translate.

## Rate Limit Recovery

- [ ] If Gemini returns HTTP 429, confirm the UI says the key is rate limited, not invalid.
- [ ] Confirm retry-after guidance appears when available.
- [ ] Confirm AI actions are disabled during active cooldown.
- [ ] Confirm Settings offers test again, model change, key replacement, and key deletion options.
