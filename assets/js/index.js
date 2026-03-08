import { mountLayout } from "./app.js";
import { getRecipes, getPlanner, getPantry, getSettings, saveSettings } from "./storage.js";
import { estimatePantryMatch, getTimeGreeting, escapeHtml, recipeEmoji, toast } from "./ui.js";

const state = {
  recipes: getRecipes(),
  planner: getPlanner(),
  pantry: getPantry(),
  settings: getSettings()
};

const FALLBACK_NAME_KEY = "cookflow_user_name";

init();

function init() {
  const savedName =
    String(state.settings.user_name || "").trim() ||
    String(localStorage.getItem(FALLBACK_NAME_KEY) || "").trim();

  if (!savedName) {
    renderOnboarding();
    bindOnboarding();
    return;
  }

  renderDashboard(savedName);
  bindDashboard(savedName);
}

function renderOnboarding() {
  mountLayout({
    page: "home",
    title: "CookFlow",
    content: `
      <section class="mx-auto max-w-6xl space-y-6">
        <div class="card hero-card rounded-[2rem] p-6 sm:p-8">
          <div class="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div>
              <div class="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-cyan-300">
                <span>⚡</span>
                <span>Cyber kitchen OS</span>
              </div>

              <h1 class="text-4xl font-semibold leading-tight sm:text-5xl">
                Cook smarter, shop smarter, waste less.
              </h1>

              <p class="mt-4 max-w-2xl text-base leading-7 text-zinc-300 sm:text-lg">
                CookFlow helps you save recipes, track pantry ingredients, plan meals for the week,
                and generate a shopping list from what you actually need.
              </p>

              <div class="mt-5 flex flex-wrap gap-2">
                <span class="pill">One-person planning</span>
                <span class="pill">Carry-forward meals</span>
                <span class="pill">Pantry matching</span>
                <span class="pill">Planner → shopping</span>
              </div>
            </div>

            <div class="card rounded-[2rem] p-5 sm:p-6">
              <h2 class="text-2xl font-semibold">Start your kitchen profile</h2>
              <p class="mt-2 text-sm leading-6 text-zinc-400">
                Tell CookFlow your name so the dashboard feels personal and easier to use.
              </p>

              <form id="nameForm" class="mt-5 space-y-4">
                <div>
                  <label for="userNameInput" class="mb-2 block text-xs uppercase tracking-wider text-zinc-400">
                    Your name
                  </label>
                  <input
                    id="userNameInput"
                    class="input"
                    placeholder="Enter your name"
                    maxlength="30"
                    autocomplete="given-name"
                    required
                  />
                </div>

                <button type="submit" class="btn btn-primary w-full">
                  Launch CookFlow
                </button>
              </form>

              <p class="mt-3 text-xs text-zinc-500">
                You can change this later from the dashboard.
              </p>
            </div>
          </div>
        </div>

        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div class="card feature-card rounded-[2rem] p-5">
            <div class="feature-icon">📚</div>
            <h3 class="mt-4 text-lg font-semibold">1. Save recipes</h3>
            <p class="mt-2 text-sm leading-6 text-zinc-400">
              Add recipes from YouTube, websites, or pasted text and keep them in one vault.
            </p>
          </div>

          <div class="card feature-card rounded-[2rem] p-5">
            <div class="feature-icon">🧺</div>
            <h3 class="mt-4 text-lg font-semibold">2. Fill pantry</h3>
            <p class="mt-2 text-sm leading-6 text-zinc-400">
              Add what you already have so CookFlow can spot pantry-ready options.
            </p>
          </div>

          <div class="card feature-card rounded-[2rem] p-5">
            <div class="feature-icon">🗓️</div>
            <h3 class="mt-4 text-lg font-semibold">3. Plan meals</h3>
            <p class="mt-2 text-sm leading-6 text-zinc-400">
              Build a weekly lunch and dinner plan with leftover-friendly flow.
            </p>
          </div>

          <div class="card feature-card rounded-[2rem] p-5">
            <div class="feature-icon">🛒</div>
            <h3 class="mt-4 text-lg font-semibold">4. Shop only once</h3>
            <p class="mt-2 text-sm leading-6 text-zinc-400">
              Generate a shopping list from planned meals instead of guessing manually.
            </p>
          </div>
        </div>

        <div class="card rounded-[2rem] p-6">
          <h2 class="text-2xl font-semibold">What CookFlow is for</h2>
          <div class="mt-4 grid gap-4 lg:grid-cols-3">
            <div class="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
              <div class="text-sm font-semibold text-cyan-300">For busy weekdays</div>
              <p class="mt-2 text-sm leading-6 text-zinc-400">
                Reduce decision fatigue by knowing what to cook before the day gets busy.
              </p>
            </div>

            <div class="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
              <div class="text-sm font-semibold text-cyan-300">For smaller households</div>
              <p class="mt-2 text-sm leading-6 text-zinc-400">
                Reuse meals smartly without overbuying or cooking too much.
              </p>
            </div>

            <div class="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
              <div class="text-sm font-semibold text-cyan-300">For cleaner shopping</div>
              <p class="mt-2 text-sm leading-6 text-zinc-400">
                Buy only what’s missing instead of building a grocery list from scratch every time.
              </p>
            </div>
          </div>
        </div>
      </section>
    `
  });
}

function bindOnboarding() {
  const form = document.getElementById("nameForm");
  const input = document.getElementById("userNameInput");

  form?.addEventListener("submit", (e) => {
    e.preventDefault();

    const nextName = String(input?.value || "").trim();
    if (!nextName) {
      toast?.("Please enter your name.", "error");
      input?.focus();
      return;
    }

    localStorage.setItem(FALLBACK_NAME_KEY, nextName);
    saveSettings({ user_name: nextName });
    state.settings = getSettings();

    renderDashboard(nextName);
    bindDashboard(nextName);
    toast?.(`Welcome, ${nextName}.`, "success");
  });
}

function renderDashboard(userName) {
  state.recipes = getRecipes();
  state.planner = getPlanner();
  state.pantry = getPantry();

  const savedRecipesCount = state.recipes.length;
  const pantryReadyCount = state.recipes.filter((recipe) => {
    const result = estimatePantryMatch(recipe, state.pantry);
    return Number(result?.score || 0) >= 80;
  }).length;

  const plannedMealsCount = countPlannedCooks(state.planner);
  const recentRecipes = state.recipes.slice(0, 4);
  const nextStep = getRecommendedNextStep({
    recipes: savedRecipesCount,
    pantry: state.pantry.length,
    planned: plannedMealsCount
  });

  mountLayout({
    page: "home",
    title: "CookFlow",
    content: `
      <section class="mx-auto max-w-7xl space-y-4">
        <div class="card hero-card rounded-[2rem] p-6">
          <div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div class="min-w-0">
              <p class="text-sm text-emerald-300">${escapeHtml(getTimeGreeting(userName))}</p>
              <h1 class="mt-1 text-3xl font-semibold sm:text-4xl">Welcome to your kitchen command center</h1>
              <p class="mt-3 max-w-2xl text-zinc-400">
                Save recipes, check what you already have, plan your week, and generate shopping lists without the mess.
              </p>

              <div class="mt-4 flex flex-wrap gap-2">
                <span class="pill">Cyberpunk meal planner</span>
                <span class="pill">Pantry-aware cooking</span>
                <span class="pill">Smart leftovers</span>
                <span class="pill">Shopping automation</span>
              </div>
            </div>

            <div class="grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-4 lg:w-auto">
              <a href="./vault.html" class="btn btn-primary">Add recipes</a>
              <a href="./pantry.html" class="btn btn-secondary">Update pantry</a>
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
            <div class="mt-2 stat-subtext">Recipes you can likely cook now</div>
          </div>

          <div class="card stat-card rounded-[2rem] p-5">
            <div class="stat-label">Planner</div>
            <div class="mt-2 stat-value">${plannedMealsCount}</div>
            <div class="mt-2 stat-subtext">Actual cooking plans this week</div>
          </div>
        </div>

        <div class="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div class="card rounded-[2rem] p-5">
            <div class="flex items-center justify-between gap-4">
              <div>
                <h2 class="text-xl font-semibold">Start here</h2>
                <p class="mt-1 text-sm text-zinc-400">A simple path so the app feels obvious from the first visit.</p>
              </div>
              <button id="changeNameBtn" class="btn btn-secondary text-sm">Change name</button>
            </div>

            <div class="mt-4 space-y-3">
              ${renderStepCard(1, "Build your recipe vault", "Save 3 to 5 recipes you actually cook or want to try.", "./vault.html", "Open vault", nextStep.key === "vault")}
              ${renderStepCard(2, "Add pantry basics", "Enter what you already have so CookFlow can find pantry-ready meals.", "./pantry.html", "Open pantry", nextStep.key === "pantry")}
              ${renderStepCard(3, "Plan your week", "Choose lunches and dinners, including carry-forward meals.", "./planner.html", "Open planner", nextStep.key === "planner")}
              ${renderStepCard(4, "Generate shopping list", "See only what is missing from your planned meals.", "./shopping.html", "Open shopping", nextStep.key === "shopping")}
            </div>
          </div>

          <div class="card rounded-[2rem] p-5">
            <h2 class="text-xl font-semibold">Recommended next move</h2>
            <div class="mt-4 rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
              <div class="text-sm font-semibold text-cyan-300">${escapeHtml(nextStep.title)}</div>
              <p class="mt-2 text-sm leading-6 text-zinc-400">${escapeHtml(nextStep.description)}</p>
              <a href="${nextStep.href}" class="btn btn-primary mt-4">${escapeHtml(nextStep.cta)}</a>
            </div>

            <div class="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <div class="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
                <div class="text-xs uppercase tracking-wider text-zinc-500">Recipes</div>
                <div class="mt-2 text-2xl font-semibold">${savedRecipesCount}</div>
              </div>
              <div class="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
                <div class="text-xs uppercase tracking-wider text-zinc-500">Pantry items</div>
                <div class="mt-2 text-2xl font-semibold">${state.pantry.length}</div>
              </div>
              <div class="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
                <div class="text-xs uppercase tracking-wider text-zinc-500">Planned cooks</div>
                <div class="mt-2 text-2xl font-semibold">${plannedMealsCount}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="grid gap-4 lg:grid-cols-3">
          <a href="./vault.html" class="card feature-card rounded-[2rem] p-5">
            <div class="feature-icon">📚</div>
            <h2 class="mt-3 text-xl font-semibold">Recipe vault</h2>
            <p class="mt-2 text-zinc-400">Save recipes from YouTube, blogs, or pasted text and keep them organized.</p>
          </a>

          <a href="./planner.html" class="card feature-card rounded-[2rem] p-5">
            <div class="feature-icon">🗓️</div>
            <h2 class="mt-3 text-xl font-semibold">Weekly planner</h2>
            <p class="mt-2 text-zinc-400">Plan lunch and dinner with a flow designed for single-person meal reuse.</p>
          </a>

          <a href="./shopping.html" class="card feature-card rounded-[2rem] p-5">
            <div class="feature-icon">🛒</div>
            <h2 class="mt-3 text-xl font-semibold">Shopping list</h2>
            <p class="mt-2 text-zinc-400">Generate a cleaner grocery list from your planned meals and pantry gaps.</p>
          </a>
        </div>

        <div class="card rounded-[2rem] p-5">
          <div class="flex items-center justify-between gap-4">
            <div>
              <h2 class="text-xl font-semibold">Recent recipes</h2>
              <p class="mt-1 text-sm text-zinc-400">Jump back into the latest items in your vault.</p>
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
                        <div class="shrink-0 text-3xl">${recipeEmoji(recipe)}</div>
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
                <div class="mt-4 rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                  <div class="text-lg font-semibold">No recipes saved yet</div>
                  <p class="mt-2 text-sm text-zinc-400">
                    Start by adding a few recipes to your vault. That unlocks planning, pantry matching, and shopping generation.
                  </p>
                  <a href="./vault.html" class="btn btn-primary mt-4">Add your first recipe</a>
                </div>
              `
          }
        </div>
      </section>
    `
  });
}

function bindDashboard(currentName) {
  const changeNameBtn = document.getElementById("changeNameBtn");

  changeNameBtn?.addEventListener("click", () => {
    const next = window.prompt("Enter your name", currentName)?.trim();
    if (!next) return;

    localStorage.setItem(FALLBACK_NAME_KEY, next);
    saveSettings({ user_name: next });
    state.settings = getSettings();

    renderDashboard(next);
    bindDashboard(next);
    toast?.("Name updated.", "success");
  });
}

function renderStepCard(stepNumber, title, description, href, cta, isHighlighted) {
  return `
    <div class="rounded-[1.5rem] border ${isHighlighted ? "border-cyan-400/30 bg-cyan-400/5" : "border-white/10 bg-white/5"} p-4">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div class="min-w-0">
          <div class="text-xs uppercase tracking-wider ${isHighlighted ? "text-cyan-300" : "text-zinc-500"}">
            Step ${stepNumber}
          </div>
          <div class="mt-1 text-lg font-semibold">${escapeHtml(title)}</div>
          <p class="mt-2 text-sm leading-6 text-zinc-400">${escapeHtml(description)}</p>
        </div>
        <a href="${href}" class="btn ${isHighlighted ? "btn-primary" : "btn-secondary"} shrink-0">
          ${escapeHtml(cta)}
        </a>
      </div>
    </div>
  `;
}

function getRecommendedNextStep(summary) {
  if (summary.recipes === 0) {
    return {
      key: "vault",
      title: "Start by adding recipes",
      description: "Your recipe vault is empty, so the best first move is saving a few recipes you can plan with later.",
      href: "./vault.html",
      cta: "Add recipes"
    };
  }

  if (summary.pantry === 0) {
    return {
      key: "pantry",
      title: "Add pantry ingredients",
      description: "Once your pantry is filled, CookFlow can highlight what you can cook already and what is missing.",
      href: "./pantry.html",
      cta: "Fill pantry"
    };
  }

  if (summary.planned === 0) {
    return {
      key: "planner",
      title: "Create this week’s plan",
      description: "You already have recipes and pantry items, so the next useful step is building your weekly meal plan.",
      href: "./planner.html",
      cta: "Plan meals"
    };
  }

  return {
    key: "shopping",
    title: "Generate your shopping list",
    description: "Your setup is ready, so now you can turn your meal plan into a practical grocery list.",
    href: "./shopping.html",
    cta: "Open shopping"
  };
}

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
