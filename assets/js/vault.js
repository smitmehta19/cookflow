import { mountLayout } from "./app.js";
import {
  getRecipes,
  addRecipe,
  deleteRecipeById,
  updateRecipeById,
  getRecipeById
} from "./storage.js";
import { parseRecipeWithAI, cleanRecipeWithAI } from "./llm.js";
import {
  escapeHtml,
  recipeEmoji,
  totalTime,
  formatNutritionLine,
  confidenceColor,
  toast
} from "./ui.js";

mountLayout({
  page: "vault",
  title: "Recipe Vault",
  content: `
    <section class="mx-auto max-w-6xl space-y-4">
      <div class="card rounded-[2rem] p-5">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h1 class="text-2xl font-semibold">Recipe vault</h1>
            <p class="mt-1 text-sm text-zinc-400">
              Paste any recipe link or raw text and save it cleanly into your vault.
            </p>
          </div>
          <div class="hidden sm:flex h-14 w-14 items-center justify-center rounded-3xl bg-white/5 text-2xl">
            📚
          </div>
        </div>

        <form id="addRecipeForm" class="mt-5 space-y-4">
          <div>
            <label class="mb-2 block text-xs uppercase tracking-wider text-zinc-400">Recipe URL</label>
            <input
              id="sourceUrl"
              class="input"
              placeholder="YouTube, food blog, recipe page, or any public link"
            />
          </div>

          <div>
            <label class="mb-2 block text-xs uppercase tracking-wider text-zinc-400">Raw text</label>
            <textarea
              id="rawText"
              class="textarea"
              rows="5"
              placeholder="Optional. Paste recipe text here if you want to help extraction."
            ></textarea>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <div>
              <label class="mb-2 block text-xs uppercase tracking-wider text-zinc-400">Base servings</label>
              <input id="baseServings" type="number" min="1" class="input" value="2" />
            </div>
          </div>

          <div class="flex flex-wrap gap-3">
            <button id="extractBtn" class="btn btn-primary" type="submit">Extract recipe</button>
            <button id="clearFormBtn" class="btn btn-secondary" type="button">Clear</button>
          </div>
        </form>
      </div>

      <div class="card rounded-[2rem] p-5">
        <div class="grid gap-3 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <label class="mb-2 block text-xs uppercase tracking-wider text-zinc-400">Search</label>
            <input id="searchInput" class="input" placeholder="Search by name, tags, cuisine..." />
          </div>

          <div>
            <label class="mb-2 block text-xs uppercase tracking-wider text-zinc-400">Cuisine</label>
            <select id="cuisineFilter" class="select">
              <option value="">All cuisines</option>
              <option value="indian">Indian</option>
              <option value="italian">Italian</option>
              <option value="mexican">Mexican</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label class="mb-2 block text-xs uppercase tracking-wider text-zinc-400">Difficulty</label>
            <select id="difficultyFilter" class="select">
              <option value="">Any difficulty</option>
              <option value="1">1 - Very easy</option>
              <option value="2">2 - Easy</option>
              <option value="3">3 - Medium</option>
              <option value="4">4 - Hard</option>
              <option value="5">5 - Very hard</option>
            </select>
          </div>
        </div>
      </div>

      <div id="recipeList" class="space-y-3"></div>
    </section>
  `
});

const addRecipeForm = document.getElementById("addRecipeForm");
const sourceUrlInput = document.getElementById("sourceUrl");
const rawTextInput = document.getElementById("rawText");
const baseServingsInput = document.getElementById("baseServings");
const extractBtn = document.getElementById("extractBtn");
const clearFormBtn = document.getElementById("clearFormBtn");

const recipeList = document.getElementById("recipeList");
const searchInput = document.getElementById("searchInput");
const cuisineFilter = document.getElementById("cuisineFilter");
const difficultyFilter = document.getElementById("difficultyFilter");

renderRecipes();

addRecipeForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const sourceUrl = sourceUrlInput.value.trim();
  const rawText = rawTextInput.value.trim();
  const baseServings = Math.max(1, parseInt(baseServingsInput.value || "2", 10));

  if (!sourceUrl && !rawText) {
    toast("Add a recipe URL or some raw text first.", "error");
    return;
  }

  extractBtn.disabled = true;
  extractBtn.textContent = "Extracting...";

  try {
    const recipe = await parseRecipeWithAI(rawText, sourceUrl, baseServings);
    addRecipe(recipe);
    addRecipeForm.reset();
    baseServingsInput.value = "2";
    renderRecipes();
    toast(`${recipe.name} added to vault.`, "success");
  } catch (error) {
    toast(error.message || "Recipe extraction failed.", "error");
  } finally {
    extractBtn.disabled = false;
    extractBtn.textContent = "Extract recipe";
  }
});

clearFormBtn.addEventListener("click", () => {
  addRecipeForm.reset();
  baseServingsInput.value = "2";
});

searchInput.addEventListener("input", renderRecipes);
cuisineFilter.addEventListener("change", renderRecipes);
difficultyFilter.addEventListener("change", renderRecipes);

recipeList.addEventListener("click", async (e) => {
  const deleteBtn = e.target.closest("[data-delete]");
  const cleanBtn = e.target.closest("[data-clean]");

  if (deleteBtn) {
    const id = deleteBtn.dataset.delete;
    if (!confirm("Delete this recipe from the vault?")) return;
    deleteRecipeById(id);
    renderRecipes();
    toast("Recipe deleted.", "success");
    return;
  }

  if (cleanBtn) {
    const id = cleanBtn.dataset.clean;
    const recipe = getRecipeById(id);
    if (!recipe) return;

    cleanBtn.disabled = true;
    cleanBtn.textContent = "Cleaning...";

    try {
      const cleaned = await cleanRecipeWithAI(recipe);
      updateRecipeById(id, cleaned);
      renderRecipes();
      toast("Recipe cleaned and improved.", "success");
    } catch (error) {
      toast(error.message || "AI cleanup failed.", "error");
    } finally {
      cleanBtn.disabled = false;
      cleanBtn.textContent = "AI cleanup";
    }
  }
});

function renderRecipes() {
  const query = searchInput.value.trim().toLowerCase();
  const cuisine = cuisineFilter.value.trim().toLowerCase();
  const difficulty = difficultyFilter.value.trim();

  const recipes = getRecipes();

  const filtered = recipes.filter((recipe) => {
    const text = `${recipe.name} ${recipe.description} ${recipe.cuisine} ${(recipe.tags || []).join(" ")}`.toLowerCase();

    if (query && !text.includes(query)) return false;

    if (cuisine) {
      const recipeCuisine = (recipe.cuisine || "").toLowerCase();

      if (cuisine === "other") {
        if (["indian", "italian", "mexican"].includes(recipeCuisine)) return false;
      } else if (!recipeCuisine.includes(cuisine)) {
        return false;
      }
    }

    if (difficulty && String(recipe.difficulty_1_to_5) !== difficulty) return false;

    return true;
  });

  if (!filtered.length) {
    recipeList.innerHTML = `
      <div class="card rounded-[2rem] p-6">
        <div class="text-4xl">🍜</div>
        <h3 class="mt-3 text-xl font-semibold">${recipes.length ? "No recipes match your filters" : "Your vault is empty"}</h3>
        <p class="mt-2 text-zinc-400">
          ${recipes.length ? "Try a different search or difficulty filter." : "Add your first recipe using the form above."}
        </p>
      </div>
    `;
    return;
  }

  recipeList.innerHTML = filtered.map((recipe) => {
    const nutritionLine = formatNutritionLine(recipe.nutrition_per_serving || {});
    const minutes = totalTime(recipe);
    const confidence = recipe.confidence || null;

    return `
      <div class="card rounded-[2rem] p-4">
        <div class="flex items-start justify-between gap-4">
          <a href="./recipe.html?id=${recipe.id}" class="flex min-w-0 flex-1 items-start gap-4">
            <div class="text-4xl shrink-0">${recipeEmoji(recipe)}</div>

            <div class="min-w-0">
              <h3 class="truncate text-lg font-semibold">${escapeHtml(recipe.name)}</h3>
              <p class="mt-1 truncate text-sm text-zinc-400">${escapeHtml(recipe.description || "Saved in your vault")}</p>

              <div class="mt-3 flex flex-wrap gap-2">
                ${recipe.cuisine ? `<span class="pill">${escapeHtml(recipe.cuisine)}</span>` : ""}
                ${minutes ? `<span class="pill">${minutes} min</span>` : ""}
                <span class="pill">${recipe.ingredients.length} ingredients</span>
                <span class="pill">${escapeHtml(String(recipe.difficulty_1_to_5))}/5</span>
                ${(recipe.tags || []).slice(0, 3).map((tag) => `<span class="pill">${escapeHtml(tag)}</span>`).join("")}
              </div>

              ${nutritionLine ? `<p class="mt-2 text-xs text-zinc-400">${escapeHtml(nutritionLine)}</p>` : ""}

              ${confidence ? `
                <p class="mt-1 text-xs ${confidenceColor(confidence.overall)}">
                  Confidence: ${escapeHtml(confidence.overall || "medium")}
                </p>
              ` : ""}
            </div>
          </a>

          <div class="flex shrink-0 flex-col gap-2">
            <a href="./recipe.html?id=${recipe.id}" class="btn btn-secondary px-3 py-2 text-xs">Open</a>
            <button data-clean="${recipe.id}" class="btn btn-ghost px-3 py-2 text-xs">AI cleanup</button>
            <button data-delete="${recipe.id}" class="btn btn-danger px-3 py-2 text-xs">Delete</button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

