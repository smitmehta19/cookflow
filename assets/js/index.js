import { mountLayout } from "./app.js";
import { getRecipes, getPlanner, getPantry } from "./storage.js";
import { estimatePantryMatch, getTimeGreeting, escapeHtml, recipeEmoji } from "./ui.js";

const recipes = getRecipes();
const planner = getPlanner();
const pantry = getPantry();

const savedRecipesCount = recipes.length;

const pantryReadyCount = recipes.filter((recipe) => {
  const result = estimatePantryMatch(recipe, pantry);
  return result.score >= 80;
}).length;

const plannedMealsCount = countPlannedCooks(planner);

const recentRecipes = recipes.slice(0, 4);

mountLayout({
  page: "home",
  title: "CookFlow",
  content: `
    <section class="mx-auto max-w-7xl space-y-4">
      <div class="card hero-card rounded-[2rem] p-6">
        <div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div class="min-w-0">
            <p class="text-sm text-emerald-300">${escapeHtml(getTimeGreeting("Smit"))}</p>
            <h1 class="mt-2 text-3xl font-semibold sm:text-4xl">Your cooking dashboard</h1>
            <p class="mt-3 max-w-2xl text-zinc-400">
              Plan one-person meals, reuse leftovers smartly, and generate shopping only from what you actually need.
            </p>

            <div class="mt-4 flex flex-wrap gap-2">
              <span class="pill">Single-person planner</span>
              <span class="pill">Carry-forward meals</span>
              <span class="pill">Planner → shopping</span>
              <span class="pill">Grouped ingredients</span>
            </div>
          </div>

          <div class="grid w-full gap-3 sm:grid-cols-3 lg:w-auto">
            <a href="./vault.html" class="btn btn-primary">Add recipes</a>
            <a href="./planner.html" class="btn btn-secondary">Open planner</a>
            <a href="./shopping.html" class="btn btn-secondary">View shopping</a>
          </div>
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div class="card stat-card rounded-[2rem] p-5">
          <div class="stat-label">Vault</div>
          <div class="mt-2 stat-value">${savedRecipesCount}</div>
          <div class="mt-2 stat-subtext">Saved recipes</div>
        </div>

        <div class="card stat-card rounded-[2rem] p-5">
          <div class="stat-label">Pantry-ready</div>
          <div class="mt-2 stat-value">${pantryReadyCount}</div>
          <div class="mt-2 stat-subtext">Can be cooked with what you have</div>
        </div>

        <div class="card stat-card rounded-[2rem] p-5">
          <div class="stat-label">Planner</div>
          <div class="mt-2 stat-value">${plannedMealsCount}</div>
          <div class="mt-2 stat-subtext">Actual cooking plans this week</div>
        </div>
      </div>

      <div class="grid gap-4 lg:grid-cols-3">
        <a href="./vault.html" class="card feature-card rounded-[2rem] p-5">
          <div class="feature-icon">📚</div>
          <h2 class="mt-3 text-xl font-semibold">Recipe vault</h2>
          <p class="mt-2 text-zinc-400">Save recipes from YouTube, blogs, or pasted text and clean them up with AI.</p>
        </a>

        <a href="./planner.html" class="card feature-card rounded-[2rem] p-5">
          <div class="feature-icon">🗓️</div>
          <h2 class="mt-3 text-xl font-semibold">Weekly planner</h2>
          <p class="mt-2 text-zinc-400">Plan lunch and dinner for one person, including carry-forward leftovers.</p>
        </a>

        <a href="./shopping.html" class="card feature-card rounded-[2rem] p-5">
          <div class="feature-icon">🛒</div>
          <h2 class="mt-3 text-xl font-semibold">Shopping list</h2>
          <p class="mt-2 text-zinc-400">Generate only the items you need from your selected planned meals.</p>
        </a>
      </div>

      <div class="card rounded-[2rem] p-5">
        <div class="flex items-center justify-between gap-4">
          <div>
            <h2 class="text-xl font-semibold">Recent recipes</h2>
            <p class="mt-1 text-sm text-zinc-400">Quick access to the latest items in your vault.</p>
          </div>
          <a href="./vault.html" class="btn btn-secondary text-sm">Open vault</a>
        </div>

        ${
          recentRecipes.length
            ? `
              <div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                ${recentRecipes.map((recipe) => `
                  <a href="./recipe.html?id=${recipe.id}" class="card feature-card rounded-[1.5rem] p-4">
                    <div class="flex items-start gap-3">
                      <div class="text-3xl shrink-0">${recipeEmoji(recipe)}</div>
                      <div class="min-w-0">
                        <div class="truncate text-sm font-semibold">${escapeHtml(recipe.name)}</div>
                        <div class="mt-1 text-xs text-zinc-400">${escapeHtml(recipe.cuisine || "Saved recipe")}</div>
                      </div>
                    </div>
                  </a>
                `).join("")}
              </div>
            `
            : `
              <div class="mt-4 rounded-[1.5rem] border border-white/10 bg-white/5 p-5 text-sm text-zinc-400">
                No recipes saved yet. Start by adding one in the Vault.
              </div>
            `
        }
      </div>
    </section>
  `
});

function countPlannedCooks(plannerState) {
  if (!plannerState?.days) return 0;

  let count = 0;

  Object.values(plannerState.days).forEach((day) => {
    ["lunch", "dinner"].forEach((meal) => {
      const slot = day?.[meal];
      if (slot?.recipe_id && !slot?.carry_over_from) {
        count += 1;
      }
    });
  });

  return count;
}
