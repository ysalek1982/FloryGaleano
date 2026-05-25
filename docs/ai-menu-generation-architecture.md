# AI Menu Generation Architecture

Smart Family Meals uses Gemini only from Supabase Edge Functions. The browser never receives a Gemini key and Gemini output never writes directly to the database.

## Flow

1. Authenticate the user JWT.
2. Load only the selected family that the user can access.
3. Load accessible recipes first, then fetch `recipe_ingredients` only for those recipe IDs.
4. Build a compact candidate recipe set before calling Gemini.
5. Ask Gemini for structured JSON using the `MenuPlanAiResponse` schema.
6. Run deterministic server-side validation.
7. Return a draft menu with safe, review_needed, or blocked statuses.
8. The frontend can apply only safe suggestions automatically; review-needed requires confirmation and blocked suggestions cannot be applied.

## Repairing Draft Menus

`repair_menu_plan` accepts an existing draft menu and repairs only slots whose status is `review_needed` or `blocked`. Safe slots are locked and preserved unchanged. The repaired menu is returned as a draft and is not saved automatically.

## Candidate-First Planning

The Edge Function scores and caps recipe candidates before Gemini sees them. Candidates are limited to family-accessible recipes and include:

- recipe ID and name,
- meal style and main protein,
- allergy status,
- last served age for 21-day rotation,
- pantry coverage,
- freezer availability,
- nutrition availability,
- category code.

The request is capped to a compact context rather than sending all family data, all history, or all recipes.

## Structured Output

Menu actions use the `MenuPlanAiResponse` JSON Schema. Gemini must return a draft menu with days, meal slots, recipe IDs when possible, category codes, warnings, and validation summary. New recipes are suggestions only.

## Function-Calling Style Boundaries

The Edge Function keeps deterministic boundaries equivalent to tool calls:

- `get_family_context`
- `get_candidate_recipes`
- `propose_menu_plan`
- `validate_menu_plan`
- `calculate_portions`
- `check_inventory`
- `generate_shopping_list_preview`
- `create_menu_plan_draft`

The current implementation executes these contracts inside one Edge Function so secrets, RLS-aware context loading, and validation remain centralized.

## Validation Authority

Gemini never decides final safety. After the response, the server validates:

- allergy and cross-contact risk,
- 21-day menu rotation,
- nutrition availability,
- portion and inventory impact,
- predefined food category codes,
- data consistency.

Unsafe suggestions are blocked or marked review_needed even if Gemini labels them safe.

## 429 Handling

HTTP 429 is quota or rate limiting, not an invalid key. Smart Family Meals stores this as `rate_limited`, preserves the encrypted key, stores retry information when available, and returns structured `review_needed` JSON. Users can retry later or switch to a lighter model such as Gemini 2.5 Flash-Lite.
