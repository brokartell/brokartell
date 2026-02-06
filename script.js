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
