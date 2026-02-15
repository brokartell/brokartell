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
// ===== Wallpaper Gallery (mit Pagination) =====
const grid = document.getElementById("wallpaperGrid");
const filterButtons = document.querySelectorAll("[data-filter]");

let wallpapers = [];
let activeFilter = "all";

// Pagination
function getPageSize(){
  return window.innerWidth <= 768 ? 3 : 6;
}

let currentPage = 1;

// Pagination UI Container (wird automatisch unter dem Grid erstellt)
let pager = document.getElementById("wallpaperPager");
if (!pager && grid) {
  pager = document.createElement("div");
  pager.id = "wallpaperPager";
  pager.className = "wallPager";
  grid.insertAdjacentElement("afterend", pager);
}

function getFilteredWallpapers() {
  return wallpapers.filter(w => (activeFilter === "all" ? true : w.tag === activeFilter));
}

function renderPager(totalItems) {
  if (!pager) return;

  const pageSize = getPageSize();
const totalPages = Math.ceil(totalItems / pageSize);


  // Wenn <= 1 Seite, Pager ausblenden
  if (totalPages <= 1) {
    pager.innerHTML = "";
    pager.style.display = "none";
    return;
  }

  pager.style.display = "flex";

  const prevDisabled = currentPage <= 1 ? "disabled" : "";
  const nextDisabled = currentPage >= totalPages ? "disabled" : "";

  // Numbers
  let nums = "";
  for (let i = 1; i <= totalPages; i++) {
    const active = i === currentPage ? "is-active" : "";
    nums += `<button class="btn btn--chip ${active}" data-page="${i}">${i}</button>`;
  }

  pager.innerHTML = `
    <button class="btn btn--chip" data-action="prev" ${prevDisabled}>←</button>
    <div class="wallPager__nums">${nums}</div>
    <button class="btn btn--chip" data-action="next" ${nextDisabled}>→</button>
  `;

  // Events
  pager.querySelectorAll("[data-page]").forEach(b => {
    b.addEventListener("click", () => {
      currentPage = Number(b.dataset.page);
      renderWallpapers();
      // optional: nach oben zum Grid scrollen
      grid?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  pager.querySelector("[data-action='prev']")?.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderWallpapers();
      grid?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  pager.querySelector("[data-action='next']")?.addEventListener("click", () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderWallpapers();
      grid?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
}

function renderWallpapers() {
  if (!grid) return;

  grid.innerHTML = "";

  const filtered = getFilteredWallpapers();

  if (!filtered.length) {
    grid.innerHTML = `
      <div class="panel card">
        <h3>Keine Wallpapers</h3>
      </div>
    `;
    renderPager(0);
    return;
  }

  const pageSize = getPageSize();
const totalPages = Math.ceil(filtered.length / pageSize);
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * pageSize;
const pageItems = filtered.slice(start, start + pageSize);

  function isNewWallpaper(dateStr){
  if(!dateStr) return false;

  const added = new Date(dateStr);
  const now = new Date();

  const diffDays = (now - added) / (1000 * 60 * 60 * 24);

  return diffDays <= 7; // 7 Tage = neu
}


  pageItems.forEach(w => {
    const url = `assets/wallpapers/${w.file}`;

    const item = document.createElement("div");
    item.className = "wallItem";

  const isNew = isNewWallpaper(w.date);

item.innerHTML = `
  <div class="wallThumbWrap">
    <button class="wallThumbBtn js-preview" type="button"
            data-src="${url}" data-title="${w.title}">
      <img class="wallThumb" src="${url}" alt="${w.title}" loading="lazy">
    </button>
    ${isNew ? `<span class="badge-new">NEU</span>` : ""}
  </div>

  <div class="wallMeta">
    <div>
      <h4>${w.title}</h4>
      <div class="small">${w.tag} • ${w.resolution}</div>
    </div>

    <div class="wallBtns">
      <button class="btn js-preview" type="button"
              data-src="${url}" data-title="${w.title}">
        Preview
      </button>
      <a class="btn btn--primary" href="${url}" download>Download</a>
    </div>
  </div>
`;


    grid.appendChild(item);
  });

  renderPager(filtered.length);
}

async function loadWallpapers() {
  try {
    const res = await fetch("assets/wallpapers/wallpapers.json", { cache: "no-store" });
    wallpapers = await res.json();
    currentPage = 1;
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
    renderPager(0);
  }
}

filterButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    filterButtons.forEach(b => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    activeFilter = btn.dataset.filter;

    // wichtig: beim Filterwechsel wieder Seite 1
    currentPage = 1;

    renderWallpapers();
  });
});

loadWallpapers();
// ===== Preview Modal =====
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".js-preview");
  if (!btn) return;

  const src = btn.dataset.src;
  const title = btn.dataset.title;

  openPreview(src, title);
});
function openPreview(src, title) {
  document.querySelector(".previewModal")?.remove();
  const modal = document.createElement("div");
  modal.className = "previewModal";

  modal.innerHTML = `
    <div class="previewOverlay"></div>
    <div class="previewContent">
      <button class="previewClose">✕</button>
      <img src="${src}" alt="${title}">
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector(".previewOverlay").onclick = () => modal.remove();
  modal.querySelector(".previewClose").onclick = () => modal.remove();
}

// Resize-Fix für Mobile (verhindert Zurückspringen auf Seite 1)
let resizeTimer = null;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);

  resizeTimer = setTimeout(() => {
    const totalPages = Math.ceil(
      getFilteredWallpapers().length / getPageSize()
    );

    // Seite nur korrigieren, wenn sie ungültig wäre
    if (currentPage > totalPages) {
      currentPage = totalPages;
    }

    renderWallpapers();
  }, 200);
});

// Mail-Adresse dynamisch generieren (Spam-Schutz)
(() => {
  const user = "post";
  const domain = "bro-kartell.com";
  const email = `${user}@${domain}`;

  const btn = document.getElementById("mailBtn");
  if (btn) {
    btn.href = `mailto:${email}`;
  }
})();
// Mail für Impressum / Datenschutz
(() => {
  const user = "post";
  const domain = "bro-kartell.com";
  const email = `${user}@${domain}`;

  const btnLegal = document.getElementById("mailBtnLegal");
  if (btnLegal) {
    btnLegal.href = `mailto:${email}`;
  }
})();

