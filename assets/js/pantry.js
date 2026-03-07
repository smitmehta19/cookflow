import { mountLayout } from "./app.js";
import { getPantry, addPantryItem, updatePantryItem, deletePantryItem } from "./storage.js";
import { escapeHtml, formatQty, normalizeName, toast, groupByCategory } from "./ui.js";

mountLayout({
  page: "pantry",
  title: "Pantry mode",
  content: `
    <section class="mx-auto max-w-5xl space-y-4">
      <div class="card rounded-[2rem] p-5">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h1 class="text-2xl font-semibold">Pantry mode</h1>
            <p class="mt-1 text-sm text-zinc-400">
              Tell Cookflow what you already have. Recipes can then be marked as cookable without a grocery run.
            </p>
          </div>
          <div class="hidden sm:flex h-14 w-14 items-center justify-center rounded-3xl bg-white/5 text-2xl">
            🧺
          </div>
        </div>

        <form id="pantryForm" class="mt-5 grid gap-3 md:grid-cols-[2fr_1fr_1fr]">
          <div>
            <label class="mb-2 block text-xs uppercase tracking-wider text-zinc-400">Ingredient</label>
            <input id="pantryName" class="input" placeholder="Onion, tomato, paneer, rice..." />
          </div>
          <div>
            <label class="mb-2 block text-xs uppercase tracking-wider text-zinc-400">Quantity</label>
            <input id="pantryQuantity" class="input" placeholder="e.g. 2, 500" />
          </div>
          <div>
            <label class="mb-2 block text-xs uppercase tracking-wider text-zinc-400">Unit</label>
            <input id="pantryUnit" class="input" placeholder="pcs, g, kg, ml, pack" />
          </div>

          <div class="md:col-span-3 grid gap-3 md:grid-cols-[1.6fr_1.4fr_auto]">
            <div>
              <label class="mb-2 block text-xs uppercase tracking-wider text-zinc-400">Category</label>
              <select id="pantryCategory" class="input">
                <option value="">Auto / other</option>
                <option value="vegetable">Vegetable</option>
                <option value="fruit">Fruit</option>
                <option value="protein">Protein</option>
                <option value="dairy">Dairy</option>
                <option value="grain">Grain</option>
                <option value="spice">Spice</option>
                <option value="herb">Herb</option>
                <option value="sauce">Sauce</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label class="mb-2 block text-xs uppercase tracking-wider text-zinc-400">Approx grams</label>
              <input id="pantryGrams" class="input" placeholder="Optional: 500" />
            </div>
            <div class="flex items-end">
              <button id="pantryAddBtn" class="btn btn-primary w-full">Add to pantry</button>
            </div>
          </div>
        </form>
      </div>

      <div class="card rounded-[2rem] p-5">
        <div class="flex items-center justify-between gap-4">
          <h2 class="text-xl font-semibold">Current pantry</h2>
          <span id="pantryCount" class="text-sm text-zinc-400"></span>
        </div>
        <div id="pantryList" class="mt-4 space-y-4"></div>
      </div>
    </section>
  `
});

const pantryForm = document.getElementById("pantryForm");
const pantryName = document.getElementById("pantryName");
const pantryQuantity = document.getElementById("pantryQuantity");
const pantryUnit = document.getElementById("pantryUnit");
const pantryCategory = document.getElementById("pantryCategory");
const pantryGrams = document.getElementById("pantryGrams");
const pantryAddBtn = document.getElementById("pantryAddBtn");
const pantryList = document.getElementById("pantryList");
const pantryCount = document.getElementById("pantryCount");

renderPantry();

pantryForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const name = pantryName.value.trim();
  if (!name) {
    toast("Add an ingredient name first.", "error");
    return;
  }

  const quantity = Number(pantryQuantity.value || 0) || 0;
  const unit = pantryUnit.value.trim();
  const category = pantryCategory.value.trim();
  const grams = pantryGrams.value.trim() ? Number(pantryGrams.value) || null : null;

  addPantryItem({
    name,
    normalized_name: normalizeName(name),
    quantity,
    unit,
    quantity_g: grams,
    category,
    in_stock: true
  });

  pantryForm.reset();
  renderPantry();
  toast("Pantry updated.", "success");
});

pantryList.addEventListener("click", (e) => {
  const toggleBtn = e.target.closest("[data-toggle]");
  const deleteBtn = e.target.closest("[data-delete]");

  if (toggleBtn) {
    const id = toggleBtn.dataset.toggle;
    const item = getPantry().find((p) => p.id === id);
    if (!item) return;
    updatePantryItem(id, { in_stock: !item.in_stock });
    renderPantry();
    return;
  }

  if (deleteBtn) {
    const id = deleteBtn.dataset.delete;
    if (!confirm("Remove this item from pantry?")) return;
    deletePantryItem(id);
    renderPantry();
  }
});

function renderPantry() {
  const items = getPantry();
  pantryCount.textContent = `${items.length} item${items.length === 1 ? "" : "s"}`;

  if (!items.length) {
    pantryList.innerHTML = `
      <div class="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
        <p class="text-zinc-400">Nothing in your pantry yet. Start by adding onions, tomatoes, rice, dal, etc.</p>
      </div>
    `;
    return;
  }

  const byCategory = groupByCategory(items);

  pantryList.innerHTML = Object.entries(byCategory)
    .map(([category, group]) => {
      return `
        <div>
          <div class="mb-2 flex items-center justify-between gap-2">
            <h3 class="text-sm font-semibold text-zinc-200">${escapeHtml(
              category === "other" || !category ? "Other" : category
            )}</h3>
            <span class="text-xs text-zinc-500">${group.length} item${
              group.length === 1 ? "" : "s"
            }</span>
          </div>
          <div class="grid gap-2 sm:grid-cols-2">
            ${group
              .map(
                (item) => `
              <div class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <div class="font-medium ${
                    item.in_stock ? "text-zinc-100" : "text-zinc-500 line-through"
                  }">${escapeHtml(item.name)}</div>
                  ${
                    item.quantity || item.unit || item.quantity_g
                      ? `<div class="text-xs text-zinc-400 mt-0.5">
                          ${item.quantity ? formatQty(item.quantity) : ""} ${escapeHtml(
                          item.unit || ""
                        )}${item.quantity && item.quantity_g ? " • " : ""}${
                          item.quantity_g ? `~ ${formatQty(item.quantity_g)} g` : ""
                        }
                        </div>`
                      : ""
                  }
                </div>
                <div class="flex items-center gap-2">
                  <button
                    data-toggle="${item.id}"
                    class="btn btn-ghost text-xs px-3 py-2 ${
                      item.in_stock ? "text-emerald-300" : "text-zinc-400"
                    }"
                  >
                    ${item.in_stock ? "In pantry" : "Out"}
                  </button>
                  <button
                    data-delete="${item.id}"
                    class="btn btn-danger text-xs px-3 py-2"
                  >
                    ✕
                  </button>
                </div>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      `;
    })
    .join("");
}
