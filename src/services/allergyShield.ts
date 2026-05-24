import type {
  Allergy,
  AllergyStatus,
  FamilyMember,
  Ingredient,
  Recipe,
  RecipeIngredient,
} from '../lib/types'
import { normalizeName } from '../lib/utils'

export interface SafetyResult {
  status: AllergyStatus
  reasons: string[]
  blockedIngredients: string[]
  reviewIngredients: string[]
}

const glutenAliases = ['gluten', 'wheat', 'rye', 'barley', 'trigo', 'centeno', 'cebada']
const sesameAliases = ['sesame', 'sesamo', 'tahini']
const almondAliases = ['almond', 'almonds', 'almendra', 'almendras']
const allowedLentils = ['red lentils', 'green lentils', 'brown lentils', 'black lentils']
const sunflowerAllowed = ['sunflower oil', 'sunflower lecithin']
const sunflowerBlocked = ['sunflower seeds', 'sunflower butter', 'sunflower flour']

function hasAny(haystack: string[], needles: string[]) {
  return needles.some((needle) => haystack.includes(normalizeName(needle)))
}

function ingredientTerms(ingredient: Ingredient) {
  return [
    ingredient.name,
    ingredient.normalized_name,
    ...ingredient.allergen_tags,
    ...ingredient.may_contain_tags,
    ...ingredient.blocked_derivatives,
  ].map(normalizeName)
}

export function validateIngredientForDiner(
  ingredient: Ingredient,
  dinerAllergies: Allergy[],
): SafetyResult {
  const terms = ingredientTerms(ingredient)
  const reasons: string[] = []
  const blockedIngredients: string[] = []
  const reviewIngredients: string[] = []

  for (const allergy of dinerAllergies) {
    const allergen = normalizeName(allergy.normalized_allergen_name || allergy.allergen_name)
    const isTrace = ingredient.may_contain_tags.map(normalizeName).includes(allergen)

    if (glutenAliases.includes(allergen) && (ingredient.contains_gluten || hasAny(terms, glutenAliases))) {
      reasons.push('gluten_blocked')
      blockedIngredients.push(ingredient.name)
      continue
    }

    if (allergen === 'tree nuts' || allergen === 'tree nut') {
      if (almondAliases.some((alias) => normalizeName(ingredient.name).includes(alias))) continue
      if (ingredient.contains_tree_nuts || hasAny(terms, ['tree nuts', 'tree nut', 'nuts'])) {
        reasons.push('tree_nut_blocked')
        blockedIngredients.push(ingredient.name)
        continue
      }
    }

    if (sesameAliases.includes(allergen) && (ingredient.contains_sesame || hasAny(terms, sesameAliases))) {
      reasons.push('sesame_blocked')
      blockedIngredients.push(ingredient.name)
      continue
    }

    if (sunflowerAllowed.some((allowed) => normalizeName(ingredient.name).includes(allowed))) {
      continue
    }

    if (hasAny([allergen], sunflowerBlocked) && hasAny(terms, sunflowerBlocked)) {
      reasons.push('sunflower_derivative_blocked')
      blockedIngredients.push(ingredient.name)
      continue
    }

    if (allergen === 'lentils') {
      if (allowedLentils.some((allowed) => normalizeName(ingredient.name).includes(allowed))) continue
      if (hasAny(terms, ['lentils', 'lentil'])) {
        reasons.push('lentils_review')
        reviewIngredients.push(ingredient.name)
        continue
      }
    }

    if (terms.includes(allergen)) {
      reasons.push(`${allergen}_blocked`)
      blockedIngredients.push(ingredient.name)
      continue
    }

    if (isTrace && allergy.avoid_traces) {
      if (allergy.severity === 'severe' || allergy.severity === 'anaphylaxis') {
        reasons.push('trace_blocked')
        blockedIngredients.push(ingredient.name)
      } else {
        reasons.push('trace_review')
        reviewIngredients.push(ingredient.name)
      }
    }
  }

  if (ingredient.source === 'AI' && ingredient.allergen_tags.length === 0) {
    reasons.push('incomplete_allergen_data')
    reviewIngredients.push(ingredient.name)
  }

  if (blockedIngredients.length > 0) {
    return { status: 'blocked', reasons, blockedIngredients, reviewIngredients }
  }
  if (reviewIngredients.length > 0) {
    return { status: 'review_needed', reasons, blockedIngredients, reviewIngredients }
  }
  return { status: 'safe', reasons, blockedIngredients, reviewIngredients }
}

export function validateRecipeForDiner(
  recipe: Recipe,
  diner: FamilyMember,
  allergies: Allergy[],
  recipeIngredients: RecipeIngredient[],
  ingredients: Ingredient[],
): SafetyResult {
  const dinerAllergies = allergies.filter((allergy) => allergy.family_member_id === diner.id)
  const results = recipeIngredients
    .filter((item) => item.recipe_id === recipe.id)
    .map((item) => ingredients.find((ingredient) => ingredient.id === item.ingredient_id))
    .filter(Boolean)
    .map((ingredient) => validateIngredientForDiner(ingredient as Ingredient, dinerAllergies))

  const blockedIngredients = results.flatMap((result) => result.blockedIngredients)
  const reviewIngredients = results.flatMap((result) => result.reviewIngredients)
  const reasons = results.flatMap((result) => result.reasons)

  if (recipe.visible_melted_cheese && normalizeName(diner.notes || '').includes('no visible melted cheese')) {
    reasons.push('preference_conflict')
    reviewIngredients.push(recipe.name)
  }

  if (blockedIngredients.length > 0) {
    return { status: 'blocked', reasons, blockedIngredients, reviewIngredients }
  }
  if (reviewIngredients.length > 0) {
    return { status: 'review_needed', reasons, blockedIngredients, reviewIngredients }
  }
  return { status: 'safe', reasons, blockedIngredients, reviewIngredients }
}

export function validateRecipeForFamily(
  recipe: Recipe,
  diners: FamilyMember[],
  allergies: Allergy[],
  recipeIngredients: RecipeIngredient[],
  ingredients: Ingredient[],
) {
  return diners.map((diner) => ({
    diner,
    ...validateRecipeForDiner(recipe, diner, allergies, recipeIngredients, ingredients),
  }))
}
