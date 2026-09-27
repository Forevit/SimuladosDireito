(() => {
  const root = document.documentElement;
  const storageKey = "luiza-theme";
  const validThemes = ["dark", "light"];

  let theme = "dark";
  try {
    const saved = localStorage.getItem(storageKey);
    if (validThemes.includes(saved)) theme = saved;
  } catch (_) {
    // The site still works with the dark default when storage is unavailable.
  }

  root.dataset.theme = theme;

  const updateControls = () => {
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";
      const label = `Ativar tema ${nextTheme === "light" ? "claro" : "escuro"}`;
      button.setAttribute("aria-label", label);
      button.setAttribute("title", label);
      button.setAttribute("aria-pressed", String(root.dataset.theme === "light"));
      const icon = button.querySelector("[data-theme-icon]");
      if (icon) icon.textContent = root.dataset.theme === "dark" ? "☼" : "☾";
    });
  };

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-theme-toggle]");
    if (!button) return;

    root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(storageKey, root.dataset.theme);
    } catch (_) {
      // The selected theme remains active for this page.
    }
    updateControls();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", updateControls, { once: true });
  } else {
    updateControls();
  }
})();
