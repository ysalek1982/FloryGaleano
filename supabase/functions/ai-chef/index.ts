import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const supportedActions = new Set([
  'generate_validated_menu_plan',
  'repair_menu_plan',
  'generate_week_menu',
  'generate_day_menu',
  'create_recipe',
  'suggest_substitutions',
  'review_school_menu',
  'generate_shopping_list',
  'optimize_freezer_usage',
  'calculate_menu_improvements',
  'pantry_aware_meals',
  'freezer_first_meals',
  'reduce_waste_menu',
  'purchase_priority',
  'explain_missing_items',
  'contextual_suggestion',
  'explain_current_page',
  'suggest_next_action',
  'repair_current_item',
  'summarize_current_context',
  'ping',
])

const inventoryAwareActions = new Set([
  'generate_shopping_list',
  'optimize_freezer_usage',
  'calculate_menu_improvements',
  'pantry_aware_meals',
  'freezer_first_meals',
  'reduce_waste_menu',
  'purchase_priority',
  'explain_missing_items',
])

const menuPlanActions = new Set(['generate_validated_menu_plan', 'repair_menu_plan', 'generate_week_menu', 'generate_day_menu'])
const contextualActions = new Set(['contextual_suggestion', 'explain_current_page', 'suggest_next_action', 'repair_current_item', 'summarize_current_context'])
const mealTimes = ['breakfast', 'school_lunch', 'lunch', 'snack', 'sport_snack', 'dinner', 'evening_snack']
const modelFallbacks = ['gemini-2.5-flash-lite', 'gemini-2.5-flash']

const menuPlanResponseSchema = {
  type: 'object',
  properties: {
    action: { type: 'string' },
    language: { type: 'string', enum: ['en', 'es'] },
    menu_plan: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        start_date: { type: 'string' },
        end_date: { type: 'string' },
        days: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string' },
              meals: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    meal_time: { type: 'string', enum: mealTimes },
                    recipe_id: { type: 'string', nullable: true },
                    recipe_name: { type: 'string' },
                    servings: { type: 'number' },
                    diner_ids: { type: 'array', items: { type: 'string' } },
                    reason: { type: 'string' },
                    category_codes: { type: 'array', items: { type: 'string' } },
                    status: { type: 'string', enum: ['safe', 'review_needed', 'blocked'] },
                    warnings: { type: 'array', items: { type: 'string' } },
                  },
                  required: ['meal_time', 'recipe_name', 'servings', 'diner_ids', 'reason', 'category_codes', 'status', 'warnings'],
                },
              },
            },
            required: ['date', 'meals'],
          },
        },
      },
      required: ['title', 'start_date', 'end_date', 'days'],
    },
    new_recipe_suggestions: { type: 'array', items: { type: 'object' } },
    shopping_list_suggestions: { type: 'array', items: { type: 'object' } },
    validation_summary: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['safe', 'review_needed', 'blocked'] },
        reasons: { type: 'array', items: { type: 'string' } },
        warnings: { type: 'array', items: { type: 'string' } },
      },
      required: ['status', 'reasons', 'warnings'],
    },
  },
  required: ['action', 'language', 'menu_plan', 'new_recipe_suggestions', 'shopping_list_suggestions', 'validation_summary'],
}

const aiCopilotResponseSchema = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['safe', 'review_needed', 'blocked'] },
    page_id: { type: 'string' },
    action: { type: 'string' },
    title: { type: 'string' },
    summary: { type: 'string' },
    suggestions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: { type: 'string', enum: ['recipe', 'menu', 'shopping', 'inventory', 'allergy', 'nutrition', 'report', 'settings'] },
          title: { type: 'string' },
          reason: { type: 'string' },
          status: { type: 'string', enum: ['safe', 'review_needed', 'blocked'] },
          confidence: { type: 'number' },
          warnings: { type: 'array', items: { type: 'string' } },
          data: { type: 'object' },
          apply_option: { type: 'string', enum: ['apply_recipe_patch', 'apply_menu_patch', 'create_shopping_item', 'create_alert', 'open_settings', 'no_apply_available'] },
        },
        required: ['id', 'type', 'title', 'reason', 'status', 'confidence', 'warnings', 'data', 'apply_option'],
      },
    },
    warnings: { type: 'array', items: { type: 'string' } },
    validation_summary: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['safe', 'review_needed', 'blocked'] },
        reasons: { type: 'array', items: { type: 'string' } },
        warnings: { type: 'array', items: { type: 'string' } },
      },
      required: ['status', 'reasons', 'warnings'],
    },
    apply_options: { type: 'array', items: { type: 'string' } },
  },
  required: ['status', 'page_id', 'action', 'title', 'summary', 'suggestions', 'warnings', 'validation_summary', 'apply_options'],
}

const aiFunctionContracts = [
  'get_family_context',
  'get_candidate_recipes',
  'propose_menu_plan',
  'validate_menu_plan',
  'calculate_portions',
  'check_inventory',
  'generate_shopping_list_preview',
  'create_menu_plan_draft',
]

serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true })

  try {
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return json({ error: 'Malformed AI Chef request.' }, 400)
    }
    const action = normalizeAction(body?.action)
    if (!supportedActions.has(action)) {
      return json({ error: 'Unsupported AI Chef action.' }, 400)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
      Deno.env.get('APP_SUPABASE_SERVICE_ROLE_KEY')
    const platformGeminiApiKey = Deno.env.get('GEMINI_API_KEY')
    const platformFallbackEnabled = Deno.env.get('PLATFORM_GEMINI_FALLBACK_ENABLED') === 'true'
    const model = body?.model || Deno.env.get('GEMINI_MODEL') || 'gemini-2.5-flash'

    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: 'Supabase service configuration is missing.' }, 500)
    }

    const authorization = req.headers.get('Authorization') || ''
    const token = authorization.replace('Bearer ', '')
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: userData, error: userError } = await admin.auth.getUser(token)
    if (userError || !userData.user) return json({ error: 'Unauthorized.' }, 401)

    if (action === 'ping') {
      const userKey = await loadUserGeminiKey(admin, userData.user.id)
      const hasPlatformFallback = platformFallbackEnabled && Boolean(platformGeminiApiKey)
      return json({
        configured: Boolean(supabaseUrl && serviceRoleKey && (userKey?.apiKey || hasPlatformFallback)),
        gemini_configured: Boolean(userKey?.apiKey || hasPlatformFallback),
        service_role_configured: Boolean(serviceRoleKey),
        model: userKey?.model || model,
        ai_provider: 'gemini',
        ai_key_source: userKey?.apiKey ? 'user' : hasPlatformFallback ? 'platform_fallback' : 'not_configured',
        ai_configured: Boolean(userKey?.apiKey || hasPlatformFallback),
        key_last4: userKey?.keyLast4 || null,
        last_tested_at: userKey?.lastTestedAt || null,
      })
    }

    const context = await loadFamilyContext(admin, userData.user.id, body?.family_id)
    if (!context.family) return json({ error: 'No accessible family context found.' }, 404)
    const inventoryForecast = calculateInventoryForecast(context)
    const userKey = await loadUserGeminiKey(admin, userData.user.id)
    if (userKey?.rateLimited) {
      return json(rateLimitedAiResponse({
        model: userKey.model || model,
        action,
        context,
        inventoryForecast,
        retryAfterSeconds: userKey.retryAfterSeconds,
        lastError: userKey.lastError,
      }))
    }
    const selectedKey = userKey?.apiKey
      ? { apiKey: userKey.apiKey, source: 'user', model: userKey.model || model }
      : platformFallbackEnabled && platformGeminiApiKey
        ? { apiKey: platformGeminiApiKey, source: 'platform_fallback', model }
        : null

    if (!selectedKey) {
      return json({
        configured: false,
        model,
        action,
        ai_provider: 'gemini',
        ai_key_source: 'not_configured',
        ai_configured: false,
        code: 'gemini_key_missing',
        message: 'Gemini API key is not configured.',
        suggested_action: 'Configure your Gemini API key in Settings.',
        context_summary: summarizeContext(context),
        inventory_forecast: inventoryAwareActions.has(action) || menuPlanActions.has(action) ? inventoryForecast : undefined,
        suggestions: [],
        validation_summary: {
          status: 'review_needed',
          reasons: ['Gemini API key is not configured for this user.'],
          warnings: [],
        },
        missing_ingredients: inventoryForecast.missing_ingredients,
        expiring_items: inventoryForecast.expiring_items,
        freezer_first_candidates: inventoryForecast.freezer_first_candidates,
        purchase_priority: inventoryForecast.purchase_priority,
        safety: {
          status: 'review_needed',
          reason: 'Gemini API key is not configured for this user.',
        },
      })
    }

    const isMenuPlanning = menuPlanActions.has(action)
    const candidateRecipes = getCandidateRecipes(context, {
      max: 30,
      includeFreezerFirst: inventoryAwareActions.has(action) || isMenuPlanning,
      inventoryForecast,
    })

    const systemPrompt = [
      'You are Smart Family Meals AI Chef.',
      'Return only valid JSON matching the requested schema.',
      'Never override allergy, trace, nutrition, or menu rotation safety rules.',
      'Use safe/review_needed/blocked statuses for every suggestion.',
      'If an ingredient is ambiguous, mark the suggestion review_needed.',
      'Use only predefined food category codes from context.food_categories for new ingredients.',
      'If no category fits, use category_code "other" and include a warning.',
      'Prefer existing recipe_id values from candidate_recipes.',
      'Do not save data. Return draft suggestions only.',
      action === 'repair_menu_plan' ? 'Repair only meals marked review_needed or blocked in draft_menu_plan; preserve safe meals unchanged.' : '',
      contextualActions.has(action) ? 'For contextual Copilot actions, return AiCopilotResponse and include only apply_options that have complete structured data.' : '',
      'Use the requested language for user-facing explanations.',
    ].filter(Boolean).join('\n')

    const compactContext = compactAiContext(context, candidateRecipes, inventoryForecast, body)
    const userPrompt = JSON.stringify({
      action,
      prompt: body?.prompt || '',
      language: body?.language || context.profile?.preferred_language || 'en',
      function_contracts: aiFunctionContracts,
      context: compactContext,
      page_context: body?.page_context || null,
      draft_menu_plan: action === 'repair_menu_plan' ? body?.draft_menu_plan || body?.menu_plan || null : undefined,
      schema_name: isMenuPlanning ? 'MenuPlanAiResponse' : contextualActions.has(action) ? 'AiCopilotResponse' : 'ValidatedAiSuggestionsResponse',
    })

    const geminiResult = await generateWithGemini({
      apiKey: selectedKey.apiKey,
      preferredModel: selectedKey.model,
      systemPrompt,
      userPrompt,
      schema: isMenuPlanning ? menuPlanResponseSchema : contextualActions.has(action) ? aiCopilotResponseSchema : null,
    })

    if (!geminiResult.ok) {
      if (geminiResult.status === 'rate_limited') {
        await markUserRateLimited(admin, userData.user.id, selectedKey.model, geminiResult.error, geminiResult.retryAfterSeconds)
        return json(rateLimitedAiResponse({
          model: selectedKey.model,
          action,
          context,
          inventoryForecast,
          retryAfterSeconds: geminiResult.retryAfterSeconds,
          lastError: geminiResult.error,
        }))
      }
      return json(fallbackAiResponse({
        configured: true,
        model: selectedKey.model,
        action,
        context,
        inventoryForecast,
        reason: geminiResult.error || 'Gemini request failed.',
        aiKeySource: selectedKey.source,
      }))
    }

    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(geminiResult.text || '{}')
    } catch {
      return json(fallbackAiResponse({
        configured: true,
        model: selectedKey.model,
        action,
        context,
        inventoryForecast,
        reason: 'Gemini returned invalid JSON.',
        aiKeySource: selectedKey.source,
      }))
    }
    const validated = isMenuPlanning
      ? action === 'repair_menu_plan'
        ? validateRepairedMenuPlanOutput(parsed, context, inventoryForecast, action, candidateRecipes, body?.draft_menu_plan || body?.menu_plan)
        : validateMenuPlanOutput(parsed, context, inventoryForecast, action, candidateRecipes)
      : contextualActions.has(action)
        ? validateCopilotOutput(parsed, context, inventoryForecast, action, body?.page_context)
      : validateAiOutput(parsed, context, inventoryForecast, action)
    await createAiAlerts(admin, context, validated.suggestions)
    return json({
      configured: true,
      model: selectedKey.model,
      action,
      ai_provider: 'gemini',
      ai_key_source: selectedKey.source,
      ai_configured: true,
      context_summary: summarizeContext(context),
      inventory_forecast: inventoryAwareActions.has(action) || menuPlanActions.has(action) ? inventoryForecast : undefined,
      ...validated,
    })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500)
  }
})

async function loadFamilyContext(admin: ReturnType<typeof createClient>, userId: string, requestedFamilyId?: string) {
  const [{ data: profile }, { data: ownedFamilies }, { data: memberships }] = await Promise.all([
    admin.from('profiles').select('id, full_name, email, role, preferred_language').eq('id', userId).maybeSingle(),
    admin.from('families').select('*').or(`owner_id.eq.${userId},chef_id.eq.${userId}`),
    admin.from('family_users').select('family_id, role').eq('profile_id', userId),
  ])

  const accessibleIds = new Set<string>((ownedFamilies || []).map((family: { id: string }) => family.id))
  for (const membership of memberships || []) accessibleIds.add(membership.family_id)
  const familyId = requestedFamilyId && accessibleIds.has(requestedFamilyId)
    ? requestedFamilyId
    : Array.from(accessibleIds)[0]

  if (!familyId) return { profile, family: null }

  const [
    { data: family },
    { data: diners },
    { data: ingredients },
    { data: recipes },
    { data: pantry },
    { data: freezer },
    { data: menuPlans },
    { data: foodCategories },
  ] = await Promise.all([
    admin.from('families').select('*').eq('id', familyId).maybeSingle(),
    admin.from('family_members').select('*, allergies(*), dietary_restrictions(*), food_preferences(*)').eq('family_id', familyId),
    admin.from('ingredients').select('*').or(`family_id.eq.${familyId},scope.eq.global,owner_id.eq.${userId}`),
    admin.from('recipes').select('*').or(`family_id.eq.${familyId},scope.eq.global,owner_id.eq.${userId}`),
    admin.from('pantry_inventory').select('*').eq('family_id', familyId),
    admin.from('freezer_inventory').select('*').eq('family_id', familyId),
    admin.from('menu_plans').select('*, menu_plan_items(*)').eq('family_id', familyId),
    admin.from('food_categories').select('code, name_en, name_es, aliases_en, aliases_es, usda_category_hints').eq('is_active', true).order('sort_order'),
  ])

  const recipeIds = (recipes || []).map((recipe: { id: string }) => recipe.id).filter(Boolean)
  const { data: recipeIngredients, error: recipeIngredientError } = recipeIds.length
    ? await admin.from('recipe_ingredients').select('*').in('recipe_id', recipeIds)
    : { data: [], error: null }
  if (recipeIngredientError) throw recipeIngredientError

  return {
    profile,
    family,
    diners: diners || [],
    allergies: (diners || []).flatMap((diner: { allergies?: unknown[] }) => diner.allergies || []),
    ingredients: ingredients || [],
    recipes: recipes || [],
    recipe_ingredients: recipeIngredients || [],
    pantry: pantry || [],
    freezer: freezer || [],
    food_categories: foodCategories || [],
    menu_history: (menuPlans || []).flatMap((plan: { menu_plan_items?: unknown[] }) => plan.menu_plan_items || []),
  }
}

async function loadUserGeminiKey(admin: ReturnType<typeof createClient>, userId: string) {
  const { data, error } = await admin
    .from('user_ai_settings')
    .select('model, is_enabled, encrypted_key, key_iv, key_last4, key_status, last_tested_at, last_error, last_rate_limited_at, retry_after_seconds')
    .eq('profile_id', userId)
    .eq('provider', 'gemini')
    .maybeSingle()
  if (error || !data) return null
  if (data.key_status === 'rate_limited') {
    const retry = retryState(data.last_rate_limited_at || data.last_tested_at, data.retry_after_seconds)
    if (retry.active) {
      return {
        apiKey: null,
        rateLimited: true,
        retryAfterSeconds: retry.remainingSeconds,
        model: String(data.model || 'gemini-2.5-flash'),
        keyLast4: data.key_last4 ? String(data.key_last4) : null,
        lastTestedAt: data.last_tested_at ? String(data.last_tested_at) : null,
        lastError: data.last_error ? String(data.last_error) : null,
      }
    }
  }
  if (data.is_enabled !== true || !['valid', 'rate_limited', 'test_failed'].includes(String(data.key_status)) || !data.encrypted_key || !data.key_iv) return null
  try {
    return {
      apiKey: await decryptSecret(String(data.encrypted_key), String(data.key_iv)),
      rateLimited: false,
      retryAfterSeconds: null,
      model: String(data.model || 'gemini-2.5-flash'),
      keyLast4: data.key_last4 ? String(data.key_last4) : null,
      lastTestedAt: data.last_tested_at ? String(data.last_tested_at) : null,
      lastError: data.last_error ? String(data.last_error) : null,
    }
  } catch {
    return null
  }
}

function retryState(lastRateLimitedAt: unknown, retryAfterSeconds: unknown) {
  const fallbackSeconds = 300
  const started = String(lastRateLimitedAt || '')
  const duration = Number(retryAfterSeconds || fallbackSeconds)
  const startedAt = started ? new Date(started).getTime() : 0
  if (!startedAt || !Number.isFinite(startedAt)) return { active: false, remainingSeconds: null }
  const elapsed = Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
  const remaining = Math.max(0, duration - elapsed)
  return { active: remaining > 0, remainingSeconds: remaining }
}

function normalizeAction(action: string | undefined) {
  const map: Record<string, string> = {
    weeklyMenu: 'generate_validated_menu_plan',
    dailyMenu: 'generate_day_menu',
    safeRecipe: 'create_recipe',
    substitutions: 'suggest_substitutions',
    schoolMenu: 'review_school_menu',
    shoppingList: 'generate_shopping_list',
    freezerUsage: 'optimize_freezer_usage',
    freezerFirst: 'freezer_first_meals',
    pantryMeals: 'pantry_aware_meals',
    wasteReduction: 'reduce_waste_menu',
    purchasePriority: 'purchase_priority',
    explainMissing: 'explain_missing_items',
    variety: 'calculate_menu_improvements',
    completeSlots: 'generate_validated_menu_plan',
    generate_validated_menu_plan: 'generate_validated_menu_plan',
    repairMenuPlan: 'repair_menu_plan',
    repair_menu_plan: 'repair_menu_plan',
    contextualSuggestion: 'contextual_suggestion',
    explainCurrentPage: 'explain_current_page',
    suggestNextAction: 'suggest_next_action',
    repairCurrentItem: 'repair_current_item',
    summarizeCurrentContext: 'summarize_current_context',
    contextual_suggestion: 'contextual_suggestion',
    explain_current_page: 'explain_current_page',
    suggest_next_action: 'suggest_next_action',
    repair_current_item: 'repair_current_item',
    summarize_current_context: 'summarize_current_context',
    translate: 'create_recipe',
    productionPlan: 'calculate_menu_improvements',
  }
  return map[action || ''] || action || 'generate_week_menu'
}

async function generateWithGemini({
  apiKey,
  preferredModel,
  systemPrompt,
  userPrompt,
  schema,
}: {
  apiKey: string
  preferredModel: string
  systemPrompt: string
  userPrompt: string
  schema: Record<string, unknown> | null
}) {
  const models = Array.from(new Set([preferredModel, ...modelFallbacks]))
  let lastError = ''
  let retryAfterSeconds: number | null = null
  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
            generationConfig: schema
              ? {
                temperature: 0.25,
                responseMimeType: 'application/json',
                responseSchema: schema,
              }
              : {
                temperature: 0.25,
                responseMimeType: 'application/json',
              },
          }),
        },
      )
      const body = await response.json().catch(() => null)
      if (response.ok) {
        return {
          ok: true,
          model,
          text: String(body?.candidates?.[0]?.content?.parts?.[0]?.text || '{}'),
          status: 'valid',
          error: null,
          retryAfterSeconds: null,
        }
      }
      if (response.status === 429) {
        lastError = friendlyProviderError(response.status, model)
        retryAfterSeconds = retryAfterSecondsFromResponse(response, body)
        continue
      }
      if (response.status === 400 || response.status === 404) {
        lastError = friendlyProviderError(response.status, model)
        continue
      }
      if (response.status >= 500 || response.status === 503) {
        lastError = friendlyProviderError(response.status, model)
        continue
      }
      return {
        ok: false,
        model,
        text: '',
        status: 'test_failed',
        error: friendlyProviderError(response.status, model),
        retryAfterSeconds: null,
      }
    } catch {
      lastError = `Gemini request failed for ${model}.`
    }
  }
  return {
    ok: false,
    model: preferredModel,
    text: '',
    status: retryAfterSeconds != null || /429|quota|rate/i.test(lastError) ? 'rate_limited' : 'test_failed',
    error: lastError || 'Gemini request failed.',
    retryAfterSeconds,
  }
}

function compactAiContext(
  context: Record<string, unknown>,
  candidateRecipes: Array<Record<string, unknown>>,
  inventoryForecast: InventoryForecast,
  body: Record<string, unknown>,
) {
  const diners = arrayRecords(context.diners).slice(0, 12).map((diner) => ({
    id: diner.id,
    full_name: diner.full_name,
    portion_factor: diner.portion_factor,
    daily_calorie_target: diner.daily_calorie_target,
    daily_protein_target_g: diner.daily_protein_target_g,
    allergies: arrayRecords(diner.allergies).map((allergy) => ({
      allergen_name: allergy.allergen_name,
      normalized_allergen_name: allergy.normalized_allergen_name,
      severity: allergy.severity,
      avoid_traces: allergy.avoid_traces,
    })),
    dietary_restrictions: arrayRecords(diner.dietary_restrictions).map((item) => item.restriction_type || item.description).filter(Boolean).slice(0, 12),
    food_preferences: arrayRecords(diner.food_preferences).map((item) => ({
      preference_type: item.preference_type,
      item_name: item.item_name,
    })).slice(0, 20),
  }))
  return {
    family: {
      id: (context.family as { id?: string } | null)?.id,
      name: (context.family as { name?: string } | null)?.name,
    },
    planned_date: body?.planned_date || null,
    week_start: body?.week_start || body?.planned_date || null,
    diners,
    food_categories: arrayRecords(context.food_categories).slice(0, 30).map((category) => ({
      code: category.code,
      name_en: category.name_en,
      name_es: category.name_es,
      aliases_en: category.aliases_en,
      aliases_es: category.aliases_es,
    })),
    candidate_recipes: candidateRecipes,
    inventory_summary: {
      missing_ingredients: inventoryForecast.missing_ingredients.slice(0, 20),
      expiring_items: inventoryForecast.expiring_items.slice(0, 12),
      freezer_first_candidates: inventoryForecast.freezer_first_candidates.slice(0, 12),
      purchase_priority: inventoryForecast.purchase_priority.slice(0, 20),
    },
    recent_rotation: arrayRecords(context.menu_history).slice(0, 60).map((item) => ({
      recipe_id: item.recipe_id,
      planned_date: item.planned_date,
      meal_time: item.meal_time,
    })),
    rule_summary: {
      no_repeat_days: 21,
      allergy_decision_authority: 'server_validation',
      ai_output_is_draft_only: true,
    },
  }
}

function getCandidateRecipes(
  context: Record<string, unknown>,
  options: { max: number; includeFreezerFirst: boolean; inventoryForecast: InventoryForecast },
) {
  const recipes = arrayRecords(context.recipes)
  const recipeIngredients = arrayRecords(context.recipe_ingredients)
  const ingredients = arrayRecords(context.ingredients)
  const menuHistory = arrayRecords(context.menu_history)
  const pantry = arrayRecords(context.pantry)
  const freezer = arrayRecords(context.freezer)
  const ingredientById = new Map(ingredients.map((ingredient) => [String(ingredient.id), ingredient]))
  const pantryByIngredient = new Map<string, number>()
  for (const item of pantry) {
    const ingredientId = String(item.ingredient_id || '')
    pantryByIngredient.set(ingredientId, (pantryByIngredient.get(ingredientId) || 0) + Number(item.quantity_available || 0))
  }
  const today = new Date(`${todayIso()}T12:00:00Z`)
  const candidates = recipes.map((recipe) => {
    const rows = recipeIngredients.filter((row) => String(row.recipe_id) === String(recipe.id))
    const allergy = validateRecipeAllergyFromRows(rows, ingredientById, context)
    const rotation = lastServedDaysAgo(String(recipe.id || ''), menuHistory, today)
    const pantryCoverage = pantryCoverageFor(rows, pantryByIngredient)
    const freezerItem = freezer.find((item) => String(item.recipe_id || '') === String(recipe.id || '') && Number(item.portions_available || 0) > 0)
    const nutritionRows = rows.map((row) => ingredientById.get(String(row.ingredient_id || ''))).filter(Boolean)
    const missingNutrition = nutritionRows.some((ingredient) => Number(ingredient?.calories_per_100g || 0) <= 0 && Number(ingredient?.protein_g_per_100g || 0) <= 0)
    const score =
      (allergy.status === 'safe' ? 50 : allergy.status === 'review_needed' ? 10 : -100) +
      (rotation == null || rotation >= 21 ? 20 : -20) +
      (missingNutrition ? -8 : 10) +
      Math.round(pantryCoverage * 15) +
      (freezerItem && options.includeFreezerFirst ? 15 : 0)
    return {
      id: recipe.id,
      name: recipe.name,
      category: recipe.category || 'other',
      meal_style: recipe.meal_style || null,
      main_protein: recipe.main_protein || null,
      calories_per_serving: recipe.calories_per_serving || null,
      protein_per_serving: recipe.protein_g_per_serving || null,
      allergy_status: allergy.status,
      allergy_notes: allergy.notes,
      last_served_days_ago: rotation,
      pantry_coverage: Number(pantryCoverage.toFixed(2)),
      freezer_available: Boolean(freezerItem),
      category_code: inferRecipeCategoryCode(recipe, rows, ingredientById, context),
      school_friendly: Boolean(recipe.is_school_friendly),
      freezer_friendly: Boolean(recipe.is_freezer_friendly),
      missing_nutrition: missingNutrition,
      score,
    }
  })
  return candidates
    .filter((candidate) => candidate.allergy_status !== 'blocked')
    .sort((a, b) => Number(b.score) - Number(a.score))
    .slice(0, options.max)
}

function validateRecipeAllergyFromRows(
  rows: Array<Record<string, unknown>>,
  ingredientById: Map<string, Record<string, unknown>>,
  context: Record<string, unknown>,
) {
  const allergies = arrayRecords(context.allergies)
  const blockedTerms = allergies.flatMap((allergy) => [allergy.normalized_allergen_name, allergy.allergen_name]).filter(Boolean).map((value) => String(value).toLowerCase())
  const reviewTerms = blockedTerms.filter((term) => /generic|lentil|trace|may contain/i.test(term))
  const ingredientText = rows.map((row) => {
    const ingredient = ingredientById.get(String(row.ingredient_id || ''))
    return [
      ingredient?.name,
      ingredient?.normalized_name,
      ...(Array.isArray(ingredient?.allergen_tags) ? ingredient.allergen_tags : []),
      ...(Array.isArray(ingredient?.may_contain_tags) ? ingredient.may_contain_tags : []),
    ].filter(Boolean).join(' ')
  }).join(' ').toLowerCase()
  const blocked = blockedTerms.filter((term) => term && !reviewTerms.includes(term) && ingredientText.includes(term))
  if (blocked.length) return { status: 'blocked', notes: blocked.slice(0, 5) }
  const review = reviewTerms.filter((term) => term && ingredientText.includes(term))
  if (review.length) return { status: 'review_needed', notes: review.slice(0, 5) }
  return { status: 'safe', notes: [] as string[] }
}

function lastServedDaysAgo(recipeId: string, history: Array<Record<string, unknown>>, today: Date) {
  const previous = history
    .filter((item) => String(item.recipe_id || '') === recipeId && String(item.planned_date || '') <= todayIso())
    .sort((a, b) => String(b.planned_date).localeCompare(String(a.planned_date)))[0]
  if (!previous?.planned_date) return null
  return Math.max(0, -daysBetween(today, String(previous.planned_date)))
}

function pantryCoverageFor(rows: Array<Record<string, unknown>>, pantryByIngredient: Map<string, number>) {
  const required = rows.reduce((sum, row) => sum + Number(row.quantity_g || 0), 0)
  if (required <= 0) return 0
  const covered = rows.reduce((sum, row) => {
    const ingredientId = String(row.ingredient_id || '')
    return sum + Math.min(Number(row.quantity_g || 0), pantryByIngredient.get(ingredientId) || 0)
  }, 0)
  return Math.max(0, Math.min(1, covered / required))
}

function inferRecipeCategoryCode(
  recipe: Record<string, unknown>,
  rows: Array<Record<string, unknown>>,
  ingredientById: Map<string, Record<string, unknown>>,
  context: Record<string, unknown>,
) {
  const suggestion = {
    title: [recipe.name, recipe.category, recipe.main_protein].filter(Boolean).join(' '),
    ingredients: rows.map((row) => ingredientById.get(String(row.ingredient_id || ''))?.name).filter(Boolean),
  }
  return inferCategoryCode(suggestion, arrayRecords(context.food_categories)) || 'other'
}

function validateMenuPlanOutput(
  output: Record<string, unknown>,
  context: Record<string, unknown>,
  inventoryForecast: InventoryForecast,
  action: string,
  candidateRecipes: Array<Record<string, unknown>>,
) {
  const categoryCodes = new Set(arrayRecords(context.food_categories).map((category) => String(category.code)))
  const recipeById = new Map(arrayRecords(context.recipes).map((recipe) => [String(recipe.id), recipe]))
  const menuPlan = output.menu_plan as Record<string, unknown> | undefined
  const days = Array.isArray(menuPlan?.days) ? menuPlan.days as Array<Record<string, unknown>> : []
  const candidateIds = new Set(candidateRecipes.map((recipe) => String(recipe.id)))
  const validatedDays = days.map((day) => {
    const meals = Array.isArray(day.meals) ? day.meals as Array<Record<string, unknown>> : []
    return {
      ...day,
      meals: meals.map((meal) => validateMenuMeal(meal, String(day.date || ''), context, inventoryForecast, recipeById, candidateIds, categoryCodes)),
    }
  })
  const suggestions = validatedDays.flatMap((day) => arrayRecords(day.meals).map((meal) => ({
    title: meal.recipe_name || meal.title || 'AI meal suggestion',
    recipe_id: meal.recipe_id || null,
    planned_date: day.date,
    meal_time: meal.meal_time,
    ingredients: [],
    category_code: Array.isArray(meal.category_codes) ? meal.category_codes[0] || 'other' : 'other',
    nutrition: {
      calories: meal.calories || null,
      protein_g: meal.protein_g || null,
    },
    safety_status: meal.status || 'review_needed',
    usable: meal.status === 'safe',
    rotation_status: meal.rotation_status || 'review_needed',
    nutrition_status: meal.nutrition_status || 'review_needed',
    inventory_status: meal.inventory_status || 'safe',
    safety_notes: [...(Array.isArray(meal.warnings) ? meal.warnings.map(String) : []), String(meal.reason || '')].filter(Boolean),
    confidence: 0.75,
  })))
  const status = suggestions.some((suggestion) => suggestion.safety_status === 'blocked')
    ? 'blocked'
    : suggestions.some((suggestion) => suggestion.safety_status === 'review_needed') || inventoryForecast.warnings.length > 0
      ? 'review_needed'
      : 'safe'
  return {
    ...output,
    menu_plan: {
      title: String(menuPlan?.title || 'AI weekly menu draft'),
      start_date: String(menuPlan?.start_date || todayIso()),
      end_date: String(menuPlan?.end_date || todayIso()),
      days: validatedDays,
    },
    suggestions,
    usable_suggestions: suggestions.filter((suggestion) => suggestion.usable),
    candidate_recipe_count: candidateRecipes.length,
    validation_summary: {
      status,
      reasons: [
        `Action ${action} validated server-side.`,
        `${candidateRecipes.length} candidate recipes considered before Gemini was called.`,
        `${inventoryForecast.missing_ingredients.length} missing ingredients detected.`,
      ],
      warnings: [
        ...inventoryForecast.warnings,
        ...validationWarnings(output.validation_summary),
      ],
    },
    missing_ingredients: inventoryForecast.missing_ingredients,
    expiring_items: inventoryForecast.expiring_items,
    freezer_first_candidates: inventoryForecast.freezer_first_candidates,
    purchase_priority: inventoryForecast.purchase_priority,
    tool_architecture: aiFunctionContracts,
  }
}

function validateRepairedMenuPlanOutput(
  output: Record<string, unknown>,
  context: Record<string, unknown>,
  inventoryForecast: InventoryForecast,
  action: string,
  candidateRecipes: Array<Record<string, unknown>>,
  originalDraft: unknown,
) {
  const originalPlan = normalizeMenuPlanDraft(originalDraft)
  const repaired = validateMenuPlanOutput(output, context, inventoryForecast, action, candidateRecipes)
  if (!originalPlan) {
    return {
      ...repaired,
      repair_summary: {
        repaired_slots: 0,
        preserved_safe_slots: 0,
        note: 'No original draft menu was provided; validated returned draft only.',
      },
    }
  }

  const returnedPlan = repaired.menu_plan as Record<string, unknown>
  const returnedDays = new Map(arrayRecords(returnedPlan.days).map((day) => [String(day.date || ''), day]))
  let repairedSlots = 0
  let preservedSafeSlots = 0
  const days = originalPlan.days.map((originalDay) => {
    const candidateDay = returnedDays.get(String(originalDay.date || ''))
    const candidateMeals = new Map(arrayRecords(candidateDay?.meals).map((meal) => [slotKey(String(originalDay.date || ''), meal), meal]))
    const meals = originalDay.meals.map((originalMeal) => {
      const status = String(originalMeal.status || originalMeal.safety_status || 'review_needed')
      const key = slotKey(String(originalDay.date || ''), originalMeal)
      if (status === 'safe') {
        preservedSafeSlots += 1
        return originalMeal
      }
      const replacement = candidateMeals.get(key)
      if (replacement) {
        repairedSlots += 1
        return replacement
      }
      return {
        ...originalMeal,
        status: 'review_needed',
        warnings: [
          ...arrayStrings(originalMeal.warnings),
          'Repair did not return a replacement for this problematic slot.',
        ],
      }
    })
    return { ...originalDay, meals }
  })

  const suggestions = days.flatMap((day) => day.meals.map((meal) => ({
    title: meal.recipe_name || 'AI meal suggestion',
    recipe_id: meal.recipe_id || null,
    planned_date: day.date,
    meal_time: meal.meal_time,
    ingredients: [],
    category_code: Array.isArray(meal.category_codes) ? meal.category_codes[0] || 'other' : 'other',
    nutrition: { calories: null, protein_g: null },
    safety_status: meal.status || 'review_needed',
    usable: meal.status === 'safe',
    rotation_status: meal.rotation_status || 'review_needed',
    nutrition_status: meal.nutrition_status || 'review_needed',
    inventory_status: meal.inventory_status || 'safe',
    safety_notes: [...arrayStrings(meal.warnings), String(meal.reason || '')].filter(Boolean),
    confidence: 0.75,
  })))
  const status = suggestions.some((suggestion) => suggestion.safety_status === 'blocked')
    ? 'blocked'
    : suggestions.some((suggestion) => suggestion.safety_status === 'review_needed')
      ? 'review_needed'
      : 'safe'

  return {
    ...repaired,
    menu_plan: {
      ...returnedPlan,
      title: String(returnedPlan.title || originalPlan.title || 'Repaired menu draft'),
      start_date: String(returnedPlan.start_date || originalPlan.start_date || ''),
      end_date: String(returnedPlan.end_date || originalPlan.end_date || ''),
      days,
    },
    suggestions,
    usable_suggestions: suggestions.filter((suggestion) => suggestion.usable),
    validation_summary: {
      status,
      reasons: [
        `Action ${action} validated server-side.`,
        `${repairedSlots} problematic slots repaired.`,
        `${preservedSafeSlots} safe slots preserved unchanged.`,
      ],
      warnings: validationWarnings(repaired.validation_summary),
    },
    repair_summary: {
      repaired_slots: repairedSlots,
      preserved_safe_slots: preservedSafeSlots,
      safe_slots_were_locked: true,
    },
  }
}

function normalizeMenuPlanDraft(value: unknown) {
  const plan = value as Record<string, unknown> | null
  if (!plan || typeof plan !== 'object') return null
  return {
    title: String(plan.title || ''),
    start_date: String(plan.start_date || ''),
    end_date: String(plan.end_date || ''),
    days: arrayRecords(plan.days).map((day) => ({
      ...day,
      date: String(day.date || ''),
      meals: arrayRecords(day.meals),
    })),
  }
}

function slotKey(date: string, meal: Record<string, unknown>) {
  return `${date}::${String(meal.meal_time || '')}`
}

function arrayStrings(value: unknown) {
  return Array.isArray(value) ? value.map(String) : []
}

function validateMenuMeal(
  meal: Record<string, unknown>,
  date: string,
  context: Record<string, unknown>,
  inventoryForecast: InventoryForecast,
  recipeById: Map<string, Record<string, unknown>>,
  candidateIds: Set<string>,
  categoryCodes: Set<string>,
) {
  const recipeId = String(meal.recipe_id || '')
  const warnings = Array.isArray(meal.warnings) ? meal.warnings.map(String) : []
  const recipe = recipeId ? recipeById.get(recipeId) : null
  const categoryCodesForMeal = Array.isArray(meal.category_codes) ? meal.category_codes.map(String) : []
  const invalidCategories = categoryCodesForMeal.filter((code) => !categoryCodes.has(code))
  const rotation = validateRotation({ recipe_id: recipeId, planned_date: date }, arrayRecords(context.menu_history))
  const inventoryValidation = validateInventorySuggestion({ ingredients: [recipe?.name || meal.recipe_name || ''] }, inventoryForecast)
  const reasons = [
    ...warnings,
    ...invalidCategories.map((code) => `Unknown category "${code}" mapped to other.`),
    ...(!recipeId ? ['AI did not provide an existing recipe_id; treat as a draft recipe suggestion.'] : []),
    ...(recipeId && !candidateIds.has(recipeId) ? ['Recipe was not in the prevalidated candidate set.'] : []),
    ...(rotation.note ? [rotation.note] : []),
    ...inventoryValidation.notes,
  ]
  const status = !recipeId || !recipe || (recipeId && !candidateIds.has(recipeId)) || invalidCategories.length || rotation.status === 'blocked' || inventoryValidation.status !== 'safe'
    ? 'review_needed'
    : String(meal.status || 'review_needed') === 'blocked'
      ? 'blocked'
      : 'safe'
  return {
    ...meal,
    recipe_id: recipeId || null,
    recipe_name: String(meal.recipe_name || recipe?.name || 'AI meal suggestion'),
    servings: Math.max(1, Number(meal.servings || 1)),
    diner_ids: Array.isArray(meal.diner_ids) ? meal.diner_ids.map(String) : arrayRecords(context.diners).map((diner) => String(diner.id)),
    category_codes: invalidCategories.length ? ['other'] : categoryCodesForMeal.length ? categoryCodesForMeal : ['other'],
    status,
    rotation_status: rotation.status,
    inventory_status: inventoryValidation.status,
    nutrition_status: recipe ? 'available' : 'review_needed',
    warnings: reasons,
  }
}

function validateCopilotOutput(
  output: Record<string, unknown>,
  context: Record<string, unknown>,
  inventoryForecast: InventoryForecast,
  action: string,
  pageContext: unknown,
) {
  const page = pageContext && typeof pageContext === 'object' ? pageContext as Record<string, unknown> : {}
  const rawSuggestions = arrayRecords(output.suggestions)
  const normalizedInput = {
    suggestions: rawSuggestions.map((suggestion, index) => ({
      title: suggestion.title || `Copilot suggestion ${index + 1}`,
      ingredients: Array.isArray(suggestion.ingredients) ? suggestion.ingredients : arrayRecords(suggestion.data).map((item) => item.ingredient).filter(Boolean),
      recipe_id: (suggestion.data as Record<string, unknown> | undefined)?.recipe_id || suggestion.recipe_id || null,
      planned_date: (suggestion.data as Record<string, unknown> | undefined)?.planned_date || null,
      category_code: (suggestion.data as Record<string, unknown> | undefined)?.category_code || suggestion.category_code || null,
      nutrition: (suggestion.data as Record<string, unknown> | undefined)?.nutrition || suggestion.nutrition || null,
      safety_status: suggestion.status || suggestion.safety_status || 'review_needed',
      safety_notes: Array.isArray(suggestion.warnings) ? suggestion.warnings : [],
    })),
  }
  const deterministic = validateAiOutput(normalizedInput, context, inventoryForecast, action)
  const deterministicSuggestions = arrayRecords(deterministic.suggestions)
  const suggestions = rawSuggestions.map((suggestion, index) => {
    const checked = deterministicSuggestions[index] || {}
    const rawStatus = String(suggestion.status || checked.safety_status || 'review_needed')
    const data = suggestion.data && typeof suggestion.data === 'object' ? suggestion.data as Record<string, unknown> : {}
    let applyOption = String(suggestion.apply_option || 'no_apply_available')
    const missingRequiredData =
      (applyOption === 'apply_menu_patch' && !(data.recipe_id && data.planned_date && data.meal_time)) ||
      (applyOption === 'create_shopping_item' && !(data.ingredient_id && data.quantity)) ||
      (applyOption === 'apply_recipe_patch' && !(data.recipe_id || data.recipe_payload))
    const status = rawStatus === 'blocked' || checked.safety_status === 'blocked'
      ? 'blocked'
      : rawStatus === 'safe' && checked.safety_status === 'safe' && !missingRequiredData
        ? 'safe'
        : 'review_needed'
    if (status === 'blocked' || missingRequiredData) applyOption = 'no_apply_available'
    return {
      ...suggestion,
      id: String(suggestion.id || `copilot-${index + 1}`),
      status,
      safety_status: status,
      usable: status === 'safe',
      rotation_status: checked.rotation_status || 'review_needed',
      nutrition_status: checked.nutrition_status || 'review_needed',
      inventory_status: checked.inventory_status || 'review_needed',
      apply_option: applyOption,
      safety_notes: [
        ...arrayStrings(suggestion.warnings),
        ...arrayStrings(checked.safety_notes),
        ...(missingRequiredData ? ['Suggestion is missing structured data required for safe apply.'] : []),
      ],
    }
  })
  const status = suggestions.some((suggestion) => suggestion.status === 'blocked')
    ? 'blocked'
    : suggestions.some((suggestion) => suggestion.status === 'review_needed')
      ? 'review_needed'
      : 'safe'

  return {
    status,
    page_id: String(output.page_id || page.page_id || 'dashboard'),
    action,
    title: String(output.title || 'AI Copilot suggestion'),
    summary: String(output.summary || 'Review the validated suggestions before applying any change.'),
    suggestions,
    usable_suggestions: suggestions.filter((suggestion) => suggestion.usable),
    warnings: [
      ...arrayStrings(output.warnings),
      ...inventoryForecast.warnings,
    ],
    validation_summary: {
      status,
      reasons: [
        `Contextual action ${action} validated server-side.`,
        'AI output is draft-only and no data was saved automatically.',
      ],
      warnings: [
        ...arrayStrings((output.validation_summary as Record<string, unknown> | undefined)?.warnings),
        ...inventoryForecast.warnings,
      ],
    },
    apply_options: suggestions.map((suggestion) => suggestion.apply_option),
    missing_ingredients: inventoryForecast.missing_ingredients,
    expiring_items: inventoryForecast.expiring_items,
    freezer_first_candidates: inventoryForecast.freezer_first_candidates,
    purchase_priority: inventoryForecast.purchase_priority,
    tool_architecture: aiFunctionContracts,
  }
}

function validateAiOutput(
  output: Record<string, unknown>,
  context: Record<string, unknown>,
  inventoryForecast: InventoryForecast,
  action: string,
) {
  const allergies = Array.isArray(context.allergies) ? context.allergies as Array<Record<string, unknown>> : []
  const menuHistory = Array.isArray(context.menu_history) ? context.menu_history as Array<Record<string, unknown>> : []
  const categoryCodes = new Set(arrayRecords(context.food_categories).map((category) => String(category.code)))
  const categories = arrayRecords(context.food_categories)
  const blockedTerms = allergies
    .flatMap((allergy) => [allergy.allergen_name, allergy.normalized_allergen_name])
    .filter(Boolean)
    .map((value) => String(value).toLowerCase())
  const suggestions = Array.isArray(output.suggestions) ? output.suggestions as Array<Record<string, unknown>> : []

  const validatedSuggestions = suggestions.map((suggestion) => {
    const ingredients = Array.isArray(suggestion.ingredients) ? suggestion.ingredients.map(String) : []
    const text = `${suggestion.title || ''} ${ingredients.join(' ')}`.toLowerCase()
    const matched = blockedTerms.filter((term) => term && text.includes(term))
    const rotation = validateRotation(suggestion, menuHistory)
    const nutrition = suggestion.nutrition as Record<string, unknown> | undefined
    const missingNutrition = !nutrition || nutrition.calories == null || nutrition.protein_g == null
    const existingStatus = String(suggestion.safety_status || 'review_needed')
    const inventoryValidation = validateInventorySuggestion(suggestion, inventoryForecast)
    const category = normalizeSuggestionCategory(suggestion, categories, categoryCodes)
    const safetyStatus = matched.length > 0
      ? 'blocked'
      : rotation.status === 'blocked' || missingNutrition || inventoryValidation.status === 'review_needed' || Boolean(category.warning)
        ? 'review_needed'
        : inventoryValidation.status === 'blocked'
          ? 'blocked'
        : existingStatus
    return {
      ...suggestion,
      category_code: category.code,
      safety_status: safetyStatus,
      usable: safetyStatus === 'safe',
      rotation_status: rotation.status,
      nutrition_status: missingNutrition ? 'review_needed' : 'available',
      inventory_status: inventoryValidation.status,
      safety_notes: [
        ...((Array.isArray(suggestion.safety_notes) ? suggestion.safety_notes : []) as string[]),
        ...(matched.length ? [`Blocked terms detected: ${matched.join(', ')}`] : []),
        ...(rotation.note ? [rotation.note] : []),
        ...(missingNutrition ? ['Nutrition data is incomplete.'] : []),
        ...inventoryValidation.notes,
        ...(category.warning ? [category.warning] : []),
      ],
    }
  })
  const status = validatedSuggestions.some((suggestion) => suggestion.safety_status === 'blocked')
    ? 'blocked'
    : validatedSuggestions.some((suggestion) => suggestion.safety_status === 'review_needed') || inventoryForecast.warnings.length > 0
      ? 'review_needed'
      : 'safe'

  return {
    ...output,
    suggestions: validatedSuggestions,
    usable_suggestions: validatedSuggestions.filter((suggestion) => suggestion.usable),
    validation_summary: {
      status,
      reasons: [
        `Action ${action} validated server-side.`,
        `${inventoryForecast.missing_ingredients.length} missing ingredients detected.`,
        `${inventoryForecast.freezer_first_candidates.length} freezer-first candidates detected.`,
      ],
      warnings: inventoryForecast.warnings,
    },
    missing_ingredients: inventoryForecast.missing_ingredients,
    expiring_items: inventoryForecast.expiring_items,
    freezer_first_candidates: inventoryForecast.freezer_first_candidates,
    purchase_priority: inventoryForecast.purchase_priority,
  }
}

function validationWarnings(value: unknown) {
  const summary = value as { warnings?: unknown[] } | null
  return Array.isArray(summary?.warnings) ? summary.warnings.map(String) : []
}

function normalizeSuggestionCategory(
  suggestion: Record<string, unknown>,
  categories: Array<Record<string, unknown>>,
  categoryCodes: Set<string>,
) {
  const rawCode = String(suggestion.category_code || '').trim()
  if (rawCode && categoryCodes.has(rawCode)) return { code: rawCode, warning: '' }
  const inferred = inferCategoryCode(suggestion, categories)
  if (rawCode && !categoryCodes.has(rawCode)) {
    return {
      code: inferred || 'other',
      warning: `Unknown category "${rawCode}" mapped to ${inferred || 'other'}.`,
    }
  }
  if (inferred) return { code: inferred, warning: `Missing category_code inferred as ${inferred}.` }
  return { code: 'other', warning: 'Missing category_code mapped to other.' }
}

function inferCategoryCode(suggestion: Record<string, unknown>, categories: Array<Record<string, unknown>>) {
  const text = [
    suggestion.title,
    ...(Array.isArray(suggestion.ingredients) ? suggestion.ingredients : []),
  ].filter(Boolean).join(' ').toLowerCase()
  if (!text) return ''
  const match = categories.find((category) => {
    const searchable = [
      category.code,
      category.name_en,
      category.name_es,
      ...(Array.isArray(category.aliases_en) ? category.aliases_en : []),
      ...(Array.isArray(category.aliases_es) ? category.aliases_es : []),
    ].filter(Boolean).join(' ').toLowerCase()
    return searchable.split(/\s+/).some((term) => term.length > 2 && text.includes(term))
  })
  return match?.code ? String(match.code) : ''
}

function rateLimitedAiResponse({
  model,
  action,
  context,
  inventoryForecast,
  retryAfterSeconds,
  lastError,
}: {
  model: string
  action: string
  context: Record<string, unknown>
  inventoryForecast: InventoryForecast
  retryAfterSeconds: number | null
  lastError?: string | null
}) {
  const reason = lastError || 'Gemini quota or rate limit was reached. Retry later or change model in Settings.'
  return {
    configured: false,
    model,
    action,
    ai_provider: 'gemini',
    ai_key_source: 'user',
    ai_configured: false,
    code: 'gemini_rate_limited',
    message: reason,
    suggested_action: 'Wait for quota to reset, test again later, or switch to Gemini 2.5 Flash-Lite in Settings.',
    retry_after_seconds: retryAfterSeconds,
    context_summary: summarizeContext(context),
    inventory_forecast: inventoryAwareActions.has(action) || menuPlanActions.has(action) ? inventoryForecast : undefined,
    suggestions: [],
    usable_suggestions: [],
    validation_summary: {
      status: 'review_needed',
      reasons: [reason],
      warnings: retryAfterSeconds ? [`Retry after approximately ${retryAfterSeconds} seconds.`] : ['Retry later or use a lower-cost Gemini model.'],
    },
    missing_ingredients: inventoryForecast.missing_ingredients,
    expiring_items: inventoryForecast.expiring_items,
    freezer_first_candidates: inventoryForecast.freezer_first_candidates,
    purchase_priority: inventoryForecast.purchase_priority,
    safety: {
      status: 'review_needed',
      reason,
    },
  }
}

function fallbackAiResponse({
  configured,
  model,
  action,
  context,
  inventoryForecast,
  reason,
  aiKeySource = 'not_configured',
}: {
  configured: boolean
  model: string
  action: string
  context: Record<string, unknown>
  inventoryForecast: InventoryForecast
  reason: string
  aiKeySource?: string
}) {
  const fallback = {
    title: 'AI suggestion requires review',
    recipe_id: null,
    planned_date: null,
    meal_time: null,
    ingredients: [],
    nutrition: {
      calories: null,
      protein_g: null,
    },
    safety_status: 'review_needed',
    usable: false,
    rotation_status: 'review_needed',
    nutrition_status: 'review_needed',
    safety_notes: [reason, 'No usable suggestion was returned by the AI provider.'],
    confidence: 0,
  }

  return {
    configured,
    model,
    action,
    ai_provider: 'gemini',
    ai_key_source: aiKeySource,
    ai_configured: configured,
    context_summary: summarizeContext(context),
    inventory_forecast: inventoryAwareActions.has(action) ? inventoryForecast : undefined,
    suggestions: [fallback],
    usable_suggestions: [],
    validation_summary: {
      status: 'review_needed',
      reasons: [reason],
      warnings: inventoryForecast.warnings,
    },
    missing_ingredients: inventoryForecast.missing_ingredients,
    expiring_items: inventoryForecast.expiring_items,
    freezer_first_candidates: inventoryForecast.freezer_first_candidates,
    purchase_priority: inventoryForecast.purchase_priority,
    safety: {
      status: 'review_needed',
      reason,
    },
  }
}

async function markUserRateLimited(
  admin: ReturnType<typeof createClient>,
  userId: string,
  model: string,
  lastError: string | null,
  retryAfterSeconds: number | null,
) {
  await admin.from('user_ai_settings').update({
    model,
    is_enabled: true,
    key_status: 'rate_limited',
    last_error: lastError,
    last_tested_at: new Date().toISOString(),
    last_rate_limited_at: new Date().toISOString(),
    retry_after_seconds: retryAfterSeconds,
  }).eq('profile_id', userId).eq('provider', 'gemini')
}

function friendlyProviderError(status: number, model: string) {
  if (status === 429) return `Gemini quota or rate limit was reached for ${model} (HTTP 429).`
  if (status === 400 || status === 404) return `Gemini rejected the structured request for ${model}.`
  if (status === 401 || status === 403) return 'Gemini rejected this API key.'
  if (status >= 500) return `Gemini is temporarily unavailable for ${model} (HTTP ${status}).`
  return `Gemini request failed for ${model} (HTTP ${status}).`
}

function retryAfterSecondsFromResponse(response: Response, body: unknown) {
  const retryAfter = response.headers.get('retry-after')
  if (retryAfter && /^\d+$/.test(retryAfter)) return Number(retryAfter)
  const details = (body as { error?: { details?: Array<Record<string, unknown>> } } | null)?.error?.details || []
  for (const detail of details) {
    const retryDelay = detail.retryDelay
    if (typeof retryDelay === 'string') {
      const seconds = Number(retryDelay.replace(/s$/, ''))
      if (Number.isFinite(seconds)) return seconds
    }
  }
  return null
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
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['decrypt'])
}

function base64ToBytes(value: string) {
  const binary = atob(value)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

function validateRotation(suggestion: Record<string, unknown>, history: Array<Record<string, unknown>>) {
  const recipeId = String(suggestion.recipe_id || '')
  const plannedDate = String(suggestion.planned_date || new Date().toISOString().slice(0, 10))
  if (!recipeId) return { status: 'review_needed', note: 'No recipe_id provided for rotation validation.' }
  const previous = history
    .filter((item) => String(item.recipe_id) === recipeId && String(item.planned_date) < plannedDate)
    .sort((a, b) => String(b.planned_date).localeCompare(String(a.planned_date)))[0]
  if (!previous) return { status: 'allowed', note: '' }
  const days = Math.round((new Date(`${plannedDate}T12:00:00`).getTime() - new Date(`${String(previous.planned_date)}T12:00:00`).getTime()) / 86_400_000)
  if (days >= 21) return { status: 'allowed', note: '' }
  return {
    status: 'blocked',
    note: `Menu rotation review: recipe was served ${days} days ago and should wait ${21 - days} more days.`,
  }
}

interface InventoryForecast {
  missing_ingredients: Array<Record<string, unknown>>
  expiring_items: Array<Record<string, unknown>>
  freezer_first_candidates: Array<Record<string, unknown>>
  purchase_priority: Array<Record<string, unknown>>
  warnings: string[]
}

function calculateInventoryForecast(context: Record<string, unknown>): InventoryForecast {
  const ingredients = arrayRecords(context.ingredients)
  const recipes = arrayRecords(context.recipes)
  const recipeIngredients = arrayRecords(context.recipe_ingredients)
  const pantry = arrayRecords(context.pantry)
  const freezer = arrayRecords(context.freezer)
  const menuItems = arrayRecords(context.menu_history)
  const today = new Date(`${todayIso()}T12:00:00Z`)

  const ingredientById = new Map(ingredients.map((ingredient) => [String(ingredient.id), ingredient]))
  const recipeById = new Map(recipes.map((recipe) => [String(recipe.id), recipe]))
  const pantryByIngredient = new Map<string, number>()
  for (const item of pantry) {
    const ingredientId = String(item.ingredient_id || '')
    pantryByIngredient.set(ingredientId, (pantryByIngredient.get(ingredientId) || 0) + Number(item.quantity_available || 0))
  }

  const upcoming = menuItems.filter((item) => {
    const diff = daysBetween(today, String(item.planned_date || ''))
    return diff >= 0 && diff <= 7
  })
  const requiredByIngredient = new Map<string, { quantity: number; earliestDate?: string; recipes: Set<string> }>()
  for (const item of upcoming) {
    const recipe = recipeById.get(String(item.recipe_id || ''))
    if (!recipe) continue
    const servings = Math.max(Number(recipe.servings || 1), 1)
    const itemServings = Math.max(Number(item.servings || 1), 1)
    for (const row of recipeIngredients.filter((candidate) => String(candidate.recipe_id) === String(recipe.id))) {
      const ingredientId = String(row.ingredient_id || '')
      const current = requiredByIngredient.get(ingredientId) || { quantity: 0, recipes: new Set<string>() }
      current.quantity += (Number(row.quantity_g || 0) / servings) * itemServings
      current.earliestDate = [current.earliestDate, String(item.planned_date || '')].filter(Boolean).sort()[0]
      current.recipes.add(String(recipe.name || ''))
      requiredByIngredient.set(ingredientId, current)
    }
  }

  const purchaseRows = Array.from(requiredByIngredient.entries()).map(([ingredientId, required]) => {
    const ingredient = ingredientById.get(ingredientId)
    const available = pantryByIngredient.get(ingredientId) || 0
    const missing = Math.max(0, required.quantity - available)
    const daysUntilNeeded = required.earliestDate ? daysBetween(today, required.earliestDate) : undefined
    const priority = priorityFor(daysUntilNeeded, missing)
    return {
      ingredient_id: ingredientId,
      ingredient: String(ingredient?.name || ingredientId),
      required_quantity_g: Math.round(required.quantity),
      available_quantity_g: Math.round(available),
      missing_quantity_g: Math.round(missing),
      earliest_date: required.earliestDate || null,
      recipes: Array.from(required.recipes),
      priority,
      reason: missing > 0 ? 'missing_for_upcoming_menu' : 'covered_by_pantry',
    }
  })

  const pantryExpiring = pantry
    .filter((item) => isWithinDays(String(item.expiration_date || ''), 7, today))
    .map((item) => ({
      type: 'pantry',
      ingredient: String(ingredientById.get(String(item.ingredient_id || ''))?.name || item.ingredient_id || ''),
      expiration_date: item.expiration_date,
      quantity_available: item.quantity_available,
    }))
  const freezerExpiring = freezer
    .filter((item) => isWithinDays(String(item.expiration_date || ''), 10, today))
    .map((item) => {
      const recipe = recipeById.get(String(item.recipe_id || ''))
      return {
        type: 'freezer',
        recipe_id: item.recipe_id,
        recipe: String(recipe?.name || item.recipe_id || ''),
        expiration_date: item.expiration_date,
        portions_available: item.portions_available,
      }
    })
  const freezerLow = freezer
    .filter((item) => Number(item.portions_available || 0) <= 2)
    .map((item) => {
      const recipe = recipeById.get(String(item.recipe_id || ''))
      return {
        recipe_id: item.recipe_id,
        recipe: String(recipe?.name || item.recipe_id || ''),
        portions_available: item.portions_available,
        reason: 'low_portions',
      }
    })

  const warnings = [
    ...purchaseRows.filter((row) => Number(row.missing_quantity_g) > 0).map((row) => `Missing ${row.missing_quantity_g}g of ${row.ingredient}.`),
    ...freezerExpiring.map((item) => `${item.recipe} freezer item expires soon.`),
  ]

  return {
    missing_ingredients: purchaseRows.filter((row) => Number(row.missing_quantity_g) > 0),
    expiring_items: [...pantryExpiring, ...freezerExpiring],
    freezer_first_candidates: [...freezerExpiring, ...freezerLow],
    purchase_priority: purchaseRows.filter((row) => Number(row.missing_quantity_g) > 0 || row.priority === 'low'),
    warnings,
  }
}

function validateInventorySuggestion(suggestion: Record<string, unknown>, forecast: InventoryForecast) {
  const ingredients = Array.isArray(suggestion.ingredients) ? suggestion.ingredients.map((item) => String(item).toLowerCase()) : []
  const missing = forecast.missing_ingredients.filter((item) => {
    const name = String(item.ingredient || '').toLowerCase()
    return name && ingredients.some((ingredient) => ingredient.includes(name) || name.includes(ingredient))
  })
  if (missing.length > 0) {
    return {
      status: 'review_needed',
      notes: missing.map((item) => `Inventory review: ${item.ingredient} is missing ${item.missing_quantity_g}g.`),
    }
  }
  return { status: 'safe', notes: [] as string[] }
}

function arrayRecords(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value as Array<Record<string, unknown>> : []
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function daysBetween(start: Date, endIso: string) {
  if (!endIso) return Number.POSITIVE_INFINITY
  const end = new Date(`${endIso}T12:00:00Z`)
  if (Number.isNaN(end.getTime())) return Number.POSITIVE_INFINITY
  return Math.round((end.getTime() - start.getTime()) / 86_400_000)
}

function isWithinDays(dateIso: string, days: number, today: Date) {
  const diff = daysBetween(today, dateIso)
  return diff >= 0 && diff <= days
}

function priorityFor(daysUntilNeeded: number | undefined, missingQuantity: number) {
  if (missingQuantity <= 0) return 'low'
  if (daysUntilNeeded !== undefined && daysUntilNeeded <= 2) return 'critical'
  if (daysUntilNeeded !== undefined && daysUntilNeeded <= 5) return 'high'
  if (daysUntilNeeded !== undefined && daysUntilNeeded <= 7) return 'medium'
  return 'low'
}

async function createAiAlerts(
  admin: ReturnType<typeof createClient>,
  context: Record<string, unknown>,
  suggestions: Array<Record<string, unknown>>,
) {
  const family = context.family as { id?: string } | null
  if (!family?.id) return
  const unsafe = suggestions.filter((suggestion) => suggestion.safety_status !== 'safe')
  if (unsafe.length === 0) return
  await admin.from('alerts').insert(unsafe.map((suggestion) => ({
    family_id: family.id,
    type: 'ai_safety_review',
    severity: suggestion.safety_status === 'blocked' ? 'critical' : 'warning',
    title: 'alerts.reviewRecipe',
    message: 'alerts.reviewRecipeMessage',
    related_table: 'recipes',
    related_id: suggestion.recipe_id || null,
  })))
}

function summarizeContext(context: Record<string, unknown>) {
  return {
    family: (context.family as { name?: string } | null)?.name,
    diners: Array.isArray(context.diners) ? context.diners.length : 0,
    allergies: Array.isArray(context.allergies) ? context.allergies.length : 0,
    ingredients: Array.isArray(context.ingredients) ? context.ingredients.length : 0,
    recipes: Array.isArray(context.recipes) ? context.recipes.length : 0,
  }
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}
