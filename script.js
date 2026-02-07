(() => {
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  // Smooth scroll for internal links
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href^='#']");
    if (!a) return;
    const id = a.getAttribute("href");
    if (!id || id === "#") return;
    const el = document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  const toast = document.getElementById("toast");
  let toastTimer = null;

  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 1700);
  }

  // Demo buttons (Media)
  document.querySelectorAll("[data-toast]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      showToast(btn.getAttribute("data-toast") || "OK");
    });
  });

  // Copy discord link
  const copyBtn = document.getElementById("copyDiscord");
  const hint = document.getElementById("copyHint");

  function getDiscordLink() {
    // Reads from the top button (single source of truth)
    const top = document.getElementById("discordTop");
    return top ? top.getAttribute("href") : "";
  }

  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      const link = getDiscordLink();
      try {
        await navigator.clipboard.writeText(link || "");
        if (hint) hint.textContent = "Discord-Link kopiert ✅";
        showToast("Discord-Link kopiert ✅");
      } catch {
        if (hint) hint.textContent = "Kopieren nicht möglich — Link manuell kopieren.";
        showToast("Kopieren nicht möglich.");
      }
      setTimeout(() => { if (hint) hint.textContent = ""; }, 2000);
    });
  }
})();
// ===== Wallpaper Gallery =====
const grid = document.getElementById("wallpaperGrid");
const filterButtons = document.querySelectorAll("[data-filter]");

let wallpapers = [];
let activeFilter = "all";

function renderWallpapers() {
  if (!grid) return;

  grid.innerHTML = "";

  const filtered = wallpapers.filter(w =>
    activeFilter === "all" ? true : w.tag === activeFilter
  );

  if (!filtered.length) {
    grid.innerHTML = `
      <div class="panel card">
        <h3>Keine Wallpapers</h3>
      </div>
    `;
    return;
  }

  filtered.forEach(w => {
    const url = `assets/wallpapers/${w.file}`;

    const item = document.createElement("div");
    item.className = "wallItem";

    item.innerHTML = `
      <a href="${url}" target="_blank" rel="noreferrer">
        <img class="wallThumb" src="${url}" alt="${w.title}" loading="lazy">
      </a>

      <div class="wallMeta">
        <div>
          <h4>${w.title}</h4>
          <div class="small">${w.tag} • ${w.resolution}</div>
        </div>

        <div class="wallBtns">
          <a class="btn" href="${url}" target="_blank">Preview</a>
          <a class="btn btn--primary" href="${url}" download>Download</a>
        </div>
      </div>
    `;

    grid.appendChild(item);
  });
}

async function loadWallpapers() {
  try {
    const res = await fetch("assets/wallpapers/wallpapers.json", { cache: "no-store" });
    wallpapers = await res.json();
    renderWallpapers();
  } catch (e) {
    if (grid) {
      grid.innerHTML = `
        <div class="panel card">
          <h3>Fehler</h3>
          <p class="small">Wallpapers konnten nicht geladen werden.</p>
        </div>
      `;
    }
  }
}

filterButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    filterButtons.forEach(b => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    activeFilter = btn.dataset.filter;
    renderWallpapers();
  });
});

loadWallpapers();
