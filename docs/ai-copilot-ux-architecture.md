# AI Copilot UX Architecture

Smart Family Meals keeps `/app/ai-chef` as the full AI workspace, but AI help is now available contextually across the chef workflow.

## Contextual Entry Points

The authenticated app shell exposes a global AI Copilot button. Key workflow pages also expose local AI buttons so a chef can ask for help from the current module:

- Recipes: improve recipe, check safety, create safe variations.
- Ingredients: categorize ingredients, detect likely allergens, find substitutes.
- Menu Planner and Day Planner: complete plans, repair unsafe slots, improve variety.
- Pantry, Freezer, and Shopping List: use expiring stock, plan freezer-first meals, prioritize purchases.
- Allergies and Nutrition: explain risk, suggest safer or more balanced meals.
- Reports and Alerts: summarize operational warnings and next actions.

Each button sends compact `page_context` metadata to the `ai-chef` Supabase Edge Function. Gemini keys stay server-side through BYOK.

## Safety-First Apply Model

AI suggestions are draft-only. The browser never silently mutates recipes, menu plans, shopping lists, pantry, or freezer inventory.

The apply dialog shows exactly what will be created or updated. Blocked suggestions cannot be applied. Review-needed suggestions require a reason. Generic AI suggestions without structured payload are not auto-created as recipes.

## Backend Validation

Contextual actions use the same server-side authority as menu generation:

- Allergy Shield.
- Menu Rotation.
- Nutrition availability.
- Inventory forecast.
- Category validation.
- Data consistency checks.

The final status comes from deterministic validators, not from Gemini's self-reported status.

## Rate Limits

When Gemini returns HTTP 429, the user key remains encrypted and retryable. Copilot shows a rate-limited state, retry timing when available, and links the user to Settings to test again or change model.

## Function Calling

The Edge Function uses an internal tool-contract architecture and structured JSON schemas. Gemini receives function-style contracts such as `get_candidate_recipes`, `validate_menu_plan`, `check_inventory`, and `repair_menu_plan`, while deterministic server code remains the final authority. Native Gemini function-calling can be added later without changing the frontend Copilot contract.
