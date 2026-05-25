import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
loadEnv(resolve(root, '.env.local'))

const mode = process.argv[2] || 'all'
const config = {
  url: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  publishableKey: process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.APP_SUPABASE_SERVICE_ROLE_KEY,
  projectRef: process.env.SUPABASE_PROJECT_REF,
  accessToken: process.env.SUPABASE_ACCESS_TOKEN,
}

const requiredTables = [
  'profiles',
  'families',
  'family_users',
  'family_members',
  'allergies',
  'dietary_restrictions',
  'food_preferences',
  'ingredients',
  'recipes',
  'recipe_ingredients',
  'recipe_nutrition_cache',
  'menu_plans',
  'menu_plan_items',
  'pantry_inventory',
  'freezer_inventory',
  'shopping_lists',
  'shopping_list_items',
  'alerts',
  'app_settings',
  'user_ai_settings',
  'food_categories',
]

const safeRecipeNames = [
  'Gluten-Free Cheese-Free Pepperoni Pizza',
  'Beef Rice Bowl with Vegetables',
  'Ground Turkey Meatballs with Tomato Sauce',
  'Roasted Chicken with Sweet Potatoes',
  'Smoked Salmon Rice Bowl with Cucumber',
  'Gluten-Free Banana Muffins',
  'Rainbow Fruit Skewers',
  'Gluten-Free Lunchbox Bread',
  'Beef Burger with Gluten-Free Bun',
  'Gluten-Free Tortilla Tacos',
]

const blockedRecipeNames = [
  'Regular Wheat Pasta with Sauce',
  'Hummus with Tahini',
  'Wheat Bread Sandwich',
  'Sesame Seed Salad',
]

const reviewRecipeNames = ['Generic Lentil Soup']

main().catch((error) => {
  console.error(`FAIL ${sanitize(error?.message || String(error))}`)
  process.exit(1)
})

async function main() {
  if (['all', 'supabase', 'schema'].includes(mode)) await testSchema()
  if (['all', 'supabase', 'seed'].includes(mode)) await testSeedWorkspace()
  if (['all', 'rls'].includes(mode)) await testRls()
  if (['all', 'supabase', 'crud'].includes(mode)) await testCrud()
  if (['all', 'supabase', 'edge', 'smoke'].includes(mode)) await testEdgeFunction()
  if (['all', 'smoke', 'i18n'].includes(mode)) testI18n()
}

async function testSchema() {
  requireEnv(['SUPABASE_ACCESS_TOKEN', 'SUPABASE_PROJECT_REF'])
  const query = `
    with expected_tables(name) as (
      values ${requiredTables.map((table) => `('${table}')`).join(',')}
    ), expected_functions(name) as (
      values
        ('current_user_role'),
        ('is_super_admin'),
        ('can_access_family'),
        ('seed_demo_workspace'),
        ('can_write_owned_catalog'),
        ('has_family_membership')
    )
    select jsonb_build_object(
      'tables', (
        select jsonb_object_agg(e.name, jsonb_build_object('exists', c.oid is not null, 'rls', coalesce(c.relrowsecurity, false)))
        from expected_tables e
        left join pg_class c on c.relname = e.name and c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
      ),
      'functions', (
        select jsonb_object_agg(e.name, p.oid is not null)
        from expected_functions e
        left join pg_proc p on p.proname = e.name and p.pronamespace = 'public'::regnamespace
      )
    ) as result;
  `
  const result = await managementSql(query)
  const payload = Array.isArray(result) ? result[0]?.result : result?.result
  assert(payload?.tables, 'Management SQL schema response did not include table metadata')
  for (const table of requiredTables) {
    assert(payload.tables?.[table]?.exists, `Missing remote table: ${table}`)
    assert(payload.tables?.[table]?.rls, `RLS is not enabled for table: ${table}`)
  }
  for (const [name, exists] of Object.entries(payload.functions || {})) {
    assert(exists, `Missing helper function: ${name}`)
  }
  pass(`Remote schema verified: ${requiredTables.length} tables with RLS`)
}

async function testSeedWorkspace() {
  const { userA } = await ensureQaUsers()
  const signed = await signIn(userA)
  const first = await signed.client.rpc('seed_demo_workspace')
  assert(!first.error, `seed_demo_workspace failed: ${first.error?.message}`)

  const family = await selectSingle(
    signed.client.from('families').select('*').eq('name', 'Galeano Family').limit(1),
    'Galeano Family',
  )
  const before = await seedCounts(signed.client, family.id)
  const second = await signed.client.rpc('seed_demo_workspace')
  assert(!second.error, `seed_demo_workspace second run failed: ${second.error?.message}`)
  const after = await seedCounts(signed.client, family.id)
  assert(JSON.stringify(before) === JSON.stringify(after), 'seed_demo_workspace created duplicate rows on second run')

  assert(before.diners >= 3, 'Seed diners were not created')
  assert(before.allergies >= 8, 'Soren allergy data was not created')
  assert(before.ingredients >= 27, 'Seed ingredients were not created')
  assert(before.recipes >= 15, 'Seed recipes were not created')

  await validateSeedRecipeSafety(signed.client, family.id)
  pass('seed_demo_workspace verified and idempotent')
}

async function testRls() {
  const { userA, userB, chef, viewer, superAdmin } = await ensureQaUsers()
  const familyA = await ensureFamily('SFM QA Family A', userA.id, chef.id)
  const familyB = await ensureFamily('SFM QA Family B', userB.id, null)
  await setMemberships([
    { family_id: familyA.id, profile_id: userA.id, role: 'family_admin' },
    { family_id: familyA.id, profile_id: chef.id, role: 'chef' },
    { family_id: familyA.id, profile_id: viewer.id, role: 'viewer' },
    { family_id: familyB.id, profile_id: userB.id, role: 'family_admin' },
  ])
  const fixtureA = await ensureFamilyFixture(familyA, userA.id, 'A')
  const fixtureB = await ensureFamilyFixture(familyB, userB.id, 'B')

  const a = await signIn(userA)
  const b = await signIn(userB)
  const chefSigned = await signIn(chef)
  const viewerSigned = await signIn(viewer)
  const superSigned = await signIn(superAdmin)

  await assertCanReadFamily(a.client, familyA.id, true, 'User A should read Family A')
  await assertCanReadFamily(a.client, familyB.id, false, 'User A must not read Family B')
  await assertCanReadFamily(b.client, familyA.id, false, 'User B must not read Family A')
  await assertCanReadFamily(b.client, familyB.id, true, 'User B should read Family B')
  await assertFilteredCount(a.client, 'family_members', 'family_id', familyB.id, 0, 'User A must not read Family B diners')
  await assertFilteredCount(a.client, 'ingredients', 'id', fixtureB.ingredientId, 0, 'User A must not read Family B ingredient')
  await assertFilteredCount(a.client, 'recipes', 'id', fixtureB.recipeId, 0, 'User A must not read Family B recipe')
  await assertFilteredCount(a.client, 'menu_plans', 'id', fixtureB.planId, 0, 'User A must not read Family B menu plan')
  await assertCanReadFamily(chefSigned.client, familyA.id, true, 'Chef should read assigned family')
  await assertCanReadFamily(chefSigned.client, familyB.id, false, 'Chef must not read unassigned family')
  await assertCanReadFamily(viewerSigned.client, familyA.id, true, 'Viewer should read assigned family')
  await expectInsertFailure(
    viewerSigned.client.from('family_members').insert({ family_id: familyA.id, full_name: 'Viewer Write Blocked' }).select(),
    'Viewer must not write family data',
  )
  await expectInsertFailure(
    viewerSigned.client.from('ingredients').insert({
      owner_id: viewer.id,
      scope: 'owner',
      name: 'Viewer Ingredient Blocked',
      normalized_name: 'viewer ingredient blocked',
    }).select(),
    'Viewer must not write owner-scoped ingredients',
  )
  await expectInsertFailure(
    a.client.from('family_members').insert({ family_id: familyB.id, full_name: 'Cross Family Blocked' }).select(),
    'Family admin must not write another family',
  )

  const allowedInsert = await a.client
    .from('family_members')
    .insert({ family_id: familyA.id, full_name: `SFM QA Allowed ${Date.now()}`, portion_factor: 1 })
    .select('id')
    .single()
  assert(!allowedInsert.error, `Family admin could not write own family: ${allowedInsert.error?.message}`)
  await adminClient().from('family_members').delete().eq('id', allowedInsert.data.id)

  const superRows = await superSigned.client.from('families').select('id').in('id', [familyA.id, familyB.id])
  assert(!superRows.error && superRows.data.length === 2, 'Super admin could not read all QA families')

  pass('Remote RLS isolation verified')
}

async function testCrud() {
  const { chef } = await ensureQaUsers()
  const signed = await signIn(chef)
  let familyId
  const today = isoDate(0)
  try {
    const family = await signed.client.from('families').insert({
      name: `SFM QA CRUD Family ${Date.now()}`,
      description: 'Remote CRUD QA family',
      owner_id: chef.id,
      chef_id: chef.id,
    }).select('*').single()
    assert(!family.error, `Family create failed: ${family.error?.message}`)
    familyId = family.data.id
    const familyUpdate = await signed.client.from('families').update({ notes: 'Edited by remote QA' }).eq('id', familyId)
    assert(!familyUpdate.error, `Family edit failed: ${familyUpdate.error?.message}`)

    const diner = await signed.client.from('family_members').insert({
      family_id: familyId,
      full_name: 'SFM QA Diner',
      nickname: 'QA',
      activity_level: 'high',
      portion_factor: 1.2,
      daily_calorie_target: 2100,
      daily_protein_target_g: 80,
    }).select('*').single()
    assert(!diner.error, `Diner create failed: ${diner.error?.message}`)
    const dinerUpdate = await signed.client.from('family_members').update({ portion_factor: 1.25 }).eq('id', diner.data.id)
    assert(!dinerUpdate.error, `Diner edit failed: ${dinerUpdate.error?.message}`)
    await insertOk(signed.client.from('allergies').insert({
      family_member_id: diner.data.id,
      allergen_name: 'sesame',
      normalized_allergen_name: 'sesame',
      severity: 'severe',
      avoid_traces: true,
    }), 'Allergy assign')
    await insertOk(signed.client.from('food_preferences').insert({
      family_member_id: diner.data.id,
      preference_type: 'likes',
      item_name: 'rice bowls',
    }), 'Preference assign')

    const chicken = await signed.client.from('ingredients').insert({
      owner_id: chef.id,
      family_id: familyId,
      scope: 'family',
      name: 'SFM QA Chicken',
      normalized_name: 'sfm qa chicken',
      category: 'protein',
      calories_per_100g: 165,
      protein_g_per_100g: 31,
      allergen_tags: [],
      may_contain_tags: [],
    }).select('*').single()
    assert(!chicken.error, `Ingredient create failed: ${chicken.error?.message}`)
    const rice = await signed.client.from('ingredients').insert({
      owner_id: chef.id,
      family_id: familyId,
      scope: 'family',
      name: 'SFM QA Rice',
      normalized_name: 'sfm qa rice',
      category: 'grain',
      calories_per_100g: 130,
      protein_g_per_100g: 2.7,
      carbs_g_per_100g: 28,
    }).select('*').single()
    assert(!rice.error, `Second ingredient create failed: ${rice.error?.message}`)
    await updateOk(
      signed.client.from('ingredients').update({ may_contain_tags: ['sesame'], protein_g_per_100g: 32 }).eq('id', chicken.data.id),
      'Ingredient nutrition/allergen edit',
    )

    const recipe = await signed.client.from('recipes').insert({
      owner_id: chef.id,
      family_id: familyId,
      scope: 'family',
      name: 'SFM QA Chicken Rice Bowl',
      category: 'lunch',
      main_protein: 'chicken',
      meal_style: 'bowl',
      servings: 4,
      serving_size_g: 300,
      instructions: 'Cook chicken and rice.',
      status: 'active',
      is_gluten_free: true,
    }).select('*').single()
    assert(!recipe.error, `Recipe create failed: ${recipe.error?.message}`)
    await insertOk(signed.client.from('recipe_ingredients').insert([
      { recipe_id: recipe.data.id, ingredient_id: chicken.data.id, quantity_g: 600, display_quantity: '600 g' },
      { recipe_id: recipe.data.id, ingredient_id: rice.data.id, quantity_g: 400, display_quantity: '400 g' },
    ]), 'Recipe ingredients in grams')
    const nutrition = calculateNutrition([
      { ingredient: { ...chicken.data, protein_g_per_100g: 32 }, grams: 600 },
      { ingredient: rice.data, grams: 400 },
    ], 4)
    await insertOk(signed.client.from('recipe_nutrition_cache').insert({
      recipe_id: recipe.data.id,
      total_weight_g: 1000,
      total_calories: nutrition.totalCalories,
      total_protein_g: nutrition.totalProtein,
      calories_per_serving: nutrition.caloriesPerServing,
      protein_g_per_serving: nutrition.proteinPerServing,
    }), 'Recipe nutrition cache')
    assert(Math.round(nutrition.caloriesPerServing) === 378, 'Nutrition calculation by 100 g failed')

    const duplicate = await signed.client.from('recipes').insert({
      ...stripRow(recipe.data),
      id: undefined,
      name: 'SFM QA Chicken Rice Bowl Copy',
      status: 'draft',
    }).select('*').single()
    assert(!duplicate.error, `Recipe duplicate failed: ${duplicate.error?.message}`)
    await updateOk(signed.client.from('recipes').update({ status: 'archived' }).eq('id', duplicate.data.id), 'Recipe archive')

    const plan = await signed.client.from('menu_plans').insert({
      family_id: familyId,
      name: 'SFM QA Weekly Menu',
      start_date: today,
      end_date: isoDate(6),
      status: 'planned',
      created_by: chef.id,
    }).select('*').single()
    assert(!plan.error, `Menu plan create failed: ${plan.error?.message}`)
    await insertOk(signed.client.from('menu_plan_items').insert([
      {
        menu_plan_id: plan.data.id,
        family_member_id: diner.data.id,
        recipe_id: recipe.data.id,
        planned_date: today,
        meal_time: 'lunch',
        servings: 1,
        planned_grams: 300,
        calories: nutrition.caloriesPerServing,
        protein_g: nutrition.proteinPerServing,
        allergy_status: 'review_needed',
        variety_status: 'allowed',
      },
      {
        menu_plan_id: plan.data.id,
        family_member_id: diner.data.id,
        recipe_id: recipe.data.id,
        planned_date: isoDate(10),
        meal_time: 'lunch',
        servings: 1,
        planned_grams: 300,
        calories: nutrition.caloriesPerServing,
        protein_g: nutrition.proteinPerServing,
        allergy_status: 'review_needed',
        variety_status: 'warning',
        override_reason: 'QA verifies repeated dish detection.',
      },
    ]), 'Menu items')
    assert(daysBetween(today, isoDate(10)) < 21, 'Menu rotation QA date calculation failed')

    const requiredChicken = (600 / 4) * 1.25
    await insertOk(signed.client.from('pantry_inventory').insert({
      family_id: familyId,
      ingredient_id: chicken.data.id,
      quantity_available: 100,
      min_quantity_alert: 200,
      expiration_date: isoDate(5),
      location: 'fridge',
    }), 'Pantry stock')
    const missingChicken = Math.max(0, requiredChicken - 100)
    assert(Math.round(missingChicken) === 88, 'Portion/missing quantity calculation failed')

    const freezer = await signed.client.from('freezer_inventory').insert({
      family_id: familyId,
      recipe_id: recipe.data.id,
      prepared_date: today,
      expiration_date: isoDate(20),
      portions_available: 4,
      grams_per_portion: 300,
      reheating_instructions: 'Reheat until hot.',
    }).select('*').single()
    assert(!freezer.error, `Freezer create failed: ${freezer.error?.message}`)
    assert(!/^19(69|70)/.test(freezer.data.prepared_date), 'Invalid freezer prepared date displayed')
    await updateOk(signed.client.from('freezer_inventory').update({ portions_available: 3 }).eq('id', freezer.data.id), 'Freezer portion subtract')

    const shopping = await signed.client.from('shopping_lists').insert({
      family_id: familyId,
      menu_plan_id: plan.data.id,
      name: 'SFM QA Shopping List',
      status: 'active',
    }).select('*').single()
    assert(!shopping.error, `Shopping list create failed: ${shopping.error?.message}`)
    await insertOk(signed.client.from('shopping_list_items').insert({
      shopping_list_id: shopping.data.id,
      ingredient_id: chicken.data.id,
      required_quantity: requiredChicken,
      available_quantity: 100,
      missing_quantity: missingChicken,
      unit: 'g',
    }), 'Shopping list consolidation')

    await insertOk(signed.client.from('alerts').insert([
      { family_id: familyId, type: 'missing_ingredient', severity: 'warning', title: 'alerts.missingIngredient', message: 'alerts.missingIngredientMessage' },
      { family_id: familyId, type: 'blocked_recipe', severity: 'critical', title: 'alerts.blockedRecipe', message: 'alerts.blockedRecipeMessage' },
      { family_id: familyId, type: 'low_calories', severity: 'warning', title: 'alerts.lowCalories', message: 'alerts.lowCaloriesMessage' },
      { family_id: familyId, type: 'low_protein', severity: 'warning', title: 'alerts.lowProtein', message: 'alerts.lowProteinMessage' },
      { family_id: familyId, type: 'repeated_dish', severity: 'warning', title: 'alerts.repeatedDish', message: 'alerts.repeatedDishMessage' },
      { family_id: familyId, type: 'freezer_expiring', severity: 'warning', title: 'alerts.freezerExpiring', message: 'alerts.freezerExpiringMessage' },
    ]), 'Operational alerts')

    pass('Remote CRUD verified for families, diners, ingredients, recipes, menu, pantry, freezer, shopping, and alerts')
  } finally {
    if (familyId) await cleanupFamily(familyId)
  }
}

async function testEdgeFunction() {
  const { userA } = await ensureQaUsers()
  const signed = await signIn(userA)
  await signed.client.rpc('seed_demo_workspace')
  const family = await selectSingle(signed.client.from('families').select('*').eq('name', 'Galeano Family').limit(1), 'Galeano Family')

  const functionUrl = `${config.url}/functions/v1/ai-chef`
  const unauth = await fetch(functionUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: config.publishableKey },
    body: JSON.stringify({ action: 'generate_day_menu', family_id: family.id }),
  })
  assert([401, 403].includes(unauth.status), `Unauthenticated function request returned ${unauth.status}`)

  const ping = await signed.client.functions.invoke('ai-chef', { body: { action: 'ping' } })
  assert(!ping.error, `ai-chef ping failed: ${ping.error?.message}`)
  assert(ping.data?.service_role_configured === true, 'Service role is not configured for ai-chef')
  assert(typeof ping.data?.model === 'string' && ping.data.model.length > 0, 'Gemini model was not returned')
  assertNoSecrets(ping.data)

  const keyStatus = await signed.client.functions.invoke('ai-key-manager', { body: { action: 'get_status' } })
  assert(!keyStatus.error, `ai-key-manager status failed: ${keyStatus.error?.message}`)
  assert(keyStatus.data?.provider === 'gemini', 'ai-key-manager did not return Gemini metadata')
  assert(!('encrypted_key' in keyStatus.data), 'ai-key-manager leaked encrypted_key')
  assertNoSecrets(keyStatus.data)

  if (process.env.GEMINI_API_KEY) {
    const savedKey = await signed.client.functions.invoke('ai-key-manager', {
      body: { action: 'save_key', api_key: process.env.GEMINI_API_KEY, model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' },
    })
    assert(!savedKey.error, `ai-key-manager save failed: ${savedKey.error?.message}`)
    assert(['valid', 'invalid', 'test_failed', 'rate_limited'].includes(savedKey.data?.key_status), 'Gemini BYOK key returned an unsupported status')
    assert(savedKey.data?.key_last4 && !String(savedKey.data.key_last4).includes(process.env.GEMINI_API_KEY), 'ai-key-manager returned unsafe key metadata')
    assertNoSecrets(savedKey.data)
  }

  const ai = await signed.client.functions.invoke('ai-chef', {
    body: {
      action: 'suggest_substitutions',
      family_id: family.id,
      language: 'en',
      prompt: 'For QA, return one JSON suggestion for replacing tahini and sesame in a school lunch. Include calories and protein.',
    },
  })
  assert(!ai.error, `ai-chef authenticated request failed: ${ai.error?.message}`)
  assert(ai.data && typeof ai.data === 'object', 'ai-chef did not return structured JSON')
  assert(['user', 'platform_fallback', 'not_configured'].includes(ai.data.ai_key_source), 'ai-chef did not report safe key source')
  assert(Array.isArray(ai.data.suggestions), 'ai-chef response missing suggestions array')
  assert(Array.isArray(ai.data.usable_suggestions) || ai.data.code === 'gemini_key_missing', 'ai-chef response missing usable_suggestions array')
  for (const suggestion of ai.data.suggestions) {
    assert(['safe', 'review_needed', 'blocked'].includes(suggestion.safety_status), 'AI suggestion missing validated safety status')
    assert(typeof suggestion.usable === 'boolean', 'AI suggestion missing usable flag')
  }
  assertNoSecrets(ai.data)
  const inventory = await signed.client.functions.invoke('ai-chef', {
    body: {
      action: 'purchase_priority',
      family_id: family.id,
      language: 'en',
      prompt: 'For QA, validate inventory priority for the current family and return structured JSON.',
    },
  })
  assert(!inventory.error, `ai-chef inventory validation failed: ${inventory.error?.message}`)
  assert(inventory.data?.validation_summary && typeof inventory.data.validation_summary === 'object', 'Inventory response missing validation_summary')
  assert(Array.isArray(inventory.data.missing_ingredients), 'Inventory response missing missing_ingredients')
  assert(Array.isArray(inventory.data.expiring_items), 'Inventory response missing expiring_items')
  assert(Array.isArray(inventory.data.freezer_first_candidates), 'Inventory response missing freezer_first_candidates')
  assert(Array.isArray(inventory.data.purchase_priority), 'Inventory response missing purchase_priority')
  assertNoSecrets(inventory.data)
  if (process.env.GEMINI_API_KEY) {
    const deletedKey = await signed.client.functions.invoke('ai-key-manager', { body: { action: 'delete_key' } })
    assert(!deletedKey.error, `ai-key-manager delete failed: ${deletedKey.error?.message}`)
    assertNoSecrets(deletedKey.data)
  }
  pass('ai-chef Edge Function verified')
}

function testI18n() {
  const en = JSON.parse(readFileSync(resolve(root, 'src/i18n/locales/en.json'), 'utf8'))
  const es = JSON.parse(readFileSync(resolve(root, 'src/i18n/locales/es.json'), 'utf8'))
  const enKeys = flattenKeys(en)
  const esKeys = flattenKeys(es)
  const missing = enKeys.filter((key) => !esKeys.includes(key))
  assert(missing.length === 0, `Spanish locale is missing keys: ${missing.slice(0, 5).join(', ')}`)
  for (const key of ['dashboard', 'families', 'diners', 'ingredients', 'recipes', 'menuPlanner', 'shoppingList', 'allergies', 'aiChef', 'settings']) {
    assert(en.nav?.[key], `Missing English nav key: ${key}`)
    assert(es.nav?.[key], `Missing Spanish nav key: ${key}`)
  }
  const appSource = readFileSync(resolve(root, 'src/App.tsx'), 'utf8')
  for (const label of ['Families', 'Diners', 'Ingredients', 'Recipes', 'Menu Planner', 'Shopping List', 'AI Chef']) {
    assert(!appSource.includes(`>${label}<`), `Hardcoded visible label found in App.tsx: ${label}`)
  }
  pass('Bilingual locale smoke checks verified')
}

async function ensureQaUsers() {
  requireEnv(['VITE_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'])
  const users = {
    userA: await ensureUser('qa-user-a+sfm@example.com', 'family_admin', 'QA User A'),
    userB: await ensureUser('qa-user-b+sfm@example.com', 'family_admin', 'QA User B'),
    chef: await ensureUser('qa-chef+sfm@example.com', 'chef', 'QA Chef'),
    viewer: await ensureUser('qa-viewer+sfm@example.com', 'viewer', 'QA Viewer'),
    superAdmin: await ensureUser('qa-super-admin+sfm@example.com', 'super_admin', 'QA Super Admin'),
  }
  return users
}

async function ensureUser(email, role, fullName) {
  const admin = adminClient()
  const password = `Sfm${randomUUID()}!1a`
  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  assert(!listed.error, `Could not list auth users: ${listed.error?.message}`)
  let user = listed.data.users.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase())
  if (user) {
    const updated = await admin.auth.admin.updateUserById(user.id, {
      password,
      user_metadata: { full_name: fullName },
    })
    assert(!updated.error, `Could not update auth user ${email}: ${updated.error?.message}`)
    user = updated.data.user
  } else {
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    })
    assert(!created.error, `Could not create auth user ${email}: ${created.error?.message}`)
    user = created.data.user
  }
  const profile = await admin.from('profiles').upsert({
    id: user.id,
    email,
    full_name: fullName,
    role,
    preferred_language: 'en',
  }).select('*').single()
  assert(!profile.error, `Could not upsert profile ${email}: ${profile.error?.message}`)
  return { id: user.id, email, password, role }
}

async function signIn(user) {
  requireEnv(['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY'])
  const client = createClient(config.url, config.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  const result = await client.auth.signInWithPassword({ email: user.email, password: user.password })
  assert(!result.error && result.data.session, `Could not sign in ${user.email}: ${result.error?.message}`)
  return { client, session: result.data.session }
}

async function ensureFamily(name, ownerId, chefId) {
  const admin = adminClient()
  const existing = await admin.from('families').select('*').eq('name', name).eq('owner_id', ownerId).limit(1).maybeSingle()
  assert(!existing.error, `Family lookup failed: ${existing.error?.message}`)
  if (existing.data) {
    const update = await admin.from('families').update({ chef_id: chefId, description: 'Remote RLS QA family' }).eq('id', existing.data.id).select('*').single()
    assert(!update.error, `Family update failed: ${update.error?.message}`)
    return update.data
  }
  const inserted = await admin.from('families').insert({
    name,
    description: 'Remote RLS QA family',
    owner_id: ownerId,
    chef_id: chefId,
  }).select('*').single()
  assert(!inserted.error, `Family insert failed: ${inserted.error?.message}`)
  return inserted.data
}

async function ensureFamilyFixture(family, ownerId, suffix) {
  const admin = adminClient()
  const member = await findOrInsert(admin, 'family_members', { family_id: family.id, nickname: `QA ${suffix}` }, {
    family_id: family.id,
    full_name: `SFM QA Diner ${suffix}`,
    nickname: `QA ${suffix}`,
    portion_factor: 1,
  })
  const ingredient = await findOrInsert(admin, 'ingredients', { family_id: family.id, normalized_name: `sfm qa ingredient ${suffix.toLowerCase()}` }, {
    family_id: family.id,
    owner_id: ownerId,
    scope: 'family',
    name: `SFM QA Ingredient ${suffix}`,
    normalized_name: `sfm qa ingredient ${suffix.toLowerCase()}`,
    calories_per_100g: 100,
    protein_g_per_100g: 10,
  })
  const recipe = await findOrInsert(admin, 'recipes', { family_id: family.id, name: `SFM QA Recipe ${suffix}` }, {
    family_id: family.id,
    owner_id: ownerId,
    scope: 'family',
    name: `SFM QA Recipe ${suffix}`,
    servings: 4,
    status: 'active',
  })
  const existingRi = await admin.from('recipe_ingredients').select('id').eq('recipe_id', recipe.id).eq('ingredient_id', ingredient.id).limit(1)
  if (!existingRi.error && existingRi.data.length === 0) {
    await insertOk(admin.from('recipe_ingredients').insert({ recipe_id: recipe.id, ingredient_id: ingredient.id, quantity_g: 400 }), 'Fixture recipe ingredient')
  }
  const plan = await findOrInsert(admin, 'menu_plans', { family_id: family.id, name: `SFM QA Plan ${suffix}` }, {
    family_id: family.id,
    name: `SFM QA Plan ${suffix}`,
    start_date: isoDate(0),
    end_date: isoDate(6),
    status: 'planned',
    created_by: ownerId,
  })
  return { memberId: member.id, ingredientId: ingredient.id, recipeId: recipe.id, planId: plan.id }
}

async function setMemberships(rows) {
  const result = await adminClient().from('family_users').upsert(rows, { onConflict: 'family_id,profile_id' })
  assert(!result.error, `Could not set family memberships: ${result.error?.message}`)
}

async function findOrInsert(client, table, match, payload) {
  let query = client.from(table).select('*').limit(1)
  for (const [key, value] of Object.entries(match)) query = query.eq(key, value)
  const existing = await query.maybeSingle()
  assert(!existing.error, `${table} lookup failed: ${existing.error?.message}`)
  if (existing.data) return existing.data
  const inserted = await client.from(table).insert(payload).select('*').single()
  assert(!inserted.error, `${table} insert failed: ${inserted.error?.message}`)
  return inserted.data
}

async function validateSeedRecipeSafety(client, familyId) {
  const ingredients = await selectRows(client.from('ingredients').select('*').eq('family_id', familyId), 'seed ingredients')
  const recipes = await selectRows(client.from('recipes').select('*').eq('family_id', familyId), 'seed recipes')
  const recipeIngredients = await selectRows(client.from('recipe_ingredients').select('*'), 'seed recipe ingredients')
  const ingredientById = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]))

  for (const name of safeRecipeNames) {
    const recipe = recipes.find((item) => item.name === name)
    assert(recipe, `Missing safe seed recipe: ${name}`)
    assert(recipeStatus(recipe, recipeIngredients, ingredientById) === 'safe', `Expected safe recipe to be safe: ${name}`)
  }
  for (const name of blockedRecipeNames) {
    const recipe = recipes.find((item) => item.name === name)
    assert(recipe, `Missing blocked seed recipe: ${name}`)
    assert(recipeStatus(recipe, recipeIngredients, ingredientById) === 'blocked', `Expected blocked recipe to be blocked: ${name}`)
  }
  for (const name of reviewRecipeNames) {
    const recipe = recipes.find((item) => item.name === name)
    assert(recipe, `Missing review seed recipe: ${name}`)
    assert(recipeStatus(recipe, recipeIngredients, ingredientById) === 'review_needed', `Expected review recipe to need review: ${name}`)
  }
}

function recipeStatus(recipe, recipeIngredients, ingredientById) {
  const statuses = recipeIngredients
    .filter((row) => row.recipe_id === recipe.id)
    .map((row) => ingredientStatus(ingredientById.get(row.ingredient_id)))
  if (statuses.includes('blocked')) return 'blocked'
  if (statuses.includes('review_needed')) return 'review_needed'
  return 'safe'
}

function ingredientStatus(ingredient) {
  if (!ingredient) return 'review_needed'
  const normalized = String(ingredient.normalized_name || ingredient.name || '').toLowerCase()
  const tags = [...(ingredient.allergen_tags || []), ...(ingredient.may_contain_tags || [])].map((tag) => String(tag).toLowerCase())
  if (['almonds', 'sunflower oil', 'sunflower lecithin', 'red lentils', 'green lentils', 'brown lentils', 'black lentils'].includes(normalized)) return 'safe'
  if (normalized.includes('generic lentils') || tags.includes('lentils')) return 'review_needed'
  if (ingredient.contains_gluten || ['wheat', 'barley', 'rye'].some((term) => normalized.includes(term) || tags.includes(term)) || tags.includes('gluten')) return 'blocked'
  if (ingredient.contains_sesame || ['sesame', 'tahini'].some((term) => normalized.includes(term) || tags.includes(term))) return 'blocked'
  if (['sunflower seeds', 'sunflower butter', 'sunflower flour'].some((term) => normalized.includes(term))) return 'blocked'
  if (ingredient.contains_tree_nuts && !normalized.includes('almond')) return 'blocked'
  return 'safe'
}

async function seedCounts(client, familyId) {
  const diners = await countRows(client.from('family_members').select('*', { count: 'exact', head: true }).eq('family_id', familyId), 'seed diners')
  const ingredients = await countRows(client.from('ingredients').select('*', { count: 'exact', head: true }).eq('family_id', familyId), 'seed ingredients')
  const recipes = await countRows(client.from('recipes').select('*', { count: 'exact', head: true }).eq('family_id', familyId), 'seed recipes')
  const soren = await selectSingle(client.from('family_members').select('id').eq('family_id', familyId).eq('nickname', 'Soren').limit(1), 'Soren')
  const allergies = await countRows(client.from('allergies').select('*', { count: 'exact', head: true }).eq('family_member_id', soren.id), 'seed allergies')
  return { diners, allergies, ingredients, recipes }
}

async function cleanupFamily(familyId) {
  const admin = adminClient()
  const plans = await selectRows(admin.from('menu_plans').select('id').eq('family_id', familyId), 'cleanup plans')
  const shopping = await selectRows(admin.from('shopping_lists').select('id').eq('family_id', familyId), 'cleanup shopping')
  const recipes = await selectRows(admin.from('recipes').select('id').eq('family_id', familyId), 'cleanup recipes')
  const members = await selectRows(admin.from('family_members').select('id').eq('family_id', familyId), 'cleanup members')
  if (shopping.length) await admin.from('shopping_list_items').delete().in('shopping_list_id', shopping.map((row) => row.id))
  if (shopping.length) await admin.from('shopping_lists').delete().in('id', shopping.map((row) => row.id))
  if (plans.length) await admin.from('menu_plan_items').delete().in('menu_plan_id', plans.map((row) => row.id))
  if (plans.length) await admin.from('menu_plans').delete().in('id', plans.map((row) => row.id))
  await admin.from('pantry_inventory').delete().eq('family_id', familyId)
  await admin.from('freezer_inventory').delete().eq('family_id', familyId)
  await admin.from('alerts').delete().eq('family_id', familyId)
  if (recipes.length) await admin.from('recipe_nutrition_cache').delete().in('recipe_id', recipes.map((row) => row.id))
  if (recipes.length) await admin.from('recipe_ingredients').delete().in('recipe_id', recipes.map((row) => row.id))
  if (recipes.length) await admin.from('recipes').delete().in('id', recipes.map((row) => row.id))
  if (members.length) {
    await admin.from('allergies').delete().in('family_member_id', members.map((row) => row.id))
    await admin.from('food_preferences').delete().in('family_member_id', members.map((row) => row.id))
    await admin.from('dietary_restrictions').delete().in('family_member_id', members.map((row) => row.id))
  }
  await admin.from('family_members').delete().eq('family_id', familyId)
  await admin.from('ingredients').delete().eq('family_id', familyId)
  await admin.from('family_users').delete().eq('family_id', familyId)
  await admin.from('families').delete().eq('id', familyId)
}

async function managementSql(query) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${config.projectRef}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  })
  const text = await response.text()
  assert(response.ok, `Management SQL failed with ${response.status}: ${sanitize(text)}`)
  return JSON.parse(text)
}

function adminClient() {
  requireEnv(['VITE_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'])
  return createClient(config.url, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function assertCanReadFamily(client, familyId, expected, message) {
  await assertFilteredCount(client, 'families', 'id', familyId, expected ? 1 : 0, message)
}

async function assertFilteredCount(client, table, column, value, expected, message) {
  const result = await client.from(table).select('id').eq(column, value)
  assert(!result.error, `${message}: ${result.error?.message}`)
  assert(result.data.length === expected, `${message}: expected ${expected}, got ${result.data.length}`)
}

async function expectInsertFailure(builder, message) {
  const result = await builder
  assert(result.error || !result.data || result.data.length === 0, `${message}: insert unexpectedly succeeded`)
}

async function insertOk(builder, label) {
  const result = await builder
  assert(!result.error, `${label} failed: ${result.error?.message}`)
  return result.data
}

async function updateOk(builder, label) {
  const result = await builder
  assert(!result.error, `${label} failed: ${result.error?.message}`)
}

async function selectRows(builder, label) {
  const result = await builder
  assert(!result.error, `${label} select failed: ${result.error?.message}`)
  return result.data || []
}

async function selectSingle(builder, label) {
  const result = await builder.maybeSingle()
  assert(!result.error, `${label} select failed: ${result.error?.message}`)
  assert(result.data, `${label} not found`)
  return result.data
}

async function countRows(builder, label) {
  const result = await builder
  assert(!result.error, `${label} count failed: ${result.error?.message}`)
  return result.count || 0
}

function calculateNutrition(rows, servings) {
  const totalCalories = rows.reduce((sum, row) => sum + (Number(row.ingredient.calories_per_100g || 0) * row.grams) / 100, 0)
  const totalProtein = rows.reduce((sum, row) => sum + (Number(row.ingredient.protein_g_per_100g || 0) * row.grams) / 100, 0)
  return {
    totalCalories,
    totalProtein,
    caloriesPerServing: totalCalories / servings,
    proteinPerServing: totalProtein / servings,
  }
}

function stripRow(row) {
  const { id, created_at, updated_at, ...rest } = row
  return rest
}

function flattenKeys(value, prefix = '') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [prefix]
  return Object.entries(value).flatMap(([key, child]) => flattenKeys(child, prefix ? `${prefix}.${key}` : key))
}

function assertNoSecrets(payload) {
  const text = JSON.stringify(payload)
  for (const secret of [config.serviceRoleKey, process.env.GEMINI_API_KEY, config.accessToken]) {
    if (secret && secret.length > 12) assert(!text.includes(secret), 'Response leaked a configured secret')
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function pass(message) {
  console.log(`PASS ${message}`)
}

function requireEnv(names) {
  const missing = names.filter((name) => {
    if (name === 'VITE_SUPABASE_URL') return !config.url
    if (name === 'VITE_SUPABASE_PUBLISHABLE_KEY') return !config.publishableKey
    if (name === 'SUPABASE_SERVICE_ROLE_KEY') return !config.serviceRoleKey
    return !process.env[name]
  })
  if (missing.length) throw new Error(`Missing required local env values: ${missing.join(', ')}`)
}

function loadEnv(file) {
  if (!existsSync(file)) return
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!/^\s*[A-Za-z_][A-Za-z0-9_]*=/.test(line)) continue
    const [rawName, ...rest] = line.split('=')
    const name = rawName.trim()
    let value = rest.join('=').trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!process.env[name]) process.env[name] = value
  }
}

function isoDate(offsetDays) {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + offsetDays)
  return date.toISOString().slice(0, 10)
}

function daysBetween(start, end) {
  return Math.round((new Date(`${end}T12:00:00Z`).getTime() - new Date(`${start}T12:00:00Z`).getTime()) / 86_400_000)
}

function sanitize(text) {
  let output = String(text)
  for (const secret of [
    config.serviceRoleKey,
    process.env.SUPABASE_DB_PASSWORD,
    process.env.GEMINI_API_KEY,
    config.accessToken,
    config.publishableKey,
  ]) {
    if (secret && secret.length > 8) output = output.split(secret).join('[redacted]')
  }
  return output
}
