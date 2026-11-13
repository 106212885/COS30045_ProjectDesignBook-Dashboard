/* =====================================================================
   accessibility.js – Keyboard & screen-reader support for all pages
   ===================================================================== */
(function () {
  function initAccessibility() {
    // 1. Add a "Skip to dashboard content" link at the very top of the page
    const main = document.querySelector("main.main");
    if (main && !document.getElementById("a11y-skip")) {
      if (!main.id) main.id = "main-content";
      main.setAttribute("tabindex", "-1");

      const skip = document.createElement("a");
      skip.id = "a11y-skip";
      skip.className = "a11y-skip";
      skip.href = "#" + main.id;
      skip.textContent = "Skip to dashboard content";
      document.body.insertBefore(skip, document.body.firstChild);
    }

    // 2. Add an invisible speaker box so screen readers announce filter changes
    const live = document.createElement("div");
    live.id = "a11y-status";
    live.className = "sr-only";
    live.setAttribute("role", "status");
    live.setAttribute("aria-live", "polite");
    document.body.appendChild(live);

    const announce = msg => {
      live.textContent = "";
      requestAnimationFrame(() => { live.textContent = msg; });
    };

    // 3. Speak out loud when a dropdown filter changes or Reset is clicked
    document.querySelectorAll("select").forEach(sel => {
      sel.addEventListener("change", () => {
        const label = document.querySelector(`label[for="${sel.id}"]`)?.textContent || "Filter";
        const chosen = sel.options[sel.selectedIndex]?.text || sel.value;
        announce(`${label} changed to ${chosen}.`);
      });
    });

    const resetBtn = document.getElementById("resetBtn") || document.getElementById("st-reset");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => announce("All filters reset."));
    }

    // 4. Make chart bars/dots focusable with Tab and clickable with Enter/Space
    const enhanceCharts = () => {
      document.querySelectorAll("[data-bed], .legend button").forEach(btn => {
        btn.setAttribute("aria-pressed", String(btn.classList.contains("on")));
      });

      document.querySelectorAll("article.card.chart").forEach(card => {
        const title = card.querySelector("h3")?.textContent?.trim() || "Chart";
        const sub = card.querySelector(".sub")?.textContent?.trim() || "";
        const svg = card.querySelector(".body svg");
        if (svg && sub) svg.setAttribute("aria-label", `${title}. ${sub}`);
      });

      document.querySelectorAll(".body svg .clickable").forEach(el => {
        if (!el.hasAttribute("tabindex")) {
          el.setAttribute("tabindex", "0");
          el.setAttribute("role", "button");
          el.addEventListener("keydown", e => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
            }
          });
        }
      });
    };

    const observer = new MutationObserver(() => enhanceCharts());
    document.querySelectorAll(".body, .legend, #st-root").forEach(node => {
      observer.observe(node, { childList: true, subtree: true });
    });
    enhanceCharts();

    // 5. Keep the Tab key trapped inside the Zoom popup when it is open
    const overlay = document.getElementById("overlay");
    if (overlay) {
      document.addEventListener("keydown", e => {
        if (overlay.hidden || e.key !== "Tab") return;
        const focusables = [...overlay.querySelectorAll(
          'button:not([disabled]), [href], select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )].filter(el => el.offsetParent !== null);
        if (!focusables.length) return;
        const first = focusables[0], last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAccessibility);
  } else {
    initAccessibility();
  }
})();