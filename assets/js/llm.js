import { getSettings } from "./storage.js";

function extractJson(text) {
  const cleaned = String(text || "")
    .replace(/^```json/i, "")
    .replace(/^```/i, "")
    .replace(/```$/i, "")
    .trim();

  const objStart = cleaned.indexOf("{");
  const objEnd = cleaned.lastIndexOf("}");
  if (objStart !== -1 && objEnd !== -1) {
    return cleaned.slice(objStart, objEnd + 1);
  }

  const arrStart = cleaned.indexOf("[");
  const arrEnd = cleaned.lastIndexOf("]");
  if (arrStart !== -1 && arrEnd !== -1) {
    return cleaned.slice(arrStart, arrEnd + 1);
  }

  return cleaned;
}

function normalizeIngredient(item = {}) {
  return {
    name: String(item.name || "Ingredient").trim(),
    normalized_name: String(item.normalized_name || item.name || "ingredient").trim().toLowerCase(),
    base_quantity: Number(item.base_quantity || 0) || 0,
    unit: String(item.unit || "").trim(),
    quantity_g: item.quantity_g === null || item.quantity_g === undefined || item.quantity_g === ""
      ? null
      : Number(item.quantity_g),
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
    ingredients: Array.isArray(component.ingredients) ? component.ingredients.map(normalizeIngredient) : [],
    steps: Array.isArray(component.steps) ? component.steps.map((s) => String(s).trim()).filter(Boolean) : [],
    notes: Array.isArray(component.notes) ? component.notes.map((n) => String(n).trim()).filter(Boolean) : []
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
    notes: Array.isArray(confidence.notes) ? confidence.notes.map((n) => String(n).trim()).filter(Boolean) : []
  };
}

function normalizeRecipe(raw = {}, context = {}) {
  return {
    id: raw.id,
    name: String(raw.name || "Untitled Recipe").trim(),
    description: String(raw.description || "").trim(),
    cuisine: String(raw.cuisine || "").trim(),
    prep_time: String(raw.prep_time || "").trim(),
    cook_time: String(raw.cook_time || "").trim(),
    total_time: String(raw.total_time || "").trim(),
    difficulty_1_to_5: Math.min(5, Math.max(1, parseInt(raw.difficulty_1_to_5, 10) || 2)),
    servings: Math.max(1, parseInt(raw.servings || context.baseServings || 2, 10) || 2),
    base_servings: Math.max(1, parseInt(raw.base_servings || raw.servings || context.baseServings || 2, 10) || 2),
    steps: Array.isArray(raw.steps) ? raw.steps.map((s) => String(s).trim()).filter(Boolean) : [],
    ingredients: Array.isArray(raw.ingredients) ? raw.ingredients.map(normalizeIngredient) : [],
    components: Array.isArray(raw.components) ? raw.components.map(normalizeComponent) : [],
    notes: Array.isArray(raw.notes) ? raw.notes.map((n) => String(n).trim()).filter(Boolean) : [],
    tags: Array.isArray(raw.tags) ? raw.tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean) : [],
    source_url: String(context.sourceUrl || raw.source_url || "").trim(),
    source_type: String(raw.source_type || (String(context.sourceUrl || "").includes("youtu") ? "youtube" : context.sourceUrl ? "web" : "manual")),
    nutrition_per_serving: normalizeNutrition(raw.nutrition_per_serving || {}),
    nutrition_total: normalizeNutrition(raw.nutrition_total || {}),
    confidence: normalizeConfidence(raw.confidence || {}),
    cook_mode: raw.cook_mode || { timers: [], tips: [] },
    ingredient_aliases: Array.isArray(raw.ingredient_aliases) ? raw.ingredient_aliases : [],
    pantry_match_score: Number(raw.pantry_match_score || 0) || 0,
    missing_ingredients_cache: Array.isArray(raw.missing_ingredients_cache) ? raw.missing_ingredients_cache : [],
    last_ai_cleanup_at: raw.last_ai_cleanup_at || "",
    is_ai_generated: Boolean(context.isAiGenerated || raw.is_ai_generated),
    created_at: raw.created_at,
    updated_at: raw.updated_at
  };
}

async function fetchSourceText(sourceUrl) {
  if (!sourceUrl) return "";

  try {
    const readerUrl = `https://r.jina.ai/${sourceUrl}`;
    const response = await fetch(readerUrl);
    if (!response.ok) throw new Error("Could not read the source URL.");
    const text = await response.text();
    return String(text || "").slice(0, 24000);
  } catch {
    return "";
  }
}

function buildRecipePrompt({ rawText, sourceUrl, sourceText, baseServings }) {
  return `
You are an expert recipe extraction engine.

Return ONLY valid JSON. No markdown. No explanation.

Use this exact schema:
{
  "name": "string",
  "description": "string",
  "cuisine": "string",
  "prep_time": "string",
  "cook_time": "string",
  "total_time": "string",
  "difficulty_1_to_5": 1,
  "servings": 2,
  "steps": ["string"],
  "ingredients": [
    {
      "name": "string",
      "normalized_name": "string",
      "base_quantity": 1,
      "unit": "string",
      "quantity_g": 120,
      "notes": "string",
      "category": "vegetable",
      "optional": false
    }
  ],
  "components": [
    {
      "name": "string",
      "type": "chutney",
      "description": "string",
      "ingredients": [],
      "steps": ["string"],
      "notes": ["string"]
    }
  ],
  "notes": ["string"],
  "tags": ["string"],
  "nutrition_per_serving": {
    "calories": 0,
    "protein_g": 0,
    "carbs_g": 0,
    "fat_g": 0,
    "fiber_g": 0,
    "sugar_g": 0,
    "sodium_mg": 0
  },
  "nutrition_total": {
    "calories": 0,
    "protein_g": 0,
    "carbs_g": 0,
    "fat_g": 0,
    "fiber_g": 0,
    "sugar_g": 0,
    "sodium_mg": 0
  },
  "confidence": {
    "overall": "medium",
    "title": "high",
    "ingredients": "medium",
    "times": "low",
    "servings": "low",
    "cuisine": "medium",
    "nutrition": "low",
    "notes": ["string"]
  }
}

Rules:
- Use the raw text and source content together.
- If the page contains sub-recipes like chutney, masala, sauce, stuffing, or topping, put them into "components".
- Extract cuisine, servings, time, difficulty, notes, and full steps when possible.
- Estimate prep_time, cook_time, total_time, and nutrition when not explicit.
- quantity_g should be approximate when reasonable; otherwise null.
- normalized_name should be simplified and lowercase.
- category can be vegetable, fruit, dairy, grain, spice, herb, protein, sauce, other.
- Confidence fields must be high, medium, or low.
- Keep instructions clear and in the right order.
- Use lowercase useful tags.

Base servings:
${baseServings}

Raw text:
${rawText || "N/A"}

Source URL:
${sourceUrl || "N/A"}

Source content:
${sourceText || "N/A"}
  `.trim();
}

function buildSuggestionsPrompt(filters) {
  return `
You are generating recipe suggestions for a cooking assistant app.

Return ONLY valid JSON. No markdown. No explanation.

Use this exact schema:
{
  "suggestions": [
    {
      "name": "string",
      "description": "string",
      "cuisine": "string",
      "prep_time": "string",
      "cook_time": "string",
      "total_time": "string",
      "difficulty_1_to_5": 1,
      "servings": 2,
      "steps": ["string"],
      "ingredients": [
        {
          "name": "string",
          "normalized_name": "string",
          "base_quantity": 1,
          "unit": "string",
          "quantity_g": 120,
          "notes": "string",
          "category": "string",
          "optional": false
        }
      ],
      "components": [],
      "notes": ["string"],
      "tags": ["string"],
      "nutrition_per_serving": {
        "calories": 0,
        "protein_g": 0,
        "carbs_g": 0,
        "fat_g": 0,
        "fiber_g": 0,
        "sugar_g": 0,
        "sodium_mg": 0
      },
      "nutrition_total": {
        "calories": 0,
        "protein_g": 0,
        "carbs_g": 0,
        "fat_g": 0,
        "fiber_g": 0,
        "sugar_g": 0,
        "sodium_mg": 0
      },
      "confidence": {
        "overall": "medium",
        "title": "high",
        "ingredients": "medium",
        "times": "medium",
        "servings": "medium",
        "cuisine": "high",
        "nutrition": "low",
        "notes": ["string"]
      }
    }
  ]
}

User preferences:
- Mood: ${filters.mood}
- Energy level: ${filters.energy}
- Laziness: ${filters.laziness}
- Time of day: ${filters.time}
- Diet: ${filters.diet}
- Preferred cuisine: ${filters.cuisine}

Rules:
- Generate 5 easy-to-cook recipes.
- Strongly prefer quick vegetarian Indian recipes if cuisine is indian.
- Also support simple italian and mexican recipes.
- Respect vegan if requested.
- Keep ingredients practical and easy to shop.
- Keep steps concise but complete.
- Use lowercase tags.
  `.trim();
}

async function requestJsonViaGemini(settings, prompt) {
  const response = await fetch(`${settings.endpoint}?key=${encodeURIComponent(settings.apiKey)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.25,
        responseMimeType: "application/json"
      }
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || "Gemini request failed.");
  }

  const text =
    data?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "";

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return JSON.parse(extractJson(text));
}

async function requestJsonViaOpenAICompatible(settings, prompt) {
  const response = await fetch(settings.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${settings.apiKey}`
    },
    body: JSON.stringify({
      model: settings.model,
      temperature: 0.25,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "Return only valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ]
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || "OpenAI-compatible request failed.");
  }

  let text = data?.choices?.[0]?.message?.content || "";
  if (Array.isArray(text)) {
    text = text.map((part) => part.text || "").join("");
  }

  if (!text) {
    throw new Error("The model returned an empty response.");
  }

  return JSON.parse(extractJson(text));
}

async function requestJson(prompt) {
  const settings = getSettings();

  if (!settings.apiKey) {
    throw new Error("Open Settings and add your API key first.");
  }

  if (settings.provider === "gemini") {
    return requestJsonViaGemini(settings, prompt);
  }

  return requestJsonViaOpenAICompatible(settings, prompt);
}

export async function parseRecipeWithAI(rawText, sourceUrl, baseServings) {
  const cleanedRaw = String(rawText || "").trim();
  const cleanedUrl = String(sourceUrl || "").trim();
  const servings = Math.max(1, parseInt(baseServings, 10) || 2);

  if (!cleanedRaw && !cleanedUrl) {
    throw new Error("Add recipe text or a source URL first.");
  }

  const sourceText = cleanedUrl ? await fetchSourceText(cleanedUrl) : "";
  const prompt = buildRecipePrompt({
    rawText: cleanedRaw,
    sourceUrl: cleanedUrl,
    sourceText,
    baseServings: servings
  });

  const parsed = await requestJson(prompt);

  return normalizeRecipe(parsed, {
    sourceUrl: cleanedUrl,
    baseServings: servings,
    isAiGenerated: false
  });
}

export async function generateRecipeIdeasFromMood(filters) {
  const prompt = buildSuggestionsPrompt(filters);
  const parsed = await requestJson(prompt);

  const suggestions = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.suggestions)
    ? parsed.suggestions
    : [];

  return suggestions.map((recipe) =>
    normalizeRecipe(recipe, {
      sourceUrl: "",
      baseServings: recipe.servings || 2,
      isAiGenerated: true
    })
  );
}

export async function cleanRecipeWithAI(recipe) {
  const prompt = `
You are an expert recipe editor and nutrition analyst.

Return ONLY valid JSON. No markdown. No explanation.

Use the same schema as the input recipe.

Improve the recipe by:
- normalizing ingredient names
- estimating missing grams
- fixing categories
- improving times if obviously wrong
- improving nutrition estimates
- setting realistic confidence fields
- adding confidence notes where data was inferred
- keeping the original meaning and steps intact

Input recipe:
${JSON.stringify(recipe, null, 2)}
  `.trim();

  const parsed = await requestJson(prompt);

  return normalizeRecipe(
    {
      ...recipe,
      ...parsed,
      id: recipe.id,
      created_at: recipe.created_at,
      updated_at: new Date().toISOString(),
      last_ai_cleanup_at: new Date().toISOString()
    },
    {
      sourceUrl: recipe.source_url || "",
      baseServings: recipe.base_servings || recipe.servings || 2,
      isAiGenerated: recipe.is_ai_generated
    }
  );
}
