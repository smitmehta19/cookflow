import { mountLayout } from "./app.js";
import { getRecipeById, updateRecipeById } from "./storage.js";
import {
  escapeHtml,
  formatQty,
  linesToArray,
  parseNumberish,
  queryParam,
  recipeEmoji,
  toast,
  youtubeEmbedUrl,
  formatNutritionLine,
  confidenceColor,
  groupIngredientsByCategory
} from "./ui.js";

const recipeId = queryParam("id");
let recipe = getRecipeById(recipeId);

mountLayout({
  page: "vault",
  title: "Recipe Detail",
  content: recipe
    ? buildRecipePage(recipe)
    : `
      <section class="mx-auto max-w-3xl">
        <div class="card rounded-[2rem] p-6">
          <h1 class="text-2xl font-semibold">Recipe not found</h1>
          <p class="mt-2 text-zinc-400">Go back to the Vault page and pick a saved recipe.</p>
          <a href="./vault.html" class="btn btn-primary mt-4 inline-block">Back to vault</a>
        </div>
      </section>
    `
});

if (recipe) {
  bindRecipePage();
}

function buildRecipePage(r) {
  const videoUrl = youtubeEmbedUrl(r.source_url);
  const nutritionLine = formatNutritionLine(r.nutrition_per_serving || {});
  const confidence = r.confidence || null;

  const notesHtml = r.notes?.length
    ? r.notes.map((n) => `
        <div class="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-200">
          ${escapeHtml(n)}
        </div>
      `).join("")
    : `
      <div class="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-400">
        No notes saved.
      </div>
    `;

  const componentsHtml = r.components?.length
    ? r.components.map((comp) => `
        <div class="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 class="text-lg font-semibold">${escapeHtml(comp.name)}</h3>
              <p class="mt-1 text-sm text-zinc-400">${escapeHtml(comp.description || comp.type || "Extra component")}</p>
            </div>
            <span class="pill">${escapeHtml(comp.type || "component")}</span>
          </div>

          ${(comp.ingredients || []).length ? `
            <div class="mt-4">
              ${renderGroupedIngredientHtml(comp.ingredients, 1)}
            </div>
          ` : ""}

          ${(comp.steps || []).length ? `
            <div class="mt-4">
              <div class="mb-2 text-sm font-medium text-zinc-300">Steps</div>
              <div class="space-y-2">
                ${(comp.steps || []).map((step, i) => `
                  <div class="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div class="text-xs text-emerald-300">Step ${i + 1}</div>
                    <p class="mt-2 text-zinc-200">${escapeHtml(step)}</p>
                  </div>
                `).join("")}
              </div>
            </div>
          ` : ""}

          ${(comp.notes || []).length ? `
            <div class="mt-4">
              <div class="mb-2 text-sm font-medium text-zinc-300">Notes</div>
              <div class="space-y-2">
                ${(comp.notes || []).map((n) => `
                  <div class="rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-zinc-300">${escapeHtml(n)}</div>
                `).join("")}
              </div>
            </div>
          ` : ""}
        </div>
      `).join("")
    : `
      <div class="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-400">
        No extra components saved.
      </div>
    `;

  return `
    <section class="mx-auto max-w-6xl space-y-4">
      <div class="card rounded-[2rem] p-6">
        <div class="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div class="flex items-start gap-4">
            <div class="text-5xl">${recipeEmoji(r)}</div>
            <div class="min-w-0">
              <h1 class="text-3xl font-semibold">${escapeHtml(r.name)}</h1>
              <p class="mt-2 text-zinc-400">${escapeHtml(r.description || "No description")}</p>

              <div class="mt-4 flex flex-wrap gap-2">
                ${r.cuisine ? `<span class="pill">${escapeHtml(r.cuisine)}</span>` : ""}
                <span class="pill">Prep ${escapeHtml(r.prep_time || "n/a")}</span>
                <span class="pill">Cook ${escapeHtml(r.cook_time || "n/a")}</span>
                <span class="pill">Total ${escapeHtml(r.total_time || "n/a")}</span>
                <span class="pill">${escapeHtml(String(r.difficulty_1_to_5 || 2))}/5 difficulty</span>
                <span class="pill">${escapeHtml(String(r.servings || r.base_servings || 2))} servings</span>
              </div>

              ${nutritionLine ? `<p class="mt-2 text-sm text-zinc-300">Per serving: ${escapeHtml(nutritionLine)}</p>` : ""}
              ${confidence ? `<p class="mt-1 text-xs ${confidenceColor(confidence.overall)}">Confidence: ${escapeHtml(confidence.overall || "medium")}</p>` : ""}

              ${r.confidence?.notes?.length ? `
                <div class="mt-2 flex flex-wrap gap-2">
                  ${r.confidence.notes.map((n) => `<span class="pill text-xs text-amber-300">${escapeHtml(n)}</span>`).join("")}
                </div>
              ` : ""}

              ${r.tags?.length ? `
                <div class="mt-4 flex flex-wrap gap-2">
                  ${r.tags.map((tag) => `<span class="pill">${escapeHtml(tag)}</span>`).join("")}
                </div>
              ` : ""}
            </div>
          </div>

          <div class="flex flex-wrap gap-3">
            ${r.source_url ? `
              <a href="${escapeHtml(r.source_url)}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">
                Open source
              </a>
            ` : ""}
            <button id="toggleEditBtn" class="btn btn-primary">Edit recipe</button>
          </div>
        </div>

        ${r.nutrition_per_serving?.calories ? `
          <div class="mt-6 editor-block p-4">
            <h2 class="text-lg font-semibold">Nutrition per serving</h2>
            <div class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-7">
              ${[
                ["Calories", r.nutrition_per_serving.calories, "kcal"],
                ["Protein", r.nutrition_per_serving.protein_g, "g"],
                ["Carbs", r.nutrition_per_serving.carbs_g, "g"],
                ["Fat", r.nutrition_per_serving.fat_g, "g"],
                ["Fiber", r.nutrition_per_serving.fiber_g, "g"],
                ["Sugar", r.nutrition_per_serving.sugar_g, "g"],
                ["Sodium", r.nutrition_per_serving.sodium_mg, "mg"]
              ].map(([label, val, unit]) => `
                <div class="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                  <div class="text-lg font-semibold">${escapeHtml(String(val || 0))}</div>
                  <div class="text-[11px] text-zinc-500">${escapeHtml(unit)}</div>
                  <div class="text-xs text-zinc-400">${escapeHtml(label)}</div>
                </div>
              `).join("")}
            </div>
          </div>
        ` : ""}

        ${videoUrl ? `
          <div class="mt-6">
            <h2 class="text-xl font-semibold">Video</h2>
            <div class="mt-3 overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/30 p-2">
              <iframe
                class="recipe-video"
                src="${videoUrl}"
                title="Recipe video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen
              ></iframe>
            </div>
          </div>
        ` : ""}

        <div class="mt-6 editor-block p-4">
          <div class="flex items-center justify-between gap-4">
            <div>
              <h2 class="text-lg font-semibold">Servings</h2>
              <p class="text-sm text-zinc-400">Live scale ingredients and grouped sections for easier prep.</p>
            </div>
            <div class="flex items-center gap-2">
              <button id="minusBtn" class="btn btn-secondary px-4 py-2">−</button>
              <div id="servingsValue" class="min-w-16 text-center text-xl font-semibold">${r.base_servings || r.servings || 2}</div>
              <button id="plusBtn" class="btn btn-secondary px-4 py-2">+</button>
            </div>
          </div>
        </div>

        <div class="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div class="space-y-6">
            <div>
              <h2 class="text-xl font-semibold">Ingredients</h2>
              <div id="ingredientList" class="mt-4 space-y-4"></div>
            </div>

            <div>
              <h2 class="text-xl font-semibold">Notes</h2>
              <div class="mt-4 space-y-2">${notesHtml}</div>
            </div>
          </div>

          <div>
            <h2 class="text-xl font-semibold">Steps</h2>
            <div class="mt-4 space-y-2">
              ${(r.steps || []).map((step, i) => `
                <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div class="text-xs text-emerald-300">Step ${i + 1}</div>
                  <p class="mt-2 text-zinc-200">${escapeHtml(step)}</p>
                </div>
              `).join("")}
            </div>
          </div>
        </div>

        <div class="mt-6">
          <h2 class="text-xl font-semibold">Extra components</h2>
          <div class="mt-4 space-y-4">${componentsHtml}</div>
        </div>

        <div class="mt-6 editor-block p-5">
          <div class="flex items-center justify-between gap-4">
            <div>
              <h2 class="text-xl font-semibold">Cook mode</h2>
              <p class="mt-1 text-sm text-zinc-400">One step at a time while cooking.</p>
            </div>
            <button id="startCookModeBtn" class="btn btn-secondary">Start</button>
          </div>

          <div id="cookModePanel" class="mt-4 hidden">
            <div class="rounded-[1.5rem] border border-white/10 bg-black/30 p-5">
              <div class="flex items-center justify-between gap-3">
                <div id="cookStepLabel" class="text-xs text-emerald-300">Step 1 of ${(r.steps || []).length}</div>
                <button id="closeCookModeBtn" class="btn btn-ghost text-xs px-3 py-1">Close</button>
              </div>
              <p id="cookStepText" class="mt-4 text-lg text-zinc-100 leading-relaxed">${escapeHtml(r.steps?.[0] || "No steps added yet.")}</p>
            </div>

            <div class="mt-3 flex items-center justify-between gap-3">
              <button id="prevStepBtn" class="btn btn-secondary px-5 py-3">← Previous</button>
              <div id="cookProgress" class="text-sm text-zinc-400"></div>
              <button id="nextStepBtn" class="btn btn-primary px-5 py-3">Next →</button>
            </div>
          </div>
        </div>

        <div id="editPanel" class="mt-6 hidden">
          <div class="editor-block p-5">
            <div class="flex items-center justify-between gap-4">
              <div>
                <h2 class="text-xl font-semibold">Edit recipe</h2>
                <p class="mt-1 text-sm text-zinc-400">Save corrections back into the vault.</p>
              </div>
              <button id="cancelEditBtn" type="button" class="btn btn-secondary">Close</button>
            </div>

            <form id="editForm" class="mt-5 space-y-4">
              <div class="grid gap-4 md:grid-cols-2">
                <div>
                  <label class="mb-2 block text-xs uppercase tracking-wider text-zinc-400">Name</label>
                  <input id="editName" class="input" value="${escapeHtml(r.name)}" />
                </div>
                <div>
                  <label class="mb-2 block text-xs uppercase tracking-wider text-zinc-400">Cuisine</label>
                  <input id="editCuisine" class="input" value="${escapeHtml(r.cuisine || "")}" />
                </div>
              </div>

              <div>
                <label class="mb-2 block text-xs uppercase tracking-wider text-zinc-400">Description</label>
                <textarea id="editDescription" class="textarea" rows="3">${escapeHtml(r.description || "")}</textarea>
              </div>

              <div class="grid gap-4 md:grid-cols-4">
                <div>
                  <label class="mb-2 block text-xs uppercase tracking-wider text-zinc-400">Prep time</label>
                  <input id="editPrep" class="input" value="${escapeHtml(r.prep_time || "")}" />
                </div>
                <div>
                  <label class="mb-2 block text-xs uppercase tracking-wider text-zinc-400">Cook time</label>
                  <input id="editCook" class="input" value="${escapeHtml(r.cook_time || "")}" />
                </div>
                <div>
                  <label class="mb-2 block text-xs uppercase tracking-wider text-zinc-400">Total time</label>
                  <input id="editTotal" class="input" value="${escapeHtml(r.total_time || "")}" />
                </div>
                <div>
                  <label class="mb-2 block text-xs uppercase tracking-wider text-zinc-400">Difficulty (1-5)</label>
                  <input id="editDifficulty" type="number" min="1" max="5" class="input" value="${escapeHtml(String(r.difficulty_1_to_5 || 2))}" />
                </div>
              </div>

              <div class="grid gap-4 md:grid-cols-3">
                <div>
                  <label class="mb-2 block text-xs uppercase tracking-wider text-zinc-400">Servings</label>
                  <input id="editServings" type="number" min="1" class="input" value="${escapeHtml(String(r.servings || r.base_servings || 2))}" />
                </div>
                <div>
                  <label class="mb-2 block text-xs uppercase tracking-wider text-zinc-400">Base servings</label>
                  <input id="editBaseServings" type="number" min="1" class="input" value="${escapeHtml(String(r.base_servings || r.servings || 2))}" />
                </div>
                <div>
                  <label class="mb-2 block text-xs uppercase tracking-wider text-zinc-400">Source URL</label>
                  <input id="editSourceUrl" class="input" value="${escapeHtml(r.source_url || "")}" />
                </div>
              </div>

              <div>
                <label class="mb-2 block text-xs uppercase tracking-wider text-zinc-400">Tags</label>
                <input id="editTags" class="input" value="${escapeHtml((r.tags || []).join(", "))}" placeholder="veg, indian, quick" />
              </div>

              <div>
                <label class="mb-2 block text-xs uppercase tracking-wider text-zinc-400">Per-serving nutrition</label>
                <textarea id="editNutrition" class="textarea code-hint" rows="4">${escapeHtml(JSON.stringify(r.nutrition_per_serving || {}, null, 2))}</textarea>
              </div>

              <div>
                <label class="mb-2 block text-xs uppercase tracking-wider text-zinc-400">Ingredients</label>
                <textarea id="editIngredients" class="textarea code-hint" rows="8" placeholder="name | qty | unit | grams | notes | category">${escapeHtml(formatIngredientsForEdit(r.ingredients || []))}</textarea>
              </div>

              <div>
                <label class="mb-2 block text-xs uppercase tracking-wider text-zinc-400">Steps</label>
                <textarea id="editSteps" class="textarea" rows="8">${escapeHtml((r.steps || []).join("\n"))}</textarea>
              </div>

              <div>
                <label class="mb-2 block text-xs uppercase tracking-wider text-zinc-400">Notes</label>
                <textarea id="editNotes" class="textarea" rows="5">${escapeHtml((r.notes || []).join("\n"))}</textarea>
              </div>

              <div>
                <label class="mb-2 block text-xs uppercase tracking-wider text-zinc-400">Components JSON</label>
                <textarea id="editComponents" class="textarea code-hint" rows="10">${escapeHtml(JSON.stringify(r.components || [], null, 2))}</textarea>
              </div>

              <div class="flex flex-wrap gap-3 pt-2">
                <button class="btn btn-primary" type="submit">Save changes</button>
                <button id="cancelEditBtn2" class="btn btn-secondary" type="button">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  `;
}

function bindRecipePage() {
  let servings = recipe.base_servings || recipe.servings || 2;
  let cookIndex = 0;

  const servingsValue = document.getElementById("servingsValue");
  const ingredientList = document.getElementById("ingredientList");
  const minusBtn = document.getElementById("minusBtn");
  const plusBtn = document.getElementById("plusBtn");
  const toggleEditBtn = document.getElementById("toggleEditBtn");
  const editPanel = document.getElementById("editPanel");
  const cancelEditBtn = document.getElementById("cancelEditBtn");
  const cancelEditBtn2 = document.getElementById("cancelEditBtn2");
  const editForm = document.getElementById("editForm");

  const startCookModeBtn = document.getElementById("startCookModeBtn");
  const closeCookModeBtn = document.getElementById("closeCookModeBtn");
  const cookModePanel = document.getElementById("cookModePanel");
  const cookStepLabel = document.getElementById("cookStepLabel");
  const cookStepText = document.getElementById("cookStepText");
  const cookProgress = document.getElementById("cookProgress");
  const prevStepBtn = document.getElementById("prevStepBtn");
  const nextStepBtn = document.getElementById("nextStepBtn");

  function renderIngredients() {
    const base = recipe.base_servings || recipe.servings || 2;
    const ratio = servings / base;
    servingsValue.textContent = servings;
    ingredientList.innerHTML = renderGroupedIngredientHtml(recipe.ingredients || [], ratio);
  }

  function renderCookStep() {
    const steps = recipe.steps || [];

    if (!steps.length) {
      cookStepLabel.textContent = "No steps";
      cookStepText.textContent = "This recipe has no steps yet.";
      cookProgress.textContent = "";
      if (prevStepBtn) prevStepBtn.disabled = true;
      if (nextStepBtn) nextStepBtn.disabled = true;
      return;
    }

    cookIndex = Math.max(0, Math.min(steps.length - 1, cookIndex));
    cookStepLabel.textContent = `Step ${cookIndex + 1} of ${steps.length}`;
    cookStepText.textContent = steps[cookIndex];
    cookProgress.textContent = `${cookIndex + 1} / ${steps.length}`;

    if (prevStepBtn) prevStepBtn.disabled = cookIndex === 0;
    if (nextStepBtn) nextStepBtn.disabled = cookIndex === steps.length - 1;
  }

  minusBtn?.addEventListener("click", () => {
    servings = Math.max(1, servings - 1);
    renderIngredients();
  });

  plusBtn?.addEventListener("click", () => {
    servings += 1;
    renderIngredients();
  });

  startCookModeBtn?.addEventListener("click", () => {
    cookIndex = 0;
    cookModePanel.classList.remove("hidden");
    renderCookStep();
    cookModePanel.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  closeCookModeBtn?.addEventListener("click", () => {
    cookModePanel.classList.add("hidden");
  });

  prevStepBtn?.addEventListener("click", () => {
    cookIndex = Math.max(0, cookIndex - 1);
    renderCookStep();
  });

  nextStepBtn?.addEventListener("click", () => {
    cookIndex = Math.min((recipe.steps || []).length - 1, cookIndex + 1);
    renderCookStep();
  });

  function openEdit() {
    editPanel.classList.remove("hidden");
    editPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function closeEdit() {
    editPanel.classList.add("hidden");
  }

  toggleEditBtn?.addEventListener("click", openEdit);
  cancelEditBtn?.addEventListener("click", closeEdit);
  cancelEditBtn2?.addEventListener("click", closeEdit);

  editForm?.addEventListener("submit", (e) => {
    e.preventDefault();

    try {
      const updated = collectEditedRecipe(recipe.id);
      const saved = updateRecipeById(recipe.id, updated);
      recipe = saved || getRecipeById(recipe.id);
      toast("Recipe saved.", "success");
      window.location.reload();
    } catch (error) {
      toast(error.message || "Could not save recipe.", "error");
    }
  });

  renderIngredients();
}

function renderGroupedIngredientHtml(ingredients, ratio) {
  const scaled = (ingredients || []).map((item) => ({
    ...item,
    scaled_quantity: Number(item.base_quantity || 0) * ratio,
    scaled_g: item.quantity_g ? Number(item.quantity_g) * ratio : null
  }));

  const groups = groupIngredientsByCategory(scaled);

  if (!groups.length) {
    return `
      <div class="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-400">
        No ingredients saved.
      </div>
    `;
  }

  return groups.map((group) => `
    <div>
      <div class="mb-2 flex items-center justify-between gap-3">
        <h3 class="text-sm font-semibold text-zinc-200">${escapeHtml(group.label)}</h3>
        <span class="text-xs text-zinc-500">${group.items.length} item${group.items.length === 1 ? "" : "s"}</span>
      </div>

      <div class="space-y-2">
        ${group.items.map((item) => `
          <div class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <div class="font-medium">${escapeHtml(item.name)}</div>
              ${item.notes ? `<div class="mt-1 text-xs text-zinc-500">${escapeHtml(item.notes)}</div>` : ""}
              ${item.optional ? `<div class="mt-1 text-xs text-zinc-600">Optional</div>` : ""}
            </div>

            <div class="text-right text-sm text-zinc-300">
              <div>${escapeHtml(formatQty(item.scaled_quantity))} ${escapeHtml(item.unit || "")}</div>
              ${item.scaled_g ? `<div class="text-xs text-zinc-500">~ ${escapeHtml(formatQty(item.scaled_g))} g</div>` : ""}
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `).join("");
}

function collectEditedRecipe(id) {
  const name = document.getElementById("editName").value.trim();
  const cuisine = document.getElementById("editCuisine").value.trim();
  const description = document.getElementById("editDescription").value.trim();
  const prep_time = document.getElementById("editPrep").value.trim();
  const cook_time = document.getElementById("editCook").value.trim();
  const total_time = document.getElementById("editTotal").value.trim();
  const difficulty_1_to_5 = clamp(Number(document.getElementById("editDifficulty").value || 2), 1, 5);
  const servings = Math.max(1, parseInt(document.getElementById("editServings").value || "2", 10));
  const base_servings = Math.max(1, parseInt(document.getElementById("editBaseServings").value || "2", 10));
  const source_url = document.getElementById("editSourceUrl").value.trim();

  const tags = document.getElementById("editTags").value
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  const ingredients = parseIngredientsFromEdit(document.getElementById("editIngredients").value);
  const steps = linesToArray(document.getElementById("editSteps").value);
  const notes = linesToArray(document.getElementById("editNotes").value);
  const components = parseComponentsJson(document.getElementById("editComponents").value);
  const nutrition_per_serving = parseNutritionJson(document.getElementById("editNutrition").value);

  return {
    id,
    name: name || "Untitled Recipe",
    cuisine,
    description,
    prep_time,
    cook_time,
    total_time,
    difficulty_1_to_5,
    servings,
    base_servings,
    source_url,
    tags,
    ingredients,
    steps,
    notes,
    components,
    nutrition_per_serving
  };
}

function formatIngredientsForEdit(ingredients) {
  return (ingredients || [])
    .map((item) => [
      item.name || "",
      item.base_quantity ?? "",
      item.unit || "",
      item.quantity_g ?? "",
      item.notes || "",
      item.category || ""
    ].join(" | "))
    .join("\n");
}

function parseIngredientsFromEdit(text) {
  return linesToArray(text)
    .map((line) => {
      const [
        name = "",
        qty = "",
        unit = "",
        grams = "",
        notes = "",
        category = ""
      ] = line.split("|").map((p) => p.trim());

      return {
        name: name || "Ingredient",
        normalized_name: (name || "").toLowerCase(),
        base_quantity: parseNumberish(qty),
        unit: unit || "",
        quantity_g: grams ? parseNumberish(grams) : null,
        notes: notes || "",
        category: category || "",
        optional: false
      };
    })
    .filter((item) => item.name);
}

function parseComponentsJson(text) {
  const raw = String(text || "").trim();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error("Components JSON must be an array.");
    }
    return parsed;
  } catch {
    throw new Error("Components JSON is invalid. Check formatting.");
  }
}

function parseNutritionJson(text) {
  const raw = String(text || "").trim();
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    throw new Error("Nutrition JSON is invalid. Check formatting.");
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
