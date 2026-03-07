import { mountLayout } from "./app.js";
import {
  getRecipes,
  getPlanner,
  savePlanner,
  saveShoppingList,
  getPantry
} from "./storage.js";
import {
  escapeHtml,
  recipeEmoji,
  toast,
  buildShoppingItemsFromPlanner,
  describeCarry
} from "./ui.js";

const DAYS = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" }
];

let recipes = getRecipes();
let planner = getPlanner();
let activeSlot = null;

mountLayout({
  page: "planner",
  title: "Weekly Planner",
  content: `
    <section class="mx-auto max-w-7xl space-y-4">
      <div class="card rounded-[2rem] p-5">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 class="text-2xl font-semibold">Weekly planner</h1>
            <p class="mt-1 text-sm text-zinc-400">
              Plan meals for one person, drag recipes into slots, carry leftovers forward, and generate shopping from only planned meals.
            </p>
          </div>

          <div class="flex flex-wrap gap-3">
            <button id="generateShoppingBtn" class="btn btn-primary text-sm">Generate shopping</button>
            <button id="clearPlannerBtn" class="btn btn-secondary text-sm">Clear week</button>
            <button id="refreshPlannerBtn" class="btn btn-secondary text-sm">Refresh recipes</button>
          </div>
        </div>
      </div>

      <div class="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div class="card rounded-[2rem] p-5">
          <div class="flex items-center justify-between gap-4">
            <div>
              <h2 class="text-xl font-semibold">Week view</h2>
              <p class="mt-1 text-sm text-zinc-400">Drag from the recipe picker, or click a slot then click a recipe.</p>
            </div>
            <span id="plannerSummary" class="text-sm text-zinc-500"></span>
          </div>

          <div id="plannerGrid" class="mt-4 grid gap-3"></div>
        </div>

        <div class="card rounded-[2rem] p-5">
          <div class="flex items-center justify-between gap-4">
            <div>
              <h2 class="text-xl font-semibold">Recipe picker</h2>
              <p class="mt-1 text-sm text-zinc-400">Draggable recipes from your vault.</p>
            </div>
            <span id="activeSlotLabel" class="text-sm text-emerald-300">No slot selected</span>
          </div>

          <div class="mt-4">
            <input id="recipeSearchInput" class="input" placeholder="Search recipes..." />
          </div>

          <div id="recipePickerList" class="mt-4 max-h-[640px] space-y-2 overflow-y-auto"></div>
        </div>
      </div>
    </section>
  `
});

const plannerGrid = document.getElementById("plannerGrid");
const recipePickerList = document.getElementById("recipePickerList");
const plannerSummary = document.getElementById("plannerSummary");
const activeSlotLabel = document.getElementById("activeSlotLabel");
const recipeSearchInput = document.getElementById("recipeSearchInput");
const generateShoppingBtn = document.getElementById("generateShoppingBtn");
const clearPlannerBtn = document.getElementById("clearPlannerBtn");
const refreshPlannerBtn = document.getElementById("refreshPlannerBtn");

bindEvents();
renderPlanner();
renderRecipePicker();

function bindEvents() {
  plannerGrid.addEventListener("click", (e) => {
    const slotCard = e.target.closest("[data-slot-id]");
    const clearBtn = e.target.closest("[data-clear-slot]");
    const carryBtn = e.target.closest("[data-carry-slot]");

    if (clearBtn) {
      clearSlot(clearBtn.dataset.clearSlot);
      return;
    }

    if (carryBtn) {
      toggleCarry(carryBtn.dataset.carrySlot);
      return;
    }

    if (slotCard) {
      activeSlot = slotCard.dataset.slotId;
      updateActiveSlotLabel();
      highlightActiveSlot();
    }
  });

  recipePickerList.addEventListener("click", (e) => {
    const pick = e.target.closest("[data-pick-recipe]");
    if (!pick) return;

    if (!activeSlot) {
      toast("Select a slot first, or drag a recipe to a slot.", "error");
      return;
    }

    assignRecipeToSlot(activeSlot, pick.dataset.pickRecipe);
  });

  recipePickerList.addEventListener("dragstart", (e) => {
    const card = e.target.closest("[data-drag-recipe]");
    if (!card) return;

    e.dataTransfer.setData("text/plain", JSON.stringify({
      type: "recipe",
      recipeId: card.dataset.dragRecipe
    }));
    e.dataTransfer.effectAllowed = "copy";
  });

  plannerGrid.addEventListener("dragstart", (e) => {
    const card = e.target.closest("[data-drag-slot]");
    if (!card) return;

    e.dataTransfer.setData("text/plain", JSON.stringify({
      type: "slot",
      slotId: card.dataset.dragSlot
    }));
    e.dataTransfer.effectAllowed = "move";
  });

  plannerGrid.addEventListener("dragover", (e) => {
    const dropTarget = e.target.closest("[data-drop-slot]");
    if (!dropTarget) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  });

  plannerGrid.addEventListener("drop", (e) => {
    const dropTarget = e.target.closest("[data-drop-slot]");
    if (!dropTarget) return;

    e.preventDefault();

    try {
      const raw = e.dataTransfer.getData("text/plain");
      const payload = JSON.parse(raw || "{}");
      const targetSlotId = dropTarget.dataset.dropSlot;

      if (payload.type === "recipe" && payload.recipeId) {
        assignRecipeToSlot(targetSlotId, payload.recipeId);
      }

      if (payload.type === "slot" && payload.slotId) {
        moveSlot(payload.slotId, targetSlotId);
      }
    } catch {
      toast("Could not complete drag and drop.", "error");
    }
  });

  recipeSearchInput.addEventListener("input", renderRecipePicker);

  generateShoppingBtn.addEventListener("click", () => {
    const items = buildShoppingItemsFromPlanner(planner, getRecipes(), getPantry());

    if (!items.length) {
      toast("No planned meals to generate shopping from.", "error");
      return;
    }

    saveShoppingList({
      items,
      updated_at: new Date().toISOString()
    });

    toast("Shopping list generated from planner.", "success");
    window.location.href = "./shopping.html";
  });

  clearPlannerBtn.addEventListener("click", () => {
    if (!confirm("Clear the whole planner?")) return;
    planner = getEmptyPlanner();
    savePlanner(planner);
    activeSlot = null;
    renderPlanner();
    toast("Planner cleared.", "success");
  });

  refreshPlannerBtn.addEventListener("click", () => {
    recipes = getRecipes();
    planner = savePlanner(planner);
    renderPlanner();
    renderRecipePicker();
    toast("Planner refreshed.", "success");
  });
}

function renderPlanner() {
  plannerGrid.innerHTML = DAYS.map((day) => `
    <div class="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
      <div class="mb-3 flex items-center justify-between gap-3">
        <h3 class="text-base font-semibold">${escapeHtml(day.label)}</h3>
        <span class="text-xs text-zinc-500">Lunch + Dinner</span>
      </div>

      <div class="grid gap-3 md:grid-cols-2">
        ${renderSlot(day.key, "lunch")}
        ${renderSlot(day.key, "dinner")}
      </div>
    </div>
  `).join("");

  const filledCount = countFilledSourceSlots();
  plannerSummary.textContent = `${filledCount} cooking plan${filledCount === 1 ? "" : "s"}`;

  updateActiveSlotLabel();
  highlightActiveSlot();
}

function renderSlot(dayKey, meal) {
  const slotId = `${dayKey}-${meal}`;
  const slot = planner.days?.[dayKey]?.[meal];
  const recipe = recipes.find((r) => r.id === slot?.recipe_id);
  const isCarry = Boolean(slot?.carry_over_from);
  const carryTarget = getCarryTarget(slotId);
  const canCarryForward = Boolean(recipe) && !isCarry && Boolean(carryTarget);

  const carryLabel =
    meal === "lunch"
      ? "Carry → dinner"
      : dayKey !== "sunday"
      ? "Carry → next lunch"
      : null;

  return `
    <div
      data-slot-id="${slotId}"
      data-drop-slot="${slotId}"
      ${recipe ? `data-drag-slot="${slotId}" draggable="true"` : ""}
      class="rounded-[1.25rem] border border-white/10 bg-black/20 p-3 transition"
    >
      <div class="flex items-center justify-between gap-2">
        <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">${escapeHtml(meal)}</span>
        <div class="flex items-center gap-2">
          ${recipe && carryLabel ? `
            <button data-carry-slot="${slotId}" class="text-xs text-blue-300">
              ${slot.carry_to ? "Undo carry" : carryLabel}
            </button>
          ` : ""}
          <button data-clear-slot="${slotId}" class="text-xs text-red-300">Clear</button>
        </div>
      </div>

      ${
        !recipe
          ? `
            <div class="mt-3 rounded-xl border border-dashed border-white/10 p-4 text-sm text-zinc-500">
              Drop recipe here
            </div>
          `
          : `
            <div class="mt-3 flex items-start gap-3">
              <div class="text-2xl shrink-0">${recipeEmoji(recipe)}</div>
              <div class="min-w-0 flex-1">
                <div class="truncate text-sm font-semibold ${isCarry ? "text-amber-200" : "text-zinc-100"}">
                  ${escapeHtml(recipe.name)}
                </div>
                <div class="mt-1 text-xs text-zinc-400">
                  ${isCarry ? `Carry-forward from ${escapeHtml(describeCarry(slot.carry_over_from))}` : "1 serving for 1 person"}
                </div>
                ${
                  slot.carry_to && canCarryForward
                    ? `<div class="mt-1 text-xs text-emerald-300">Also cooked for ${escapeHtml(describeCarry(slot.carry_to))}</div>`
                    : ""
                }
              </div>
            </div>
          `
      }
    </div>
  `;
}

function renderRecipePicker() {
  const query = recipeSearchInput.value.trim().toLowerCase();

  const filtered = recipes.filter((recipe) => {
    const haystack = `${recipe.name} ${recipe.cuisine} ${recipe.description || ""} ${(recipe.tags || []).join(" ")}`.toLowerCase();
    return !query || haystack.includes(query);
  });

  if (!filtered.length) {
    recipePickerList.innerHTML = `
      <div class="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 text-sm text-zinc-400">
        ${recipes.length ? "No recipes match your search." : "No recipes in vault yet."}
      </div>
    `;
    return;
  }

  recipePickerList.innerHTML = filtered.map((recipe) => `
    <div
      data-drag-recipe="${recipe.id}"
      data-pick-recipe="${recipe.id}"
      draggable="true"
      class="cursor-pointer rounded-[1.25rem] border border-white/10 bg-white/5 p-3 transition hover:border-emerald-400/30"
    >
      <div class="flex items-start gap-3">
        <div class="text-2xl shrink-0">${recipeEmoji(recipe)}</div>
        <div class="min-w-0 flex-1">
          <div class="truncate text-sm font-semibold">${escapeHtml(recipe.name)}</div>
          <div class="mt-1 text-xs text-zinc-400">${escapeHtml(recipe.cuisine || recipe.description || "Saved recipe")}</div>
          <div class="mt-2 text-[11px] text-zinc-500">Drag to a slot or click after selecting a slot</div>
        </div>
      </div>
    </div>
  `).join("");
}

function assignRecipeToSlot(slotId, recipeId) {
  const recipe = recipes.find((r) => r.id === recipeId);
  if (!recipe) {
    toast("Recipe not found.", "error");
    return;
  }

  clearSlot(slotId, true);

  setSlot(slotId, {
    recipe_id: recipeId,
    servings_needed: 1,
    carry_to: null,
    carry_over_from: null
  });

  planner = savePlanner(planner);
  activeSlot = slotId;
  renderPlanner();
  toast("Recipe added to planner.", "success");
}

function moveSlot(sourceSlotId, targetSlotId) {
  if (sourceSlotId === targetSlotId) return;

  const source = getSlot(sourceSlotId);
  if (!source?.recipe_id) return;

  const sourceRecipeId = source.recipe_id;
  clearSlot(targetSlotId, true);
  clearSlot(sourceSlotId, true);

  setSlot(targetSlotId, {
    recipe_id: sourceRecipeId,
    servings_needed: 1,
    carry_to: null,
    carry_over_from: null
  });

  planner = savePlanner(planner);
  activeSlot = targetSlotId;
  renderPlanner();
  toast("Planner slot moved.", "success");
}

function toggleCarry(sourceSlotId) {
  const source = getSlot(sourceSlotId);
  if (!source?.recipe_id) {
    toast("Add a recipe first.", "error");
    return;
  }

  if (source.carry_over_from) {
    toast("Carry-forward slots cannot create another carry.", "error");
    return;
  }

  const targetSlotId = getCarryTarget(sourceSlotId);
  if (!targetSlotId) {
    toast("No carry-forward target available.", "error");
    return;
  }

  if (source.carry_to === targetSlotId) {
    clearSlot(targetSlotId, true);
    const current = getSlot(sourceSlotId);
    setSlot(sourceSlotId, { ...current, carry_to: null });
    planner = savePlanner(planner);
    renderPlanner();
    toast("Carry-forward removed.", "success");
    return;
  }

  const target = getSlot(targetSlotId);
  if (target?.recipe_id && !target.carry_over_from) {
    const ok = confirm("This will replace the existing recipe in the carry-forward slot. Continue?");
    if (!ok) return;
  }

  clearSlot(targetSlotId, true);

  setSlot(sourceSlotId, {
    ...source,
    carry_to: targetSlotId
  });

  setSlot(targetSlotId, {
    recipe_id: source.recipe_id,
    servings_needed: 1,
    carry_to: null,
    carry_over_from: sourceSlotId
  });

  planner = savePlanner(planner);
  renderPlanner();
  toast("Carry-forward meal added.", "success");
}

function clearSlot(slotId, silent = false) {
  const slot = getSlot(slotId);
  if (!slot) return;

  if (slot.carry_to) {
    const target = getSlot(slot.carry_to);
    if (target?.carry_over_from === slotId) {
      setSlot(slot.carry_to, emptySlot());
    }
  }

  if (slot.carry_over_from) {
    const source = getSlot(slot.carry_over_from);
    if (source?.carry_to === slotId) {
      setSlot(slot.carry_over_from, {
        ...source,
        carry_to: null
      });
    }
  }

  setSlot(slotId, emptySlot());
  planner = savePlanner(planner);

  if (activeSlot === slotId) {
    activeSlot = null;
  }

  if (!silent) {
    renderPlanner();
    toast("Planner slot cleared.", "success");
  }
}

function highlightActiveSlot() {
  document.querySelectorAll("[data-slot-id]").forEach((el) => {
    if (el.dataset.slotId === activeSlot) {
      el.classList.add("border-emerald-400/40");
      el.classList.remove("border-white/10");
    } else {
      el.classList.remove("border-emerald-400/40");
      el.classList.add("border-white/10");
    }
  });
}

function updateActiveSlotLabel() {
  if (!activeSlot) {
    activeSlotLabel.textContent = "No slot selected";
    return;
  }

  const [day, meal] = activeSlot.split("-");
  activeSlotLabel.textContent = `${capitalize(day)} • ${capitalize(meal)}`;
}

function countFilledSourceSlots() {
  let count = 0;

  DAYS.forEach((day) => {
    ["lunch", "dinner"].forEach((meal) => {
      const slot = planner.days?.[day.key]?.[meal];
      if (slot?.recipe_id && !slot.carry_over_from) count += 1;
    });
  });

  return count;
}

function getSlot(slotId) {
  const [day, meal] = String(slotId || "").split("-");
  return planner.days?.[day]?.[meal] || null;
}

function setSlot(slotId, slotData) {
  const [day, meal] = String(slotId || "").split("-");
  if (!planner.days?.[day]) return;
  planner.days[day][meal] = {
    recipe_id: slotData.recipe_id || null,
    servings_needed: Math.max(1, parseInt(slotData.servings_needed || 1, 10) || 1),
    carry_to: slotData.carry_to || null,
    carry_over_from: slotData.carry_over_from || null
  };
}

function emptySlot() {
  return {
    recipe_id: null,
    servings_needed: 1,
    carry_to: null,
    carry_over_from: null
  };
}

function getEmptyPlanner() {
  return {
    week_of: "",
    days: {
      monday: { lunch: emptySlot(), dinner: emptySlot() },
      tuesday: { lunch: emptySlot(), dinner: emptySlot() },
      wednesday: { lunch: emptySlot(), dinner: emptySlot() },
      thursday: { lunch: emptySlot(), dinner: emptySlot() },
      friday: { lunch: emptySlot(), dinner: emptySlot() },
      saturday: { lunch: emptySlot(), dinner: emptySlot() },
      sunday: { lunch: emptySlot(), dinner: emptySlot() }
    }
  };
}

function getCarryTarget(slotId) {
  const [day, meal] = String(slotId || "").split("-");
  const dayIndex = DAYS.findIndex((d) => d.key === day);

  if (meal === "lunch") {
    return `${day}-dinner`;
  }

  if (meal === "dinner" && dayIndex !== -1 && dayIndex < DAYS.length - 1) {
    return `${DAYS[dayIndex + 1].key}-lunch`;
  }

  return null;
}

function capitalize(text = "") {
  return String(text).charAt(0).toUpperCase() + String(text).slice(1);
}
