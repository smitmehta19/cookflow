import { getSettings, saveSettings } from "./storage.js";

const navItems = [
  { key: "home", label: "Home", href: "./index.html", icon: "🏠" },
  { key: "vault", label: "Vault", href: "./vault.html", icon: "📚" },
  { key: "mood", label: "Mood", href: "./mood.html", icon: "🧠" },
  { key: "pantry", label: "Pantry", href: "./pantry.html", icon: "🧺" },
  { key: "planner", label: "Planner", href: "./planner.html", icon: "🗓️" },
  { key: "shopping", label: "Shopping", href: "./shopping.html", icon: "🛒" },
  { key: "randomizer", label: "Random", href: "./randomizer.html", icon: "🎲" }
];

export function mountLayout({ page = "", title = "CookFlow", content = "" }) {
  document.title = title;
  document.body.className = "min-h-screen bg-app text-zinc-100";

  document.body.innerHTML = `
    <div class="app-shell">
      <header class="topbar">
        <div class="topbar-inner">
          <a href="./index.html" class="brand">
            <span class="brand-mark">🍽️</span>
            <div class="brand-copy">
              <div class="brand-title">CookFlow</div>
        
            </div>
          </a>

          <div class="topbar-actions">
            <button id="openSettingsBtn" class="icon-btn" aria-label="Open settings" title="Settings">
              ⚙️
            </button>
            <button id="mobileNavToggle" class="icon-btn mobile-only" aria-label="Open navigation" aria-expanded="false">
              ☰
            </button>
          </div>
        </div>
      </header>

      <div class="layout">
        <aside id="sidebar" class="sidebar">
          <nav class="sidebar-nav">
            ${navItems.map((item) => `
              <a
                href="${item.href}"
                class="nav-link ${item.key === page ? "active" : ""}"
                data-nav-key="${item.key}"
              >
                <span class="nav-icon">${item.icon}</span>
                <span>${item.label}</span>
              </a>
            `).join("")}
          </nav>
        </aside>

        <main class="content-area">
          <div class="page-wrap">
            ${content}
          </div>
        </main>
      </div>

      <div id="mobileNavBackdrop" class="mobile-nav-backdrop hidden"></div>

      <div id="settingsModal" class="modal-backdrop hidden">
        <div class="modal-panel">
          <div class="modal-header">
            <div>
              <h2 class="modal-title">Settings</h2>
              <p class="modal-subtitle">Manage your AI provider, model, endpoint, and API key.</p>
            </div>
            <button id="closeSettingsBtn" class="icon-btn" aria-label="Close settings">✕</button>
          </div>

          <form id="settingsForm" class="settings-form">
            <div>
              <label class="mb-2 block text-xs uppercase tracking-wider text-zinc-400">Provider</label>
              <select id="settingsProvider" class="select">
                <option value="gemini">Gemini</option>
                <option value="openai">OpenAI-compatible</option>
              </select>
            </div>

            <div>
              <label class="mb-2 block text-xs uppercase tracking-wider text-zinc-400">Model</label>
              <input id="settingsModel" class="input" placeholder="gemini-2.5-flash-lite" />
            </div>

            <div>
              <label class="mb-2 block text-xs uppercase tracking-wider text-zinc-400">Endpoint</label>
              <input id="settingsEndpoint" class="input" placeholder="https://..." />
            </div>

            <div>
              <label class="mb-2 block text-xs uppercase tracking-wider text-zinc-400">API key</label>
              <input id="settingsApiKey" type="password" class="input" placeholder="Paste your API key" />
            </div>

            <div class="modal-actions">
              <button type="button" id="cancelSettingsBtn" class="btn btn-secondary">Cancel</button>
              <button type="submit" class="btn btn-primary">Save settings</button>
            </div>
          </form>
        </div>
      </div>

      <div id="toastRoot" class="toast-root"></div>
    </div>
  `;

  bindShell();
  bindSettings();
}

function bindShell() {
  const toggle = document.getElementById("mobileNavToggle");
  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("mobileNavBackdrop");

  if (!toggle || !sidebar || !backdrop) return;

  const closeNav = () => {
    sidebar.classList.remove("open");
    backdrop.classList.add("hidden");
    toggle.setAttribute("aria-expanded", "false");
  };

  const openNav = () => {
    sidebar.classList.add("open");
    backdrop.classList.remove("hidden");
    toggle.setAttribute("aria-expanded", "true");
  };

  toggle.addEventListener("click", () => {
    const isOpen = sidebar.classList.contains("open");
    if (isOpen) closeNav();
    else openNav();
  });

  backdrop.addEventListener("click", closeNav);

  window.addEventListener("resize", () => {
    if (window.innerWidth >= 1024) {
      closeNav();
    }
  });

  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", () => {
      if (window.innerWidth < 1024) closeNav();
    });
  });
}

function bindSettings() {
  const modal = document.getElementById("settingsModal");
  const openBtn = document.getElementById("openSettingsBtn");
  const closeBtn = document.getElementById("closeSettingsBtn");
  const cancelBtn = document.getElementById("cancelSettingsBtn");
  const form = document.getElementById("settingsForm");

  const providerInput = document.getElementById("settingsProvider");
  const modelInput = document.getElementById("settingsModel");
  const endpointInput = document.getElementById("settingsEndpoint");
  const apiKeyInput = document.getElementById("settingsApiKey");

  if (!modal || !openBtn || !closeBtn || !cancelBtn || !form) return;

  const fillForm = () => {
    const settings = getSettings();
    providerInput.value = settings.provider || "gemini";
    modelInput.value = settings.model || "";
    endpointInput.value = settings.endpoint || "";
    apiKeyInput.value = settings.apiKey || "";
  };

  const openModal = () => {
    fillForm();
    modal.classList.remove("hidden");
    document.body.classList.add("modal-open");
  };

  const closeModal = () => {
    modal.classList.add("hidden");
    document.body.classList.remove("modal-open");
  };

  openBtn.addEventListener("click", openModal);
  closeBtn.addEventListener("click", closeModal);
  cancelBtn.addEventListener("click", closeModal);

  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    saveSettings({
      provider: providerInput.value.trim(),
      model: modelInput.value.trim(),
      endpoint: endpointInput.value.trim(),
      apiKey: apiKeyInput.value.trim()
    });

    closeModal();

    const toastRoot = document.getElementById("toastRoot");
    if (toastRoot) {
      const el = document.createElement("div");
      el.className = "toast rounded-2xl border px-4 py-3 text-sm shadow-lg";
      el.textContent = "Settings saved.";
      toastRoot.appendChild(el);
      setTimeout(() => el.remove(), 2200);
    }
  });
}
