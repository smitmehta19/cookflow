import { mountLayout } from "./app.js";
import { getRecipes, addRecipe } from "./storage.js";
import { generateRecipeIdeasFromMood } from "./llm.js";
import {
  escapeHtml,
  recipeEmoji,
  totalTime,
  formatNutritionLine,
  toast
} from "./ui.js";

let savedRecipes = getRecipes();
let currentAiSuggestions = [];
let selectedAiRecipe = null;
let selectedVaultRecipe = null;

mountLayout({
  page: "mood",
  title: "Mood Engine",
  content: `
    <section class="mx-auto max-w-6xl space-y-4">
      <div class="card rounded-[2rem] p-5">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h1 class="text-2xl font-semibold">Mood engine</h1>
            <p class="mt-1 text-sm text-zinc-400">
              Pick your mood and laziness level, then get recipes from your vault and fresh AI suggestions.
            </p>
          </div>
          <div class="hidden sm:flex h-14 w-14 items-center justify-center rounded-3xl bg-white/5 text-2xl">
            🧠
          </div>
        </div>

        <form id="moodForm" class="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <label class="mb-2 block text-xs uppercase tracking-wider text-zinc-400">Mood</label>
            <select id="moodInput" class="select">
              <option value="comfort">Comfort</option>
              <option value="light">Light</option>
              <option value="spicy">Spicy</option>
              <option value="healthy">Healthy</option>
              <option value="lazy">Lazy</option>
              <option value="indulgent">Indulgent</option>
            </select>
          </div>

          <div>
            <label class="mb-2 block text-xs uppercase tracking-wider text-zinc-400">Energy</label>
            <select id="energyInput" class="select">
              <option value="low">Low</option>
              <option value="medium" selected>Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div>
            <label class="mb-2 block text-xs uppercase tracking-wider text-zinc-400">Laziness</label>
            <select id="lazinessInput" class="select">
              <option value="high">Very lazy</option>
              <option value="medium" selected>Medium</option>
              <option value="low">Willing to cook</option>
            </select>
          </div>

          <div>
            <label class="mb-2 block text-xs uppercase tracking-wider text-zinc-400">Time of day</label>
            <select id="timeInput" class="select">
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner" selected>Dinner</option>
              <option value="snack">Snack</option>
            </select>
          </div>

          <div>
            <label class="mb-2 block text-xs uppercase tracking-wider text-zinc-400">Diet</label>
            <select id="dietInput" class="select">
              <option value="vegetarian" selected>Vegetarian</option>
              <option value="vegan">Vegan</option>
              <option value="anything">Anything</option>
            </select>
          </div>

          <div>
            <label class="mb-2 block text-xs uppercase tracking-wider text-zinc-400">Cuisine</label>
            <select id="cuisineInput" class="select">
              <option value="indian" selected>Indian</option>
              <option value="italian">Italian</option>
              <option value="mexican">Mexican</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>

          <div class="md:col-span-2 xl:col-span-3 flex flex-wrap gap-3">
            <button id="runMoodBtn" class="btn btn-primary" type="submit">Generate recipes</button>
            <button id="resetMoodBtn" class="btn btn-secondary" type="button">Reset</button>
          </div>
        </form>
      </div>

      <div class="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <div class="card rounded-[2rem] p-5">
          <div class="flex items-center justify-between gap-4">
            <div>
              <h2 class="text-xl font-semibold">From your vault</h2>
              <p class="mt-1 text-sm text-zinc-400">Recipes you already saved and can cook again.</p>
            </div>
            <span id="vaultMatchCount" class="text-sm text-zinc-500"></span>
          </div>

          <div id="vaultSuggestions" class="mt-4 space-y-3"></div>
        </div>

        <div class="card rounded-[2rem] p-5">
          <div class="flex items-center justify-between gap-4">
            <div>
              <h2 class="text-xl font-semibold">AI suggestions</h2>
              <p class="mt-1 text-sm text-zinc-400">Fresh easy ideas based on your current mood.</p>
            </div>
            <span id="aiMatchCount" class="text-sm text-zinc-500"></span>
          </div>

          <div id="aiSuggestions" class="mt-4 space-y-3"></div>
        </div>
      </div>

      <div class="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <div class="card rounded-[2rem] p-5">
          <div class="flex items-center justify-between gap-4">
            <h2 class="text-xl font-semibold">Vault recipe detail</h2>
            <a id="openVaultRecipeLink" href="#" class="btn btn-secondary hidden px-3 py-2 text-xs">Open full page</a>
          </div>
          <div id="vaultRecipeDetail" class="mt-4 text-sm text-zinc-400">
            Click a recipe suggestion from your vault to preview ingredients and steps.
          </div>
        </div>

        <div class="card rounded-[2rem] p-5">
          <div class="flex items-center justify-between gap-4">
            <h2 class="text-xl font-semibold">AI recipe detail</h2>
            <button id="saveAiRecipeBtn" class="btn btn-primary hidden px-3 py-2 text-xs">Add to vault</button>
          </div>
          <div id="aiRecipeDetail" class="mt-4 text-sm text-zinc-400">
            Click an AI suggestion to preview the full recipe, then save it into your vault.
          </div>
        </div>
      </div>
    </section>
  `
});

const moodForm = document.getElementById("moodForm");
const moodInput = document.getElementById("moodInput");
const energyInput = document.getElementById("energyInput");
const lazinessInput = document.getElementById("lazinessInput");
const timeInput = document.getElementById("timeInput");
const dietInput = document.getElementById("dietInput");
const cuisineInput = document.getElementById("cuisineInput");
const resetMoodBtn = document.getElementById("resetMoodBtn");

const vaultSuggestionsEl = document.getElementById("vaultSuggestions");
const aiSuggestionsEl = document.getElementById("aiSuggestions");
const vaultMatchCount = document.getElementById("vaultMatchCount");
const aiMatchCount = document.getElementById("aiMatchCount");

const vaultRecipeDetail = document.getElementById("vaultRecipeDetail");
const aiRecipeDetail = document.getElementById("aiRecipeDetail");
const openVaultRecipeLink = document.getElementById("openVaultRecipeLink");
const saveAiRecipeBtn = document.getElementById("saveAiRecipeBtn");

renderVaultSuggestions([]);

moodForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const filters = getMoodFilters();

  selectedAiRecipe = null;
  selectedVaultRecipe = null;
  saveAiRecipeBtn.classList.add("hidden");
  openVaultRecipeLink.classList.add("hidden");
  aiRecipeDetail.innerHTML = `Generating fresh suggestions...`;
  vaultRecipeDetail.innerHTML = `Finding saved recipes that match your mood...`;

  savedRecipes = getRecipes();

  const rankedVault = rankVaultRecipes(savedRecipes, filters);
  renderVaultSuggestions(rankedVault);
  renderVaultDetail(null);

  try {
    const ideas = await generateRecipeIdeasFromMood(filters);
    currentAiSuggestions = ideas;
    renderAiSuggestions(ideas);
    renderAiDetail(null);
    toast("Mood recipes ready.", "success");
  } catch (error) {
    currentAiSuggestions = [];
    renderAiSuggestions([]);
    renderAiDetail(null, error.message || "Could not generate AI suggestions.");
    toast(error.message || "Could not generate suggestions.", "error");
  }
});

resetMoodBtn.addEventListener("click", () => {
  moodForm.reset();
  currentAiSuggestions = [];
  selectedAiRecipe = null;
  selectedVaultRecipe = null;
  savedRecipes = getRecipes();
  renderVaultSuggestions([]);
  renderAiSuggestions([]);
  renderVaultDetail(null);
  renderAiDetail(null);
  saveAiRecipeBtn.classList.add("hidden");
  openVaultRecipeLink.classList.add("hidden");
});

vaultSuggestionsEl.addEventListener("click", (e) => {
  const card = e.target.closest("[data-vault-id]");
  if (!card) return;

  const id = card.dataset.vaultId;
  const recipe = getRecipes().find((r) => r.id === id);
  if (!recipe) return;

  selectedVaultRecipe = recipe;
  renderVaultDetail(recipe);
});

aiSuggestionsEl.addEventListener("click", (e) => {
  const card = e.target.closest("[data-ai-index]");
  if (!card) return;

  const index = Number(card.dataset.aiIndex);
  const recipe = currentAiSuggestions[index];
  if (!recipe) return;

  selectedAiRecipe = recipe;
  renderAiDetail(recipe);
});

saveAiRecipeBtn.addEventListener("click", () => {
  if (!selectedAiRecipe) return;

  addRecipe({
    ...selectedAiRecipe,
    id: undefined,
    created_at: undefined,
    updated_at: undefined,
    is_ai_generated: true
  });

  toast(`${selectedAiRecipe.name} added to vault.`, "success");
  savedRecipes = getRecipes();
});

function getMoodFilters() {
  return {
    mood: moodInput.value,
    energy: energyInput.value,
    laziness: lazinessInput.value,
    time: timeInput.value,
    diet: dietInput.value,
    cuisine: cuisineInput.value
  };
}

function rankVaultRecipes(recipes, filters) {
  const ranked = recipes.map((recipe) => {
    let score = 0;
    const text = `${recipe.name} ${recipe.description} ${(recipe.tags || []).join(" ")} ${recipe.cuisine}`.toLowerCase();
    const minutes = totalTime(recipe);
    const difficulty = Number(recipe.difficulty_1_to_5 || 2);

    if (filters.cuisine !== "mixed" && text.includes(filters.cuisine)) score += 3;

    if (filters.diet === "vegetarian") {
      if (!/chicken|mutton|beef|fish|egg|prawn|meat/.test(text)) score += 3;
    }

    if (filters.diet === "vegan") {
      if (!/paneer|cheese|milk|cream|butter|ghee|yogurt|curd/.test(text)) score += 3;
    }

    if (filters.laziness === "high") {
      if (minutes && minutes <= 25) score += 4;
      if (difficulty <= 2) score += 3;
    }

    if (filters.laziness === "medium") {
      if (minutes && minutes <= 40) score += 3;
      if (difficulty <= 3) score += 2;
    }

    if (filters.energy === "low") {
      if (difficulty <= 2) score += 2;
    }

    if (filters.mood === "comfort" && /curry|dal|rice|masala|khichdi|pulao|paneer/.test(text)) score += 3;
    if (filters.mood === "light" && /salad|soup|poha|upma|stir/.test(text)) score += 3;
    if (filters.mood === "spicy" && /spicy|chilli|masala|schezwan/.test(text)) score += 3;
    if (filters.mood === "healthy" && /healthy|protein|salad|dal|sprout|grill/.test(text)) score += 3;
    if (filters.mood === "lazy" && /toast|sandwich|one-pot|quick|instant/.test(text)) score += 3;
    if (filters.mood === "indulgent" && /creamy|cheesy|butter|fried|loaded/.test(text)) score += 3;

    return { recipe, score };
  });

  return ranked
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((item) => item.recipe);
}

function renderVaultSuggestions(recipes) {
  vaultMatchCount.textContent = `${recipes.length} matches`;

  if (!recipes.length) {
    vaultSuggestionsEl.innerHTML = `
      <div class="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 text-sm text-zinc-400">
        Run the mood engine to see matching saved recipes here.
      </div>
    `;
    return;
  }

  vaultSuggestionsEl.innerHTML = recipes.map((recipe) => {
    const nutritionLine = formatNutritionLine(recipe.nutrition_per_serving || {});
    return `
      <button data-vault-id="${recipe.id}" class="w-full rounded-[1.5rem] border border-white/10 bg-white/5 p-4 text-left transition hover:border-emerald-400/30">
        <div class="flex items-start gap-4">
          <div class="text-3xl shrink-0">${recipeEmoji(recipe)}</div>
          <div class="min-w-0 flex-1">
            <div class="truncate text-base font-semibold">${escapeHtml(recipe.name)}</div>
            <div class="mt-1 text-sm text-zinc-400">${escapeHtml(recipe.description || "Saved recipe")}</div>
            <div class="mt-3 flex flex-wrap gap-2">
              ${recipe.cuisine ? `<span class="pill">${escapeHtml(recipe.cuisine)}</span>` : ""}
              ${totalTime(recipe) ? `<span class="pill">${totalTime(recipe)} min</span>` : ""}
              <span class="pill">${escapeHtml(String(recipe.difficulty_1_to_5 || 2))}/5</span>
            </div>
            ${nutritionLine ? `<div class="mt-2 text-xs text-zinc-500">${escapeHtml(nutritionLine)}</div>` : ""}
          </div>
        </div>
      </button>
    `;
  }).join("");
}

function renderAiSuggestions(recipes) {
  aiMatchCount.textContent = `${recipes.length} suggestions`;

  if (!recipes.length) {
    aiSuggestionsEl.innerHTML = `
      <div class="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 text-sm text-zinc-400">
        No AI suggestions yet. Generate recipes from the form above.
      </div>
    `;
    return;
  }

  aiSuggestionsEl.innerHTML = recipes.map((recipe, index) => {
    const nutritionLine = formatNutritionLine(recipe.nutrition_per_serving || {});
    return `
      <button data-ai-index="${index}" class="w-full rounded-[1.5rem] border border-white/10 bg-white/5 p-4 text-left transition hover:border-blue-400/30">
        <div class="flex items-start gap-4">
          <div class="text-3xl shrink-0">${recipeEmoji(recipe)}</div>
          <div class="min-w-0 flex-1">
            <div class="truncate text-base font-semibold">${escapeHtml(recipe.name)}</div>
            <div class="mt-1 text-sm text-zinc-400">${escapeHtml(recipe.description || "AI recipe suggestion")}</div>
            <div class="mt-3 flex flex-wrap gap-2">
              ${recipe.cuisine ? `<span class="pill">${escapeHtml(recipe.cuisine)}</span>` : ""}
              ${totalTime(recipe) ? `<span class="pill">${totalTime(recipe)} min</span>` : ""}
              <span class="pill">${escapeHtml(String(recipe.difficulty_1_to_5 || 2))}/5</span>
            </div>
            ${nutritionLine ? `<div class="mt-2 text-xs text-zinc-500">${escapeHtml(nutritionLine)}</div>` : ""}
          </div>
        </div>
      </button>
    `;
  }).join("");
}

function renderVaultDetail(recipe) {
  if (!recipe) {
    vaultRecipeDetail.innerHTML = `Click a recipe suggestion from your vault to preview ingredients and steps.`;
    openVaultRecipeLink.classList.add("hidden");
    return;
  }

  openVaultRecipeLink.href = `./recipe.html?id=${recipe.id}`;
  openVaultRecipeLink.classList.remove("hidden");

  vaultRecipeDetail.innerHTML = buildRecipePreview(recipe, false);
}

function renderAiDetail(recipe, fallbackMessage = "") {
  if (!recipe) {
    aiRecipeDetail.innerHTML = fallbackMessage || `Click an AI suggestion to preview the full recipe, then save it into your vault.`;
    saveAiRecipeBtn.classList.add("hidden");
    return;
  }

  saveAiRecipeBtn.classList.remove("hidden");
  aiRecipeDetail.innerHTML = buildRecipePreview(recipe, true);
}

function buildRecipePreview(recipe, isAi) {
  return `
    <div class="space-y-4">
      <div>
        <div class="flex items-start gap-3">
          <div class="text-4xl">${recipeEmoji(recipe)}</div>
          <div>
            <h3 class="text-xl font-semibold">${escapeHtml(recipe.name)}</h3>
            <p class="mt-1 text-zinc-400">${escapeHtml(recipe.description || "")}</p>
          </div>
        </div>

        <div class="mt-3 flex flex-wrap gap-2">
          ${recipe.cuisine ? `<span class="pill">${escapeHtml(recipe.cuisine)}</span>` : ""}
          ${totalTime(recipe) ? `<span class="pill">${totalTime(recipe)} min</span>` : ""}
          <span class="pill">${escapeHtml(String(recipe.servings || recipe.base_servings || 2))} servings</span>
          <span class="pill">${escapeHtml(String(recipe.difficulty_1_to_5 || 2))}/5 difficulty</span>
          ${isAi ? `<span class="pill pill-strong">AI suggestion</span>` : ""}
        </div>
      </div>

      ${(recipe.ingredients || []).length ? `
        <div>
          <h4 class="text-sm font-semibold text-zinc-300">Ingredients</h4>
          <div class="mt-2 space-y-2">
            ${(recipe.ingredients || []).map((item) => `
              <div class="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                ${escapeHtml(item.name)} — ${escapeHtml(String(item.base_quantity || 0))} ${escapeHtml(item.unit || "")}${item.quantity_g ? ` (~${escapeHtml(String(item.quantity_g))} g)` : ""}
              </div>
            `).join("")}
          </div>
        </div>
      ` : ""}

      ${(recipe.steps || []).length ? `
        <div>
          <h4 class="text-sm font-semibold text-zinc-300">Steps</h4>
          <div class="mt-2 space-y-2">
            ${(recipe.steps || []).map((step, index) => `
              <div class="rounded-xl border border-white/10 bg-black/20 p-3">
                <div class="text-xs text-emerald-300">Step ${index + 1}</div>
                <div class="mt-1 text-zinc-200">${escapeHtml(step)}</div>
              </div>
            `).join("")}
          </div>
        </div>
      ` : ""}

      ${(recipe.notes || []).length ? `
        <div>
          <h4 class="text-sm font-semibold text-zinc-300">Notes</h4>
          <div class="mt-2 space-y-2">
            ${(recipe.notes || []).map((note) => `
              <div class="rounded-xl border border-white/10 bg-black/20 p-3 text-zinc-300">
                ${escapeHtml(note)}
              </div>
            `).join("")}
          </div>
        </div>
      ` : ""}
    </div>
  `;
}
