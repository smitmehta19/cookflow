import { mountLayout } from "./app.js";
import {
  getPantry,
  addPantryItem,
  updatePantryItem,
  deletePantryItem
} from "./storage.js";

let pantryItems = getPantry();
let editingId = null;

renderPage();
bindPage();

function renderPage() {
  pantryItems = getPantry();

  const stats = getStats(pantryItems);
  const categories = getUniqueCategories(pantryItems);

  mountLayout({
    page: "pantry",
    title: "Pantry - CookFlow",
    content: `
      <section class="mx-auto max-w-7xl space-y-4">
        <div class="card hero-card rounded-[2rem] p-6">
          <div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div class="min-w-0">
              <p class="text-sm text-emerald-300">Track what you already have</p>
              <h1 class="mt-1 text-3xl font-semibold sm:text-4xl">Pantry inventory</h1>
              <p class="mt-3 max-w-2xl text-zinc-400">
                Add ingredients you already have at home so CookFlow can surface pantry-ready meals and reduce repeat shopping.
              </p>

              <div class="mt-4 flex flex-wrap gap-2">
                <span class="pill">Pantry matching</span>
                <span class="pill">Expiry tracking</span>
                <span class="pill">Quick search</span>
                <span class="pill">Smart shopping prep</span>
              </div>
            </div>

            <div class="grid w-full gap-3 sm:grid-cols-3 lg:w-auto">
              <button id="openAddItemBtn" class="btn btn-primary">Add item</button>
              <button id="clearExpiredBtn" class="btn btn-secondary">Clear expired</button>
              <button id="clearPantryBtn" class="btn btn-secondary">Reset pantry</button>
            </div>
          </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div class="card stat-card rounded-[2rem] p-5">
            <div class="stat-label">Items</div>
            <div class="mt-2 stat-value">${stats.total}</div>
            <div class="mt-2 stat-subtext">Tracked pantry entries</div>
          </div>

          <div class="card stat-card rounded-[2rem] p-5">
            <div class="stat-label">In stock</div>
            <div class="mt-2 stat-value">${stats.inStock}</div>
            <div class="mt-2 stat-subtext">Currently available</div>
          </div>

          <div class="card stat-card rounded-[2rem] p-5">
            <div class="stat-label">Categories</div>
            <div class="mt-2 stat-value">${stats.categories}</div>
            <div class="mt-2 stat-subtext">Ingredient groups</div>
          </div>

          <div class="card stat-card rounded-[2rem] p-5">
            <div class="stat-label">Expiring</div>
            <div class="mt-2 stat-value">${stats.expiringSoon}</div>
            <div class="mt-2 stat-subtext">Next 3 days</div>
          </div>
        </div>

        <div class="card rounded-[2rem] p-5">
          <div class="grid gap-3 lg:grid-cols-[1fr_220px_180px]">
            <input
              id="pantrySearchInput"
              class="input"
              placeholder="Search by ingredient name..."
            />

            <select id="pantryCategoryFilter" class="select">
              <option value="">All categories</option>
              ${categories.map((cat) => `<option value="${escapeHtml(cat)}">${escapeHtml(toTitle(cat))}</option>`).join("")}
            </select>

            <select id="pantryStockFilter" class="select">
              <option value="all">All stock states</option>
              <option value="in">In stock only</option>
              <option value="out">Out of stock only</option>
            </select>
          </div>
        </div>

        <div class="card rounded-[2rem] p-5">
          <div class="flex items-center justify-between gap-4">
            <div>
              <h2 class="text-xl font-semibold">Your pantry</h2>
              <p class="mt-1 text-sm text-zinc-400">Click edit on any item to update quantity, category, or expiry.</p>
            </div>
          </div>

          <div id="pantryList" class="mt-4">
            ${renderPantryList(pantryItems)}
          </div>
        </div>

        <div id="pantryModal" class="modal-backdrop hidden">
          <div class="modal-panel">
            <div class="modal-header">
              <div>
                <h2 id="pantryModalTitle" class="modal-title">Add pantry item</h2>
                <p class="modal-subtitle">Keep your kitchen inventory current.</p>
              </div>
              <button id="closePantryModalBtn" class="icon-btn" aria-label="Close">✕</button>
            </div>

            <form id="pantryForm" class="settings-form">
              <div>
                <label class="mb-2 block text-xs uppercase tracking-wider text-zinc-400">Name</label>
                <input id="pantryName" class="input" placeholder="Eggs" required />
              </div>

              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="mb-2 block text-xs uppercase tracking-wider text-zinc-400">Quantity</label>
                  <input id="pantryQuantity" type="number" min="0" step="0.01" class="input" placeholder="12" />
                </div>

                <div>
                  <label class="mb-2 block text-xs uppercase tracking-wider text-zinc-400">Unit</label>
                  <input id="pantryUnit" class="input" placeholder="pcs, g, kg, ml" />
                </div>
              </div>

              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="mb-2 block text-xs uppercase tracking-wider text-zinc-400">Category</label>
                  <select id="pantryCategory" class="select">
                    <option value="produce">Produce</option>
                    <option value="protein">Protein</option>
                    <option value="dairy">Dairy</option>
                    <option value="grains">Grains</option>
                    <option value="spices">Spices</option>
                    <option value="sauces">Sauces</option>
                    <option value="pantry">Pantry staples</option>
                    <option value="frozen">Frozen</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label class="mb-2 block text-xs uppercase tracking-wider text-zinc-400">Expiry date</label>
                  <input id="pantryExpiry" type="date" class="input" />
                </div>
              </div>

              <div class="flex items-center gap-3 rounded-[1rem] border border-white/10 bg-white/5 p-3">
                <input id="pantryInStock" type="checkbox" checked />
                <label for="pantryInStock" class="text-sm text-zinc-300">Item currently in stock</label>
              </div>

              <div class="modal-actions">
                <button type="button" id="deletePantryItemBtn" class="btn btn-danger hidden">Delete</button>
                <button type="button" id="cancelPantryBtn" class="btn btn-secondary">Cancel</button>
                <button type="submit" class="btn btn-primary">Save item</button>
              </div>
            </form>
          </div>
        </div>
      </section>
    `
  });
}

function bindPage() {
  bindStaticActions();
  bindFilters();
  bindListActions();
  bindModal();
}

function bindStaticActions() {
  document.getElementById("openAddItemBtn")?.addEventListener("click", () => {
    openModalForCreate();
  });

  document.getElementById("clearExpiredBtn")?.addEventListener("click", () => {
    const today = startOfToday();
    const expired = getPantry().filter((item) => item.expires_on && item.expires_on < today);

    if (!expired.length) {
      showToast("No expired items found.");
      return;
    }

    const confirmed = window.confirm(`Delete ${expired.length} expired pantry item(s)?`);
    if (!confirmed) return;

    expired.forEach((item) => deletePantryItem(item.id));
    refreshPage("Expired items removed.");
  });

  document.getElementById("clearPantryBtn")?.addEventListener("click", () => {
    const items = getPantry();
    if (!items.length) {
      showToast("Pantry is already empty.");
      return;
    }

    const confirmed = window.confirm("Delete all pantry items?");
    if (!confirmed) return;

    items.forEach((item) => deletePantryItem(item.id));
    refreshPage("Pantry reset.");
  });
}

function bindFilters() {
  const searchInput = document.getElementById("pantrySearchInput");
  const categoryFilter = document.getElementById("pantryCategoryFilter");
  const stockFilter = document.getElementById("pantryStockFilter");

  const rerenderFiltered = () => {
    const searchValue = String(searchInput?.value || "").trim().toLowerCase();
    const categoryValue = String(categoryFilter?.value || "").trim().toLowerCase();
    const stockValue = String(stockFilter?.value || "all").trim();

    const filtered = getPantry().filter((item) => {
      const matchesSearch =
        !searchValue ||
        String(item.name || "").toLowerCase().includes(searchValue);

      const matchesCategory =
        !categoryValue ||
        String(item.category || "").toLowerCase() === categoryValue;

      const matchesStock =
        stockValue === "all" ||
        (stockValue === "in" && item.in_stock) ||
        (stockValue === "out" && !item.in_stock);

      return matchesSearch && matchesCategory && matchesStock;
    });

    const list = document.getElementById("pantryList");
    if (list) {
      list.innerHTML = renderPantryList(filtered);
      bindListActions();
    }
  };

  searchInput?.addEventListener("input", rerenderFiltered);
  categoryFilter?.addEventListener("change", rerenderFiltered);
  stockFilter?.addEventListener("change", rerenderFiltered);
}

function bindListActions() {
  document.querySelectorAll("[data-edit-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-edit-id");
      const item = getPantry().find((entry) => entry.id === id);
      if (!item) return;
      openModalForEdit(item);
    });
  });

  document.querySelectorAll("[data-toggle-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-toggle-id");
      const item = getPantry().find((entry) => entry.id === id);
      if (!item) return;

      updatePantryItem(id, {
        ...item,
        in_stock: !item.in_stock
      });

      refreshPage(item.in_stock ? "Marked out of stock." : "Marked in stock.");
    });
  });
}

function bindModal() {
  const modal = document.getElementById("pantryModal");
  const closeBtn = document.getElementById("closePantryModalBtn");
  const cancelBtn = document.getElementById("cancelPantryBtn");
  const form = document.getElementById("pantryForm");
  const deleteBtn = document.getElementById("deletePantryItemBtn");

  closeBtn?.addEventListener("click", closePantryModal);
  cancelBtn?.addEventListener("click", closePantryModal);

  modal?.addEventListener("click", (e) => {
    if (e.target === modal) {
      closePantryModal();
    }
  });

  form?.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = String(document.getElementById("pantryName")?.value || "").trim();
    const quantity = Number(document.getElementById("pantryQuantity")?.value || 0) || 0;
    const unit = String(document.getElementById("pantryUnit")?.value || "").trim();
    const category = String(document.getElementById("pantryCategory")?.value || "other").trim();
    const expires_on = String(document.getElementById("pantryExpiry")?.value || "").trim();
    const in_stock = Boolean(document.getElementById("pantryInStock")?.checked);

    if (!name) {
      showToast("Item name is required.");
      return;
    }

    const payload = {
      name,
      normalized_name: name.toLowerCase(),
      quantity,
      unit,
      category,
      expires_on,
      in_stock
    };

    if (editingId) {
      updatePantryItem(editingId, payload);
      refreshPage("Pantry item updated.");
    } else {
      addPantryItem(payload);
      refreshPage("Pantry item added.");
    }

    closePantryModal();
  });

  deleteBtn?.addEventListener("click", () => {
    if (!editingId) return;

    const confirmed = window.confirm("Delete this pantry item?");
    if (!confirmed) return;

    deletePantryItem(editingId);
    closePantryModal();
    refreshPage("Pantry item deleted.");
  });
}

function openModalForCreate() {
  editingId = null;

  setValue("pantryModalTitle", "Add pantry item", true);
  setValue("pantryName", "");
  setValue("pantryQuantity", "");
  setValue("pantryUnit", "");
  setValue("pantryCategory", "produce");
  setValue("pantryExpiry", "");
  const inStock = document.getElementById("pantryInStock");
  if (inStock) inStock.checked = true;

  document.getElementById("deletePantryItemBtn")?.classList.add("hidden");
  document.getElementById("pantryModal")?.classList.remove("hidden");
  document.body.classList.add("modal-open");
}

function openModalForEdit(item) {
  editingId = item.id;

  setValue("pantryModalTitle", "Edit pantry item", true);
  setValue("pantryName", item.name || "");
  setValue("pantryQuantity", item.quantity ?? "");
  setValue("pantryUnit", item.unit || "");
  setValue("pantryCategory", item.category || "other");
  setValue("pantryExpiry", item.expires_on || "");
  const inStock = document.getElementById("pantryInStock");
  if (inStock) inStock.checked = Boolean(item.in_stock);

  document.getElementById("deletePantryItemBtn")?.classList.remove("hidden");
  document.getElementById("pantryModal")?.classList.remove("hidden");
  document.body.classList.add("modal-open");
}

function closePantryModal() {
  editingId = null;
  document.getElementById("pantryModal")?.classList.add("hidden");
  document.body.classList.remove("modal-open");
}

function refreshPage(message = "") {
  renderPage();
  bindPage();
  if (message) showToast(message);
}

function renderPantryList(items) {
  if (!items.length) {
    return `
      <div class="rounded-[1.5rem] border border-white/10 bg-white/5 p-8 text-center">
        <div class="text-5xl">🧺</div>
        <h3 class="mt-4 text-xl font-semibold">No pantry items yet</h3>
        <p class="mt-2 text-sm text-zinc-400">
          Start by adding ingredients you already have at home.
        </p>
        <button id="emptyStateAddBtn" class="btn btn-primary mt-5">Add first item</button>
      </div>
    `;
  }

  const grouped = groupByCategory(items);

  return `
    <div class="space-y-5">
      ${grouped.map((group) => `
        <div>
          <div class="mb-3 flex items-center justify-between gap-4">
            <h3 class="text-lg font-semibold">${escapeHtml(toTitle(group.category))}</h3>
            <span class="pill">${group.items.length} item${group.items.length === 1 ? "" : "s"}</span>
          </div>

          <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            ${group.items.map((item) => {
              const statusText = item.in_stock ? "In stock" : "Out of stock";
              const statusClass = item.in_stock ? "text-emerald-300" : "text-red-300";
              const expiryText = item.expires_on ? formatExpiry(item.expires_on) : "No expiry set";

              return `
                <div class="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <div class="truncate text-base font-semibold">${escapeHtml(item.name || "Unnamed item")}</div>
                      <div class="mt-2 text-sm text-zinc-300">${escapeHtml(formatQuantity(item.quantity, item.unit))}</div>
                      <div class="mt-1 text-xs ${statusClass}">${statusText}</div>
                      <div class="mt-1 text-xs text-zinc-500">${escapeHtml(expiryText)}</div>
                    </div>

                    <div class="flex shrink-0 flex-col gap-2">
                      <button class="btn btn-secondary text-xs" data-toggle-id="${item.id}">
                        ${item.in_stock ? "Mark out" : "Mark in"}
                      </button>
                      <button class="btn btn-secondary text-xs" data-edit-id="${item.id}">
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

document.addEventListener("click", (e) => {
  const addBtn = e.target.closest("#emptyStateAddBtn");
  if (addBtn) {
    openModalForCreate();
  }
});

function getStats(items) {
  return {
    total: items.length,
    inStock: items.filter((item) => item.in_stock).length,
    categories: getUniqueCategories(items).length,
    expiringSoon: items.filter((item) => isExpiringSoon(item.expires_on)).length
  };
}

function getUniqueCategories(items) {
  return [...new Set(items.map((item) => String(item.category || "other").trim().toLowerCase()).filter(Boolean))].sort();
}

function groupByCategory(items) {
  const map = new Map();

  items.forEach((item) => {
    const key = String(item.category || "other").trim().toLowerCase() || "other";
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  });

  return [...map.entries()]
    .map(([category, groupItems]) => ({
      category,
      items: [...groupItems].sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")))
    }))
    .sort((a, b) => a.category.localeCompare(b.category));
}

function formatQuantity(quantity, unit) {
  const q = Number(quantity || 0);
  if (!q && !unit) return "Quantity not set";
  if (!unit) return trimNumber(q);
  return `${trimNumber(q)} ${unit}`.trim();
}

function trimNumber(value) {
  if (!Number.isFinite(value)) return "0";
  return Number.isInteger(value) ? String(value) : String(value).replace(/\.?0+$/, "");
}

function toTitle(value) {
  return String(value || "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function formatExpiry(dateString) {
  if (!dateString) return "No expiry set";

  const today = startOfToday();

  if (dateString < today) return `Expired on ${dateString}`;
  if (dateString === today) return `Expires today`;
  return `Expires on ${dateString}`;
}

function isExpiringSoon(dateString) {
  if (!dateString) return false;

  const today = new Date();
  const exp = new Date(dateString);
  const diffMs = exp.setHours(0, 0, 0, 0) - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return diffDays >= 0 && diffDays <= 3;
}

function startOfToday() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function setValue(id, value, textOnly = false) {
  const el = document.getElementById(id);
  if (!el) return;
  if (textOnly) {
    el.textContent = value;
  } else {
    el.value = value;
  }
}

function showToast(message) {
  const root = document.getElementById("toastRoot");
  if (!root) return;

  const el = document.createElement("div");
  el.className = "toast rounded-2xl border px-4 py-3 text-sm shadow-lg";
  el.textContent = message;
  root.appendChild(el);

  setTimeout(() => {
    el.remove();
  }, 2200);
}
