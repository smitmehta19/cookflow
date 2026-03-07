import { mountLayout } from "./app.js";
import { getRecipes } from "./storage.js";
import { escapeHtml, recipeEmoji, totalTime } from "./ui.js";

mountLayout({
  page: "randomizer",
  title: "Randomizer",
  content: `
    <section class="mx-auto max-w-3xl">
      <div class="card rounded-[2rem] p-6 text-center">
        <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white/5 text-4xl">🎰</div>
        <h1 class="mt-4 text-3xl font-semibold">Surprise Me</h1>
        <p class="mt-2 text-zinc-400">Spin through your saved recipes and let fate decide.</p>

        <div id="slot" class="slot mt-6 rounded-[2rem] border border-white/10 bg-black/20 p-6 flex items-center justify-center">
          <div>
            <div id="slotEmoji" class="text-6xl">🍜</div>
            <div id="slotName" class="mt-3 text-2xl font-semibold">Ready to shuffle</div>
            <div id="slotHint" class="mt-2 text-sm text-zinc-400">Save recipes first, then press Shuffle.</div>
          </div>
        </div>

        <button id="shuffleBtn" class="btn btn-primary mt-6 w-full sm:w-auto">Shuffle</button>
      </div>

      <div id="finalCard" class="mt-4"></div>
    </section>
  `
});

const recipes = getRecipes();
const shuffleBtn = document.getElementById("shuffleBtn");
const slotEmoji = document.getElementById("slotEmoji");
const slotName = document.getElementById("slotName");
const slotHint = document.getElementById("slotHint");
const finalCard = document.getElementById("finalCard");

let busy = false;

shuffleBtn.addEventListener("click", () => {
  if (busy || !recipes.length) return;

  busy = true;
  shuffleBtn.disabled = true;
  shuffleBtn.textContent = "Shuffling...";

  let interval = setInterval(() => {
    const candidate = recipes[Math.floor(Math.random() * recipes.length)];
    slotEmoji.textContent = recipeEmoji(candidate);
    slotName.textContent = candidate.name;
    slotHint.textContent = `${totalTime(candidate)} min`;
  }, 90);

  setTimeout(() => {
    clearInterval(interval);
    const finalRecipe = recipes[Math.floor(Math.random() * recipes.length)];
    slotEmoji.textContent = recipeEmoji(finalRecipe);
    slotName.textContent = finalRecipe.name;
    slotHint.textContent = "Tonight’s pick";

    finalCard.innerHTML = `
      <div class="card rounded-[2rem] p-5">
        <h2 class="text-xl font-semibold">${escapeHtml(finalRecipe.name)}</h2>
        <p class="mt-2 text-zinc-400">${escapeHtml(finalRecipe.description || "No description")}</p>
        <div class="mt-4 flex flex-wrap gap-2">
          <span class="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs">${totalTime(finalRecipe)} min</span>
          <span class="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs">${finalRecipe.ingredients.length} ingredients</span>
        </div>
        <a href="./recipe.html?id=${finalRecipe.id}" class="btn btn-secondary mt-4 inline-block">Open recipe</a>
      </div>
    `;

    busy = false;
    shuffleBtn.disabled = false;
    shuffleBtn.textContent = "Shuffle";
  }, 1600);
});
