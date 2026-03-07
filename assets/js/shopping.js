import { mountLayout } from "./app.js";
import {
  getShoppingList,
  saveShoppingList,
  getRecipes,
  getPantry,
  getPlanner
} from "./storage.js";
import {
  escapeHtml,
  formatQty,
  normalizeName,
  groupItemsByCategory,
  buildShoppingItemsFromPlanner,
  mergeShoppingItems,
  toast
} from "./ui.js";

mountLayout({
  page: "shopping",
  title: "Shopping List",
  content: `
    <section class="mx-auto max-w-6xl space-y-4">
      <div class="card rounded-[2rem] p-5">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 class="text-2xl font-semibold">Shopping list</h1>
            <p class="mt-1 text-sm text-zinc-400">
              Generate your list from the planner for one person, then add any extra manual items if needed.
            </p>
          </div>

          <div class="flex flex-wrap gap-3">
            <button id="generateFromPlannerBtn" class="btn btn-primary text-sm">Generate from planner</button>
            <button id="clearCheckedBtn" class="btn btn-secondary text-sm">Clear checked</button>
            <button id="clearAllBtn" class="btn btn-danger text-sm">Clear all</button>
          </div>
        </div>

        <form id="shoppingForm" class="mt-5 grid gap-3 md:grid-cols-[2fr_1fr_1fr_1fr_auto]">
          <div>
            <label class="mb-2 block text-xs uppercase tracking-wider text-zinc-400">Item</label>
            <input id="itemName" class="input" placeholder="Tomatoes, paneer, rice..." />
          </div>

          <div>
            <label class="mb-2 block text-xs uppercase tracking-wider text-zinc-400">Quantity</label>
            <input id="itemQuantity" class="input" placeholder="2 or 500" />
          </div>

          <div>
            <label class="mb-2 block text-xs uppercase tracking-wider text-zinc-400">Unit</label>
            <input id="itemUnit" class="input" placeholder="pcs, g, pack" />
          </div>

          <div>
            <label class="mb-2 block text-xs uppercase tracking-wider text-zinc-400">Category</label>
            <select id="itemCategory" class="select">
              <option value="">Auto / other</option>
              <option value="vegetable">Vegetable</option>
              <option value="spice">Spice</option>
              <option value="protein">Protein</option>
              <option value="dairy">Dairy</option>
              <option value="grain">Grain</option>
              <option value="herb">Herb</option>
              <option value="sauce">Sauce</option>
              <option value="fruit">Fruit</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div class="flex items-end">
            <button class="btn btn-secondary w-full" type="submit">Add</button>
          </div>
        </form>
      </div>

      <div class="card rounded-[2rem] p-5">
        <div class="flex items-center justify-between gap-4">
          <h2 class="text-xl font-semibold">List items</h2>
          <span id="itemCount" class="text-sm text-zinc-500"></span>
        </div>

        <div id="shoppingList" class="mt-4 space-y-4"></div>
      </div>
    </section>
  `
});

const shoppingForm = document.getElementById("shoppingForm");
const itemName = document.getElementById("itemName");
const itemQuantity = document.getElementById("itemQuantity");
const itemUnit = document.getElementById("itemUnit");
const itemCategory = document.getElementById("itemCategory");
const generateFromPlannerBtn = document.getElementById("generateFromPlannerBtn");
const clearCheckedBtn = document.getElementById("clearCheckedBtn");
const clearAllBtn = document.getElementById("clearAllBtn");
const shoppingListEl = document.getElementById("shoppingList");
const itemCount = document.getElementById("itemCount");

renderShopping();

shoppingForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const name = itemName.value.trim();
  if (!name) {
    toast("Add an item name first.", "error");
    return;
  }

  const newItem = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
    name,
    normalized_name: normalizeName(name),
    quantity: Number(itemQuantity.value || 0) || 0,
    unit: itemUnit.value.trim(),
    quantity_g: null,
    category: itemCategory.value.trim(),
    checked: false,
    from_recipe_ids: [],
    from_slot_ids: []
  };

  const state = getShoppingList();
  const merged = mergeShoppingItems(state.items || [], [newItem]);

  saveShoppingList({
    items: merged,
    updated_at: new Date().toISOString()
  });

  shoppingForm.reset();
  renderShopping();
  toast("Item added.", "success");
});

generateFromPlannerBtn.addEventListener("click", () => {
  const items = buildShoppingItemsFromPlanner(getPlanner(), getRecipes(), getPantry());

  if (!items.length) {
    toast("No planned meals found in planner.", "error");
    return;
  }

  saveShoppingList({
    items,
    updated_at: new Date().toISOString()
  });

  renderShopping();
  toast("Shopping list generated from planner.", "success");
});

shoppingListEl.addEventListener("click", (e) => {
  const toggleBtn = e.target.closest("[data-toggle-item]");
  const removeBtn = e.target.closest("[data-remove-item]");

  if (toggleBtn) {
    const id = toggleBtn.dataset.toggleItem;
    const state = getShoppingList();
    const items = (state.items || []).map((item) =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );

    saveShoppingList({ items, updated_at: new Date().toISOString() });
    renderShopping();
    return;
  }

  if (removeBtn) {
    const id = removeBtn.dataset.removeItem;
    const state = getShoppingList();
    const items = (state.items || []).filter((item) => item.id !== id);

    saveShoppingList({ items, updated_at: new Date().toISOString() });
    renderShopping();
    return;
  }
});

clearCheckedBtn.addEventListener("click", () => {
  const state = getShoppingList();
  const items = (state.items || []).filter((item) => !item.checked);

  saveShoppingList({ items, updated_at: new Date().toISOString() });
  renderShopping();
  toast("Checked items removed.", "success");
});

clearAllBtn.addEventListener("click", () => {
  if (!confirm("Clear the entire shopping list?")) return;

  saveShoppingList({
    items: [],
    updated_at: new Date().toISOString()
  });

  renderShopping();
  toast("Shopping list cleared.", "success");
});

function renderShopping() {
  const state = getShoppingList();
  const items = state.items || [];

  itemCount.textContent = `${items.length} item${items.length === 1 ? "" : "s"}`;

  if (!items.length) {
    shoppingListEl.innerHTML = `
      <div class="rounded-[1.5rem] border border-white/10 bg-white/5 p-5 text-sm text-zinc-400">
        No shopping items yet. Generate from the planner or add a few manually.
      </div>
    `;
    return;
  }

  const groups = groupItemsByCategory(items);

  shoppingListEl.innerHTML = groups.map((group) => `
    <div>
      <div class="mb-2 flex items-center justify-between gap-3">
        <h3 class="text-sm font-semibold text-zinc-200">${escapeHtml(group.label)}</h3>
        <span class="text-xs text-zinc-500">${group.items.length} item${group.items.length === 1 ? "" : "s"}</span>
      </div>

      <div class="space-y-2">
        ${group.items.map((item) => `
          <div class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <button
                data-toggle-item="${item.id}"
                class="h-5 w-5 rounded border border-white/20 bg-black/30 flex items-center justify-center text-xs ${item.checked ? "border-emerald-400 bg-emerald-500/80" : ""}"
              >
                ${item.checked ? "✓" : ""}
              </button>

              <div>
                <div class="font-medium ${item.checked ? "text-zinc-500 line-through" : "text-zinc-100"}">
                  ${escapeHtml(item.name)}
                </div>

                <div class="mt-0.5 text-xs text-zinc-400">
                  ${item.quantity ? `${formatQty(item.quantity)} ${escapeHtml(item.unit || "")}` : ""}
                  ${item.quantity && item.quantity_g ? " • " : ""}
                  ${item.quantity_g ? `~ ${formatQty(item.quantity_g)} g` : ""}
                </div>
              </div>
            </div>

            <button data-remove-item="${item.id}" class="btn btn-danger px-3 py-2 text-xs">✕</button>
          </div>
        `).join("")}
      </div>
    </div>
  `).join("");
}
