import { mountLayout } from "./app.js";
import { getPantry, savePantry, addPantryItem, updatePantryItem, deletePantryItem } from "./storage.js";
import { escapeHtml, groupByCategory, formatQty, uid, toast } from "./ui.js";

const pantry = getPantry();
const grouped = groupByCategory(pantry, "category");

mountLayout({
  page: "pantry",
  title: "Pantry - CookFlow",
  content: `
    <section class="mx-auto max-w-7xl space-y-4">
      <div class="card rounded-[2rem] p-6">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 class="text-3xl font-semibold">Pantry inventory</h1>
            <p class="mt-2 text-zinc-400">
              Track what you have in stock. This powers the "pantry-ready" recipe recommendations.
            </p>
          </div>
          <div class="flex flex-wrap gap-3">
            <button id="addPantryBtn" class="btn btn-primary">Add item</button>
            <button id="clearExpiredBtn" class="btn btn-secondary">Clear expired</button>
            <a href="./planner.html" class="btn btn-secondary">Open planner</a>
          </div>
        </div>
      </div>

      <div class="card rounded-[2rem] p-6">
        <div class="flex items-center justify-between gap-4">
          <div>
            <div class="text-2xl font-semibold">${pantry.length}</div>
            <div class="text-sm text-zinc-400">Total items</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-semibold">${grouped.length}</div>
            <div class="text-sm text-zinc-400">Categories</div>
          </div>
          <div class="text-right">
            <div class="text-2xl font-semibold">${pantry.filter(item => item.in_stock).length}</div>
            <div class="text-sm text-emerald-300">In stock</div>
          </div>
        </div>
      </div>

      <div class="card rounded-[2rem] p-6">
        <div class="flex items-center justify-between gap-4 mb-4">
          <h2 class="text-xl font-semibold">Quick search</h2>
          <div class="flex flex-wrap gap-2">
            <input id="pantrySearch" class="input w-64" placeholder="Search pantry..." />
            <select id="categoryFilter" class="select w-48">
              <option value="">All categories</option>
            </select>
          </div>
        </div>

        <div id="pantryList">
          ${renderPantryGrouped(grouped)}
        </div>
      </div>

      <div id="pantryModal" class="modal-backdrop hidden">
        <div class="modal-panel max-w-md">
          <div class="modal-header">
            <h2 class="modal-title" id="modalTitle">Add item</h2>
            <button id="closePantryModal" class="icon-btn">✕</button>
          </div>

          <form id="pantryForm">
            <div class="mb-4">
              <label class="mb-2 block text-xs uppercase tracking-wider text-zinc-400">Name</label>
              <input id="itemName" class="input" required />
            </div>

            <div class="mb-4">
              <label class="mb-2 block text-xs uppercase tracking-wider text-zinc-400">Quantity</label>
              <input id="itemQty" type="number" min="0" step="0.1" class="input" />
            </div>

            <div class="mb-4">
              <label class="mb-2 block text-xs uppercase tracking-wider text-zinc-400">Unit</label>
              <input id="itemUnit" class="input" placeholder="g, kg, pieces..." />
            </div>

            <div class="mb-4">
              <label class="mb-2 block text-xs uppercase tracking-wider text-zinc-400">Category</label>
              <select id="itemCategory" class="select">
                <option value="produce">Produce</option>
                <option value="dairy">Dairy</option>
                <option value="protein">Protein</option>
                <option value="pantry-staples">Pantry staples</option>
                <option value="spices">Spices</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div class="mb-6">
              <label class="mb-2 block text-xs uppercase tracking-wider text-zinc-400">Expires</label>
              <input id="itemExpires" type="date" class="input" />
            </div>

            <div class="flex gap-3">
              <button type="submit" class="btn btn-primary flex-1">Save</button>
              <button type="button" id="deleteItemBtn" class="btn btn-danger flex-1 hidden">Delete</button>
              <button type="button" id="cancelItemBtn" class="btn btn-secondary flex-1">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </section>
  `
});

bindPantryPage();

function renderPantryGrouped(groups) {
  if (!groups.length) {
    return `
      <div class="text-center py-12">
        <div class="text-4xl mb-4">🧺</div>
        <h3 class="text-xl font-semibold mb-2">No pantry items yet</h3>
        <p class="text-zinc-400 mb-4">Add ingredients you have in stock to see pantry-ready recipes.</p>
        <button id="addPantryEmptyBtn" class="btn btn-primary">Add first item</button>
      </div>
    `;
  }

  return groups.map((group) => `
    <div class="mb-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold">${escapeHtml(group.label)}</h3>
        <span class="text-sm text-zinc-400">${group.items.length} items</span>
      </div>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        ${group.items.map((item) => `
          <div class="card rounded-[1.25rem] p-4 hover:bg-white/5">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <div class="font-semibold truncate">${escapeHtml(item.name)}</div>
                <div class="text-sm text-zinc-400">${formatQty(item.quantity)} ${escapeHtml(item.unit || "")}</div>
                ${item.expires_on ? `
                  <div class="mt-1 text-xs ${item.expires_on < new Date().toISOString().split('T')[0] ? 'text-red-300' : 'text-zinc-500'}">
                    Expires ${item.expires_on}
                  </div>
                ` : ''}
              </div>
              <div class="flex items-center gap-2">
                <label class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" ${item.in_stock ? 'checked' : ''} class="sr-only peer" />
                  <div class="w-5 h-5 bg-white/10 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-cyan-500 rounded peer-checked:bg-cyan-500 peer-checked:after:absolute peer-checked:after:-mt-1 peer-checked:after:left-[6px] peer-checked:after:h-3 peer-checked:after:w-3 peer-checked:after:bg-white peer-checked:after:rounded-sm peer-checked:after:border-white after:border after:bg-transparent after:transition-all"></div>
                </label>
                <button class="editBtn" data-id="${item.id}" class="icon-btn text-sm">✏️</button>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `).join("");
}

function bindPantryPage() {
  const addBtn = document.getElementById("addPantryBtn");
  const addEmptyBtn = document.getElementById("addPantryEmptyBtn");
  const clearExpiredBtn = document.getElementById("clearExpiredBtn");
  const searchInput = document.getElementById("pantrySearch");
  const categoryFilter = document.getElementById("categoryFilter");
  const pantryList = document.getElementById("pantryList");
  const modal = document.getElementById("pantryModal");
  const closeModal = document.getElementById("closePantryModal");
  const form = document.getElementById("pantryForm");
  const deleteBtn = document.getElementById("deleteItemBtn");

  let editingId = null;

  // Add item
  const openAdd = () => {
    editingId = null;
    document.getElementById("modalTitle").textContent = "Add item";
    document.getElementById("itemName").value = "";
    document.getElementById("itemQty").value = "";
    document.getElementById("itemUnit").value = "";
    document.getElementById("itemCategory").value = "produce";
    document.getElementById("itemExpires").value = "";
    deleteBtn.classList.add("hidden");
    modal.classList.remove("hidden");
  };

  addBtn?.addEventListener("click", openAdd);
  addEmptyBtn?.addEventListener("click", openAdd);

  // Search and filter
  searchInput?.addEventListener("input", updateList);
  categoryFilter?.addEventListener("change", updateList);

  function updateList() {
    const term = searchInput.value.toLowerCase();
    const cat = categoryFilter.value;

    const filtered = getPantry()
      .filter(item => {
        const matchesSearch = !term || item.name.toLowerCase().includes(term);
        const matchesCat = !cat || item.category === cat;
        return matchesSearch && matchesCat;
      });

    const grouped = groupByCategory(filtered, "category");
    pantryList.innerHTML = renderPantryGrouped(grouped);
    bindListEvents();
  }

  // Edit buttons
  pantryList?.addEventListener("click", (e) => {
    const editBtn = e.target.closest(".editBtn");
    if (editBtn) {
      const id = editBtn.dataset.id;
      editItem(id);
    }
  });

  function bindListEvents() {
    document.querySelectorAll(".editBtn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.dataset.id;
        editItem(id);
      });
    });
  }

  function editItem(id) {
    const item = getPantry().find(i => i.id === id);
    if (!item) return;

    editingId = id;
    document.getElementById("modalTitle").textContent = "Edit item";
    document.getElementById("itemName").value = item.name;
    document.getElementById("itemQty").value = item.quantity;
    document.getElementById("itemUnit").value = item.unit;
    document.getElementById("itemCategory").value = item.category;
    document.getElementById("itemExpires").value = item.expires_on || "";
    deleteBtn.classList.remove("hidden");
    modal.classList.remove("hidden");
  }

  // Form
  form?.addEventListener("submit", (e) => {
    e.preventDefault();

    const item = {
      name: document.getElementById("itemName").value.trim(),
      quantity: parseFloat(document.getElementById("itemQty").value) || 0,
      unit: document.getElementById("itemUnit").value.trim(),
      category: document.getElementById("itemCategory").value,
      expires_on: document.getElementById("itemExpires").value || "",
      in_stock: true
    };

    if (editingId) {
      updatePantryItem(editingId, item);
      toast("Item updated.", "success");
    } else {
      addPantryItem(item);
      toast("Item added.", "success");
    }

    closeModal();
    updateList();
  });

  deleteBtn?.addEventListener("click", () => {
    if (editingId && confirm("Delete this item?")) {
      deletePantryItem(editingId);
      toast("Item deleted.", "success");
      closeModal();
      updateList();
    }
  });

  clearExpiredBtn?.addEventListener("click", () => {
    const today = new Date().toISOString().split('T')[0];
    const expired = pantry.filter(item => item.expires_on && item.expires_on < today);
    if (expired.length && confirm(`Clear ${expired.length} expired items?`)) {
      expired.forEach(item => deletePantryItem(item.id));
      toast("Expired items cleared.", "success");
      updateList();
    }
  });

  closeModal?.addEventListener("click", closeModal);
  document.getElementById("cancelItemBtn")?.addEventListener("click", closeModal);

  function closeModal() {
    modal.classList.add("hidden");
    document.body.classList.remove("modal-open");
  }

  // Populate category filter
  const categories = [...new Set(pantry.map(item => item.category))];
  categoryFilter.innerHTML = '<option value="">All categories</option>' +
    categories.map(cat => `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`).join("");

  // Initial bind
  bindListEvents();
}
