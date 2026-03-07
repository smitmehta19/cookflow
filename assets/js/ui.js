export const CATEGORY_ORDER = [
  "vegetable",
  "spice",
  "protein",
  "dairy",
  "grain",
  "herb",
  "sauce",
  "fruit",
  "other"
];

const CATEGORY_LABELS = {
  vegetable: "Vegetables",
  spice: "Spices",
  protein: "Proteins",
  dairy: "Dairy",
  grain: "Grains",
  herb: "Herbs",
  sauce: "Sauces",
  fruit: "Fruits",
  other: "Other"
};

export function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function toast(message, tone = "default") {
  const root = document.getElementById("toastRoot");
  if (!root) return;

  const color =
    tone === "error"
      ? "border-red-400/25 bg-red-500/12 text-red-200"
      : tone === "success"
      ? "border-emerald-400/25 bg-emerald-500/12 text-emerald-200"
      : "border-white/10 bg-zinc-900/90 text-zinc-100";

  const el = document.createElement("div");
  el.className = `toast rounded-2xl border px-4 py-3 text-sm shadow-lg backdrop-blur ${color}`;
  el.textContent = message;
  root.appendChild(el);

  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateY(6px)";
    el.style.transition = "all 200ms ease";
    setTimeout(() => el.remove(), 220);
  }, 2600);
}

export function parseNumberish(value) {
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

export function formatQty(num) {
  if (!Number.isFinite(num)) return "";
  if (Math.abs(num - Math.round(num)) < 0.001) return String(Math.round(num));
  if (num < 1) return String(Number(num.toFixed(2)));
  return String(Number(num.toFixed(1)));
}

export function parseTimeToMinutes(input) {
  if (typeof input === "number") return input;
  const str = String(input || "").toLowerCase();
  if (!str) return 0;

  let total = 0;
  const hours = [...str.matchAll(/(\d+)\s*(h|hr|hrs|hour|hours)/g)];
  const mins = [...str.matchAll(/(\d+)\s*(m|min|mins|minute|minutes)/g)];

  hours.forEach((m) => {
    total += Number(m[1]) * 60;
  });

  mins.forEach((m) => {
    total += Number(m[1]);
  });

  if (!total) {
    const plain = str.match(/(\d+)/);
    if (plain) total = Number(plain[1]);
  }

  return total || 0;
}

export function totalTime(recipe) {
  if (recipe?.total_time) return parseTimeToMinutes(recipe.total_time);
  return parseTimeToMinutes(recipe?.prep_time) + parseTimeToMinutes(recipe?.cook_time);
}

export function recipeEmoji(recipe) {
  const text = `${recipe?.name || ""} ${recipe?.description || ""} ${(recipe?.tags || []).join(" ")} ${recipe?.cuisine || ""}`.toLowerCase();
  if (/(pasta|noodle|ramen)/.test(text)) return "🍝";
  if (/(rice|biryani|fried rice|pulao|khichdi)/.test(text)) return "🍚";
  if (/(salad)/.test(text)) return "🥗";
  if (/(soup|broth)/.test(text)) return "🍲";
  if (/(sandwich|toast|wrap)/.test(text)) return "🥪";
  if (/(egg|omelette|omelet)/.test(text)) return "🍳";
  if (/(dessert|cake|cookie|sweet|halwa)/.test(text)) return "🍰";
  if (/(chicken)/.test(text)) return "🍗";
  if (/(mexican|taco|quesadilla)/.test(text)) return "🌮";
  if (/(indian|curry|masala|paneer|dal)/.test(text)) return "🍛";
  return "🍜";
}

export function queryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

export function youtubeEmbedUrl(urlString) {
  if (!urlString) return null;

  try {
    const url = new URL(urlString);

    if (url.hostname === "youtu.be") {
      const id = url.pathname.replace("/", "").trim();
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }

    if (url.hostname.includes("youtube.com")) {
      const v = url.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;

      const parts = url.pathname.split("/").filter(Boolean);
      const embedIndex = parts.findIndex((p) => p === "embed");
      if (embedIndex !== -1 && parts[embedIndex + 1]) {
        return `https://www.youtube.com/embed/${parts[embedIndex + 1]}`;
      }
    }

    return null;
  } catch {
    return null;
  }
}

export function linesToArray(text) {
  return String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function getTimeGreeting(name = "there") {
  const hour = new Date().getHours();
  const firstName = String(name || "there").trim();

  if (hour < 12) return `Good morning, ${firstName}`;
  if (hour < 18) return `Good afternoon, ${firstName}`;
  return `Good evening, ${firstName}`;
}

export function confidenceColor(level = "medium") {
  if (level === "high") return "text-emerald-300";
  if (level === "low") return "text-amber-300";
  return "text-sky-300";
}

export function normalizeName(value = "") {
  return String(value).trim().toLowerCase();
}

export function formatNutritionLine(nutrition = {}) {
  const parts = [];
  if (nutrition.calories) parts.push(`${nutrition.calories} kcal`);
  if (nutrition.protein_g) parts.push(`${nutrition.protein_g}g protein`);
  if (nutrition.carbs_g) parts.push(`${nutrition.carbs_g}g carbs`);
  if (nutrition.fat_g) parts.push(`${nutrition.fat_g}g fat`);
  return parts.join(" • ");
}

export function getCategoryLabel(key = "other") {
  return CATEGORY_LABELS[key] || "Other";
}

export function inferIngredientCategory(name = "", fallback = "") {
  if (fallback) return fallback;

  const text = normalizeName(name);

  if (/(onion|tomato|potato|capsicum|bell pepper|spinach|palak|cabbage|cauliflower|peas|pea|carrot|beans|garlic|ginger|chilli|chili|pepper|okra|bhindi|brinjal|eggplant|mushroom|corn|coriander leaves|spring onion|mint leaves)/.test(text)) {
    return "vegetable";
  }

  if (/(turmeric|cumin|jeera|mustard seed|mustard seeds|garam masala|masala|chilli powder|red chilli|paprika|oregano|coriander powder|coriander seeds|pepper powder|black pepper|chaat masala|cinnamon|cardamom|clove|hing|asafoetida|kasuri methi|bay leaf|fenugreek|fennel|ajwain|salt)/.test(text)) {
    return "spice";
  }

  if (/(paneer|milk|cream|cheese|butter|ghee|curd|yogurt|yoghurt)/.test(text)) {
    return "dairy";
  }

  if (/(rice|pasta|poha|sooji|semolina|flour|atta|maida|bread|noodles|oats|quinoa|vermicelli)/.test(text)) {
    return "grain";
  }

  if (/(dal|lentil|chickpea|rajma|beans|tofu|soy|soya|paneer)/.test(text)) {
    return "protein";
  }

  if (/(coriander|cilantro|mint|basil|parsley|thyme)/.test(text)) {
    return "herb";
  }

  if (/(sauce|ketchup|soy sauce|vinegar|paste|pesto|chutney|mayo|mayonnaise)/.test(text)) {
    return "sauce";
  }

  if (/(apple|banana|lemon|lime|orange|mango|avocado|berry|berries|fruit)/.test(text)) {
    return "fruit";
  }

  return "other";
}

export function groupIngredientsByCategory(items = []) {
  const map = {};

  items.forEach((item) => {
    const category = inferIngredientCategory(item.name, item.category);
    if (!map[category]) map[category] = [];
    map[category].push({ ...item, category });
  });

  return CATEGORY_ORDER
    .filter((key) => map[key]?.length)
    .map((key) => ({
      key,
      label: getCategoryLabel(key),
      items: map[key].sort((a, b) => a.name.localeCompare(b.name))
    }));
}

export function groupItemsByCategory(items = []) {
  const map = {};

  items.forEach((item) => {
    const category = inferIngredientCategory(item.name, item.category);
    if (!map[category]) map[category] = [];
    map[category].push({ ...item, category });
  });

  return CATEGORY_ORDER
    .filter((key) => map[key]?.length)
    .map((key) => ({
      key,
      label: getCategoryLabel(key),
      items: map[key].sort((a, b) => a.name.localeCompare(b.name))
    }));
}

export function estimatePantryMatch(recipe, pantry = []) {
  const pantryNames = new Set((pantry || []).filter((p) => p.in_stock).map((p) => normalizeName(p.normalized_name || p.name)));
  const ingredients = recipe?.ingredients || [];

  if (!ingredients.length) {
    return {
      score: 0,
      have: [],
      missing: []
    };
  }

  const have = [];
  const missing = [];

  ingredients.forEach((item) => {
    const key = normalizeName(item.normalized_name || item.name);
    if (pantryNames.has(key)) have.push(key);
    else missing.push(key);
  });

  const score = Math.round((have.length / ingredients.length) * 100);
  return { score, have, missing };
}

function getSlotById(planner, slotId) {
  const [day, meal] = String(slotId || "").split("-");
  return planner?.days?.[day]?.[meal] || null;
}

function getSourceSlotLabel(slotId) {
  if (!slotId) return "";
  const [day, meal] = slotId.split("-");
  const dayLabel = day ? day.charAt(0).toUpperCase() + day.slice(1) : "";
  const mealLabel = meal ? meal.charAt(0).toUpperCase() + meal.slice(1) : "";
  return `${dayLabel} ${mealLabel}`.trim();
}

export function buildShoppingItemsFromPlanner(planner, recipes, pantry = []) {
  const recipeMap = new Map((recipes || []).map((r) => [r.id, r]));
  const pantryNames = new Set((pantry || []).filter((p) => p.in_stock).map((p) => normalizeName(p.normalized_name || p.name)));
  const merged = new Map();

  const slotIds = [];
  Object.keys(planner?.days || {}).forEach((day) => {
    slotIds.push(`${day}-lunch`, `${day}-dinner`);
  });

  slotIds.forEach((slotId) => {
    const slot = getSlotById(planner, slotId);
    if (!slot?.recipe_id) return;
    if (slot.carry_over_from) return;

    const recipe = recipeMap.get(slot.recipe_id);
    if (!recipe) return;

    let totalServingsNeeded = Math.max(1, Number(slot.servings_needed || 1));

    let nextSlotId = slot.carry_to;
    const visited = new Set([slotId]);

    while (nextSlotId && !visited.has(nextSlotId)) {
      visited.add(nextSlotId);
      const nextSlot = getSlotById(planner, nextSlotId);
      if (!nextSlot || nextSlot.carry_over_from !== slotId && nextSlot.carry_over_from !== [...visited][visited.size - 2]) break;
      totalServingsNeeded += Math.max(1, Number(nextSlot.servings_needed || 1));
      nextSlotId = nextSlot.carry_to;
    }

    const baseServings = Math.max(1, Number(recipe.base_servings || recipe.servings || 1));
    const ratio = totalServingsNeeded / baseServings;

    (recipe.ingredients || []).forEach((ingredient) => {
      if (ingredient.optional) return;

      const normalized = normalizeName(ingredient.normalized_name || ingredient.name);
      if (!normalized) return;

      if (pantryNames.has(normalized)) return;

      const category = inferIngredientCategory(ingredient.name, ingredient.category);
      const unit = ingredient.unit || "";
      const key = `${normalized}|${unit}|${category}`;

      const existing = merged.get(key) || {
        id: key,
        name: ingredient.name,
        normalized_name: normalized,
        quantity: 0,
        unit,
        quantity_g: null,
        category,
        checked: false,
        from_recipe_ids: [],
        from_slot_ids: []
      };

      existing.quantity += Number(ingredient.base_quantity || 0) * ratio;

      if (ingredient.quantity_g) {
        existing.quantity_g = (existing.quantity_g || 0) + Number(ingredient.quantity_g) * ratio;
      }

      existing.from_recipe_ids = [...new Set([...existing.from_recipe_ids, recipe.id])];
      existing.from_slot_ids = [...new Set([...existing.from_slot_ids, slotId])];

      if (ingredient.name.length > existing.name.length) {
        existing.name = ingredient.name;
      }

      merged.set(key, existing);
    });
  });

  return [...merged.values()]
    .map((item) => ({
      ...item,
      quantity: Number(item.quantity.toFixed(2)),
      quantity_g: item.quantity_g ? Number(item.quantity_g.toFixed(2)) : null
    }))
    .sort((a, b) => {
      const aIndex = CATEGORY_ORDER.indexOf(a.category);
      const bIndex = CATEGORY_ORDER.indexOf(b.category);
      if (aIndex !== bIndex) return aIndex - bIndex;
      return a.name.localeCompare(b.name);
    });
}

export function mergeShoppingItems(existingItems = [], newItems = []) {
  const merged = new Map();

  [...existingItems, ...newItems].forEach((item) => {
    const category = inferIngredientCategory(item.name, item.category);
    const key = `${normalizeName(item.normalized_name || item.name)}|${item.unit || ""}|${category}`;

    const current = merged.get(key) || {
      id: item.id || key,
      name: item.name,
      normalized_name: normalizeName(item.normalized_name || item.name),
      quantity: 0,
      unit: item.unit || "",
      quantity_g: null,
      category,
      checked: false,
      from_recipe_ids: [],
      from_slot_ids: []
    };

    current.quantity += Number(item.quantity || 0);
    current.quantity_g = (current.quantity_g || 0) + Number(item.quantity_g || 0);
    current.from_recipe_ids = [...new Set([...(current.from_recipe_ids || []), ...((item.from_recipe_ids) || [])])];
    current.from_slot_ids = [...new Set([...(current.from_slot_ids || []), ...((item.from_slot_ids) || [])])];
    current.checked = current.checked || Boolean(item.checked);

    merged.set(key, current);
  });

  return [...merged.values()].map((item) => ({
    ...item,
    quantity: Number((item.quantity || 0).toFixed(2)),
    quantity_g: item.quantity_g ? Number(item.quantity_g.toFixed(2)) : null
  }));
}

export function describeCarry(slotId) {
  return getSourceSlotLabel(slotId);
}
