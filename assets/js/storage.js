const KEYS = {
  recipes: "cookflow_recipes_v4",
  settings: "cookflow_settings_v4",
  pantry: "cookflow_pantry_v1",
  planner: "cookflow_planner_v1",
  shopping: "cookflow_shopping_v1"
};

const DEFAULT_SETTINGS = {
  provider: "gemini",
  model: "gemini-2.5-flash-lite",
  endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent",
  apiKey: ""
};

function uidLocal() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function parseNumberishLocal(value) {
  if (typeof value === "number") return value;
  const str = String(value || "").trim();
  if (!str) return 0;

  const mixed = str.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);

  const frac = str.match(/^(\d+)\/(\d+)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);

  const numeric = str.match(/-?\d+(\.\d+)?/);
  return numeric ? Number(numeric[0]) : 0;
}

function cleanArray(arr) {
  return Array.isArray(arr) ? arr.filter(Boolean) : [];
}

function getSourceType(url = "") {
  const value = String(url).toLowerCase();
  if (!value) return "manual";
  if (value.includes("youtube.com") || value.includes("youtu.be")) return "youtube";
  return "web";
}

function normalizeIngredient(item = {}) {
  const baseQuantity = typeof item.base_quantity === "number"
    ? item.base_quantity
    : parseNumberishLocal(item.base_quantity);

  const quantityG =
    item.quantity_g === null || item.quantity_g === undefined || item.quantity_g === ""
      ? null
      : Number(item.quantity_g);

  return {
    name: String(item.name || "Ingredient").trim(),
    normalized_name: String(item.normalized_name || item.name || "ingredient").trim().toLowerCase(),
    base_quantity: Number.isFinite(baseQuantity) ? baseQuantity : 0,
    unit: String(item.unit || "").trim(),
    quantity_g: Number.isFinite(quantityG) ? Number(quantityG) : null,
    notes: String(item.notes || "").trim(),
    category: String(item.category || "").trim(),
    optional: Boolean(item.optional)
  };
}

function normalizeComponent(component = {}) {
  return {
    name: String(component.name || "Component").trim(),
    type: String(component.type || "component").trim(),
    description: String(component.description || "").trim(),
    ingredients: cleanArray(component.ingredients).map(normalizeIngredient),
    steps: cleanArray(component.steps).map((s) => String(s).trim()).filter(Boolean),
    notes: cleanArray(component.notes).map((n) => String(n).trim()).filter(Boolean)
  };
}

function normalizeNutrition(nutrition = {}) {
  return {
    calories: Number(nutrition.calories || 0) || 0,
    protein_g: Number(nutrition.protein_g || 0) || 0,
    carbs_g: Number(nutrition.carbs_g || 0) || 0,
    fat_g: Number(nutrition.fat_g || 0) || 0,
    fiber_g: Number(nutrition.fiber_g || 0) || 0,
    sugar_g: Number(nutrition.sugar_g || 0) || 0,
    sodium_mg: Number(nutrition.sodium_mg || 0) || 0
  };
}

function normalizeConfidence(confidence = {}) {
  return {
    overall: String(confidence.overall || "medium"),
    title: String(confidence.title || "medium"),
    ingredients: String(confidence.ingredients || "medium"),
    times: String(confidence.times || "medium"),
    servings: String(confidence.servings || "medium"),
    cuisine: String(confidence.cuisine || "medium"),
    nutrition: String(confidence.nutrition || "low"),
    notes: cleanArray(confidence.notes).map((n) => String(n).trim()).filter(Boolean)
  };
}

function normalizeCookMode(cookMode = {}) {
  return {
    timers: cleanArray(cookMode.timers).map((t) => ({
      step_index: Number(t.step_index || 0) || 0,
      label: String(t.label || "").trim(),
      seconds: Number(t.seconds || 0) || 0
    })),
    tips: cleanArray(cookMode.tips).map((t) => String(t).trim()).filter(Boolean)
  };
}

function normalizeRecipe(recipe = {}) {
  const sourceUrl = String(recipe.source_url || recipe.youtube_link || "").trim();
  const baseServings = Math.max(1, parseInt(recipe.base_servings || recipe.servings || 2, 10) || 2);
  const servings = Math.max(1, parseInt(recipe.servings || baseServings, 10) || baseServings);

  return {
    id: recipe.id || uidLocal(),
    name: String(recipe.name || "Untitled Recipe").trim(),
    description: String(recipe.description || "").trim(),
    cuisine: String(recipe.cuisine || "").trim(),
    prep_time: String(recipe.prep_time || "").trim(),
    cook_time: String(recipe.cook_time || "").trim(),
    total_time: String(recipe.total_time || "").trim(),
    difficulty_1_to_5: Math.min(5, Math.max(1, parseInt(recipe.difficulty_1_to_5, 10) || 2)),
    servings,
    base_servings: baseServings,
    steps: cleanArray(recipe.steps).map((s) => String(s).trim()).filter(Boolean),
    ingredients: cleanArray(recipe.ingredients).map(normalizeIngredient),
    components: cleanArray(recipe.components).map(normalizeComponent),
    notes: cleanArray(recipe.notes).map((n) => String(n).trim()).filter(Boolean),
    tags: [...new Set(cleanArray(recipe.tags).map((t) => String(t).trim().toLowerCase()).filter(Boolean))],
    source_url: sourceUrl,
    source_type: String(recipe.source_type || getSourceType(sourceUrl)),
    nutrition_per_serving: normalizeNutrition(recipe.nutrition_per_serving || {}),
    nutrition_total: normalizeNutrition(recipe.nutrition_total || {}),
    confidence: normalizeConfidence(recipe.confidence || {}),
    cook_mode: normalizeCookMode(recipe.cook_mode || {}),
    ingredient_aliases: cleanArray(recipe.ingredient_aliases).map((a) => String(a).trim().toLowerCase()),
    pantry_match_score: Number(recipe.pantry_match_score || 0) || 0,
    missing_ingredients_cache: cleanArray(recipe.missing_ingredients_cache).map((x) => String(x).trim().toLowerCase()),
    last_ai_cleanup_at: recipe.last_ai_cleanup_at || "",
    is_ai_generated: Boolean(recipe.is_ai_generated),
    created_at: recipe.created_at || new Date().toISOString(),
    updated_at: recipe.updated_at || recipe.created_at || new Date().toISOString()
  };
}

function normalizePantryItem(item = {}) {
  return {
    id: item.id || uidLocal(),
    name: String(item.name || "").trim(),
    normalized_name: String(item.normalized_name || item.name || "").trim().toLowerCase(),
    quantity: Number(item.quantity || 0) || 0,
    unit: String(item.unit || "").trim(),
    quantity_g: item.quantity_g === null || item.quantity_g === undefined || item.quantity_g === ""
      ? null
      : Number(item.quantity_g),
    category: String(item.category || "").trim(),
    expires_on: String(item.expires_on || "").trim(),
    in_stock: item.in_stock !== false,
    created_at: item.created_at || new Date().toISOString(),
    updated_at: item.updated_at || item.created_at || new Date().toISOString()
  };
}

function emptyPlannerSlot() {
  return {
    recipe_id: null,
    servings_needed: 1,
    carry_to: null,
    carry_over_from: null
  };
}

function normalizePlannerSlot(slot = {}) {
  return {
    recipe_id: slot.recipe_id || null,
    servings_needed: Math.max(1, parseInt(slot.servings_needed || 1, 10) || 1),
    carry_to: slot.carry_to || null,
    carry_over_from: slot.carry_over_from || null
  };
}

function defaultPlannerState() {
  return {
    week_of: "",
    days: {
      monday: { lunch: emptyPlannerSlot(), dinner: emptyPlannerSlot() },
      tuesday: { lunch: emptyPlannerSlot(), dinner: emptyPlannerSlot() },
      wednesday: { lunch: emptyPlannerSlot(), dinner: emptyPlannerSlot() },
      thursday: { lunch: emptyPlannerSlot(), dinner: emptyPlannerSlot() },
      friday: { lunch: emptyPlannerSlot(), dinner: emptyPlannerSlot() },
      saturday: { lunch: emptyPlannerSlot(), dinner: emptyPlannerSlot() },
      sunday: { lunch: emptyPlannerSlot(), dinner: emptyPlannerSlot() }
    }
  };
}

function normalizePlanner(input = {}) {
  const base = defaultPlannerState();
  const next = {
    ...base,
    ...input,
    days: { ...base.days, ...(input.days || {}) }
  };

  Object.keys(next.days).forEach((day) => {
    next.days[day] = {
      lunch: normalizePlannerSlot(next.days[day]?.lunch || {}),
      dinner: normalizePlannerSlot(next.days[day]?.dinner || {})
    };
  });

  return next;
}

function normalizeShopping(input = {}) {
  return {
    items: cleanArray(input.items).map((item) => ({
      id: item.id || uidLocal(),
      name: String(item.name || "").trim(),
      normalized_name: String(item.normalized_name || item.name || "").trim().toLowerCase(),
      quantity: Number(item.quantity || 0) || 0,
      unit: String(item.unit || "").trim(),
      quantity_g: item.quantity_g === null || item.quantity_g === undefined || item.quantity_g === ""
        ? null
        : Number(item.quantity_g),
      category: String(item.category || "").trim(),
      checked: Boolean(item.checked),
      from_recipe_ids: cleanArray(item.from_recipe_ids),
      from_slot_ids: cleanArray(item.from_slot_ids)
    })),
    updated_at: input.updated_at || new Date().toISOString()
  };
}

export function uid() {
  return uidLocal();
}

export function normalizeStoredRecipe(recipe = {}) {
  return normalizeRecipe(recipe);
}

export function getSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEYS.settings) || "{}");
    return { ...DEFAULT_SETTINGS, ...saved };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(next) {
  const merged = { ...getSettings(), ...next };
  localStorage.setItem(KEYS.settings, JSON.stringify(merged));
  return merged;
}

export function getRecipes() {
  try {
    const recipes = JSON.parse(localStorage.getItem(KEYS.recipes) || "[]");
    if (!Array.isArray(recipes)) return [];
    return recipes.map(normalizeRecipe);
  } catch {
    return [];
  }
}

export function saveRecipes(recipes) {
  localStorage.setItem(KEYS.recipes, JSON.stringify((recipes || []).map(normalizeRecipe)));
}

export function addRecipe(recipe) {
  const current = getRecipes();
  current.unshift(normalizeRecipe(recipe));
  saveRecipes(current);
}

export function getRecipeById(id) {
  return getRecipes().find((r) => r.id === id);
}

export function updateRecipeById(id, updatedRecipe) {
  const current = getRecipes();
  const next = current.map((recipe) => {
    if (recipe.id !== id) return recipe;
    return normalizeRecipe({
      ...recipe,
      ...updatedRecipe,
      id,
      updated_at: new Date().toISOString()
    });
  });
  saveRecipes(next);
  return next.find((r) => r.id === id);
}

export function deleteRecipeById(id) {
  const next = getRecipes().filter((r) => r.id !== id);
  saveRecipes(next);
}

export function getPantry() {
  try {
    const pantry = JSON.parse(localStorage.getItem(KEYS.pantry) || "[]");
    return Array.isArray(pantry) ? pantry.map(normalizePantryItem) : [];
  } catch {
    return [];
  }
}

export function savePantry(items) {
  localStorage.setItem(KEYS.pantry, JSON.stringify((items || []).map(normalizePantryItem)));
}

export function addPantryItem(item) {
  const current = getPantry();
  current.unshift(normalizePantryItem(item));
  savePantry(current);
}

export function updatePantryItem(id, updates) {
  const next = getPantry().map((item) =>
    item.id === id
      ? normalizePantryItem({ ...item, ...updates, id, updated_at: new Date().toISOString() })
      : item
  );
  savePantry(next);
}

export function deletePantryItem(id) {
  savePantry(getPantry().filter((item) => item.id !== id));
}

export function getPlanner() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEYS.planner) || "{}");
    return normalizePlanner(saved);
  } catch {
    return normalizePlanner({});
  }
}

export function savePlanner(planner) {
  const normalized = normalizePlanner(planner);
  localStorage.setItem(KEYS.planner, JSON.stringify(normalized));
  return normalized;
}

export function getShoppingList() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEYS.shopping) || "{}");
    return normalizeShopping(saved);
  } catch {
    return normalizeShopping({});
  }
}

export function saveShoppingList(payload) {
  const normalized = normalizeShopping(payload);
  localStorage.setItem(KEYS.shopping, JSON.stringify(normalized));
  return normalized;
}

export function exportAppData() {
  const settings = getSettings();
  return {
    app: "CookFlow",
    version: 5,
    exportedAt: new Date().toISOString(),
    recipes: getRecipes(),
    pantry: getPantry(),
    planner: getPlanner(),
    shopping: getShoppingList(),
    settings: {
      provider: settings.provider,
      model: settings.model,
      endpoint: settings.endpoint
    }
  };
}

export function importAppData(payload) {
  if (!payload || !Array.isArray(payload.recipes)) {
    throw new Error("Invalid backup file.");
  }

  saveRecipes(payload.recipes);

  if (Array.isArray(payload.pantry)) {
    savePantry(payload.pantry);
  }

  if (payload.planner) {
    savePlanner(payload.planner);
  }

  if (payload.shopping) {
    saveShoppingList(payload.shopping);
  }

  if (payload.settings) {
    saveSettings(payload.settings);
  }
}
