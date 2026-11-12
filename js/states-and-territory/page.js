/* =====================================================================
   page.js  –  builds the States & Territories page, wires the filters
   (Year, State, Cases/Rates), KPIs, cross-highlighting and zoom window.
   ===================================================================== */
(function () {
  const { CONFIG, Charts, loadData } = ST;
  const fmt = d3.format(","), f1 = d3.format(",.1f");
  const ui = { year: null, state: null, measure: "cases", breakdown: "road" };   // everything the user can change
  let DATA, root, zoomKey = null, zoomTrigger = null;
  const TXT = {};                                                 // current title + note of every chart
  const $ = id => document.getElementById("st-" + id);            // all my ids start with "st-"

  // ---------- 1. my page's constant HTML (ids/classes are prefixed so no clash with the team's) ----------
  const ico = d => `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${d}"/></svg>`;
  const P = {
    home: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
    up: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
    people: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
    zoom: "M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4"
  };
  const expand = (key, label) => `<button class="st-expand" data-z="${key}" aria-label="Zoom in: ${label}" title="Zoom in">${ico(P.zoom)}</button>`;
  const kpi = (i, cls, icon) => `<article class="st-card st-kpi st-${cls}"><div class="st-ic">${ico(icon)}</div><div><div class="st-v" id="st-k${i}v">–</div><div class="st-l" id="st-k${i}l"></div><div class="st-s" id="st-k${i}s"></div></div></article>`;
  const pills = attrs => `<div class="st-pills" ${attrs} role="group" aria-label="Break down by"><button class="st-pill" data-b="road" aria-pressed="true">Road user</button><button class="st-pill" data-b="cp" aria-pressed="false">What the vehicle hit</button></div>`;
  const panel = (key, label, cls = "", tools = "") => {          // notes sit under the title across the full card width (inline for the tile row)
    const note = `<p class="st-note" id="st-n-${key}"></p>`, inline = key === "tiles";
    return `<article class="st-card st-panel ${cls}"><div class="st-head"><div class="st-titlewrap"><h2 id="st-t-${key}"></h2>${inline ? note : ""}</div><div class="st-tools">${tools}${expand(key, label)}</div></div>${inline ? "" : note}<div class="st-chart" id="st-${key}"></div></article>`;
  };

  function buildPage() {
    root = document.createElement("div");
    root.id = "st-root"; root.className = "st-page"; root.hidden = true;
    root.innerHTML = `
      <section class="st-card st-filterbar" aria-label="Filters">
        <div class="st-filter"><label for="st-filterYear">Year</label><select id="st-filterYear"></select></div>
        <div class="st-filter"><label for="st-filterState">State / territory</label><select id="st-filterState"></select></div>
        <div class="st-filter"><label id="st-measureLabel">Measure</label>
          <div class="st-seg" role="group" aria-labelledby="st-measureLabel"><button data-m="cases" aria-pressed="true">Cases</button><button data-m="rate" aria-pressed="false">Rates</button></div></div>
      </section>
      <div id="st-error" class="st-err" hidden></div>
      <section class="st-kpis" aria-live="polite" aria-label="Key figures">${kpi(1, "k1", P.home)}${kpi(2, "k2", P.up)}${kpi(3, "k3", P.people)}</section>
      ${panel("tiles", "tile row of each state's trend", "st-tilesrow")}
      <section class="st-grid">
        ${panel("line", "percentage change line chart")}
        ${panel("mix", "stacked bars by state", "", pills(""))}
        ${panel("heat", "age group by year heatmap")}
        ${panel("sex", "butterfly chart by sex")}
      </section>
      <p class="st-foot" id="st-foot"></p>
      <div class="st-zoom" id="st-zoom" role="dialog" aria-modal="true" aria-labelledby="st-zoomTitle" hidden>
        <div class="st-zoom-card">
          <div class="st-zoom-head"><div><h2 id="st-zoomTitle"></h2><p class="st-note" id="st-zoomNote"></p></div>
            <div class="st-tools">${pills('id="st-zoomPills" hidden')}<button class="st-close" id="st-zoomClose" aria-label="Close zoomed chart">&times;</button></div></div>
          <div class="st-chart st-zoomed" id="st-zoomBody"></div>
        </div>
      </div>`;
    // Mount right after the team's First Nations content area (their markup is untouched)
    document.getElementById("dashboard-content-area").insertAdjacentElement("afterend", root);
  }

  // ---------- 2. the five charts: where they live and how to draw them (zoom = big version) ----------
  const CHARTS = {
    tiles: { el: "#st-tiles", draw: (el, z) => Charts.tiles(el, DATA, ui, pick, z) },
    line:  { el: "#st-line",  draw: (el, z) => Charts.line(el, DATA, ui, { pickState: pick, pickYear: setYear }, z) },
    mix:   { el: "#st-mix",   draw: (el, z) => Charts.mix(el, DATA, ui, pick, z) },
    heat:  { el: "#st-heat",  draw: (el, z) => Charts.heat(el, DATA, ui, { pickYear: setYear }, z) },
    sex:   { el: "#st-sex",   draw: (el, z) => Charts.sex(el, DATA, ui, pick, z) }
  };

  // Titles and one-line notes (rebuilt from the data and the filters every time)
  function renderText() {
    const R = ui.measure === "rate", y = ui.year, y0 = DATA.years[0], B = CONFIG.BREAKDOWNS[ui.breakdown], k = R ? "rate" : "cases";
    const brk = Object.entries(CONFIG.BREAKS).map(([s, yr]) => `${s} ${yr}`).join(", ");
    const ps = DATA.states.map(s => [s, DATA.pct[s][y][k]]).sort((a, b) => b[1] - a[1]);
    const male = d3.sum(DATA.states, s => DATA.sex[s][y].Male.cases), fem = d3.sum(DATA.states, s => DATA.sex[s][y].Female.cases);
    TXT.tiles = { t: R ? `1. Annual hospitalisation rate by state, ${y0}–${DATA.years.at(-1)} (per 100,000 people)` : `1. Annual hospitalisations by state, ${y0}–${DATA.years.at(-1)}`,
                  n: `Dot = selected year · grey band = break in series (${brk}) · own scale per tile` };
    TXT.line = { t: `2. Change in ${R ? "hospitalisation rate" : "hospitalisations"} since ${y0} (%)`,
                 n: y === y0 ? "Choose a later year to see the change." : `By ${y}: highest ${ps[0][0]} ${(ps[0][1] > 0 ? "+" : "") + ps[0][1].toFixed(1)}%, lowest ${ps.at(-1)[0]} ${ps.at(-1)[1].toFixed(1)}%.` };
    TXT.mix  = { t: `3. ${B.title}, ${y}`, n: B.note };
    TXT.heat = { t: `4. Age group × year heatmap – ${ui.state ? DATA.names[ui.state] : "all states"} (cases)`,
                 n: R ? "Rates are not applicable here: the ABS population table has no age groups, so this chart stays in cases."
                      : ui.state ? "Cases only. Hatched = includes counts withheld by BITRE (n.p.). Click a column to highlight a year."
                                 : "Cases only. Counts withheld by BITRE (ACT, NT, Tas) are left out; pick a state to see them hatched.",
                 warn: R };
    TXT.sex  = { t: `5. ${R ? "Hospitalisation rate" : "Hospitalisations"} by sex and state, ${y}`,
                 n: `In ${y}, males account for ${Math.round(male / (male + fem) * 100)}% of cases across the states.` };
    Object.keys(TXT).forEach(key => {
      $("t-" + key).textContent = TXT[key].t;
      const n = $("n-" + key); n.textContent = TXT[key].n; n.classList.toggle("st-warn", !!TXT[key].warn);
    });
    $("foot").textContent = R ? "Rates = hospitalisations per 100,000 people (ABS estimated resident population, 30 June). Cases exclude people who died in hospital within 30 days."
                              : "Counts, not rates: larger states have more people. Switch to Rates to compare fairly. Cases exclude people who died in hospital within 30 days.";
    if (zoomKey) { $("zoomTitle").textContent = TXT[zoomKey].t; const n = $("zoomNote"); n.textContent = TXT[zoomKey].n; n.classList.toggle("st-warn", !!TXT[zoomKey].warn); }
  }

  // KPI cards: Cases view and Rates view
  function renderKpis() {
    const y = ui.year, y0 = DATA.years[0], R = ui.measure === "rate", a = DATA.aus[y];
    const v = DATA.states.map(s => R ? DATA.rate[s][y] : DATA.totals[s][y]), top = d3.maxIndex(v);
    $("k1l").textContent = R ? "Highest rate per 100,000" : "Highest hospitalisations";
    $("k1v").textContent = DATA.names[DATA.states[top]];
    $("k1s").textContent = R ? `${f1(v[top])} per 100,000 in ${y}` : `${fmt(v[top])} cases in ${y}`;
    $("k2l").textContent = R ? `Fastest growth in rate since ${y0}` : `Fastest growth since ${y0}`;
    if (y === y0) { $("k2v").textContent = "–"; $("k2s").textContent = "Choose a later year"; }
    else {
      const g = DATA.states.map(s => DATA.pct[s][y][R ? "rate" : "cases"]), b = d3.maxIndex(g);
      $("k2v").textContent = DATA.names[DATA.states[b]]; $("k2s").textContent = `+${g[b].toFixed(1)}% vs ${y0}`;
    }
    $("k3l").textContent = R ? "Australia rate per 100,000" : "Australia total";
    $("k3v").textContent = R ? f1(a.rate) : fmt(a.cases);
    $("k3s").textContent = R ? `${fmt(a.cases)} cases in ${y}` : `hospitalisations in ${y}`;
  }

  function drawCharts() {                                // main charts, plus the zoomed one if open
    Object.values(CHARTS).forEach(c => c.draw(c.el, false));
    if (zoomKey) CHARTS[zoomKey].draw("#st-zoomBody", true);
  }
  function syncControls() {
    $("filterYear").value = ui.year; $("filterState").value = ui.state || "ALL";
    root.querySelectorAll(".st-seg button").forEach(b => b.setAttribute("aria-pressed", b.dataset.m === ui.measure));
    root.querySelectorAll(".st-pill").forEach(p => p.setAttribute("aria-pressed", p.dataset.b === ui.breakdown));
  }
  function update() {                                    // redraw everything from `ui`
    syncControls(); renderText(); renderKpis(); drawCharts(); Charts.setFocus(ui.state);
  }
  function pick(code) { ui.state = ui.state === code ? null : code; update(); }   // click a state again to clear
  function setYear(yr) { ui.year = yr; update(); }

  // ---------- 3. zoom window (Esc / backdrop / x closes it; Tab stays inside) ----------
  function openZoom(key, trigger) {
    zoomKey = key; zoomTrigger = trigger;
    $("zoomPills").hidden = key !== "mix";
    $("zoom").hidden = false;
    update(); $("zoomClose").focus();
  }
  function closeZoom() {
    zoomKey = null; Charts.hideTip();
    $("zoom").hidden = true; $("zoomBody").innerHTML = "";
    if (zoomTrigger) zoomTrigger.focus();
  }
  document.addEventListener("keydown", e => {
    if (!zoomKey) return;
    if (e.key === "Escape") closeZoom();
    if (e.key === "Tab") {
      const f = [...$("zoom").querySelectorAll("button:not([hidden]),[tabindex='0']")].filter(n => n.offsetParent !== null);
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  function showError(err) {
    const box = $("error");
    box.hidden = false;
    box.textContent = "Could not load the States & Territories data: " + err.message +
      (location.protocol === "file:" ? " Tip: open the project with VS Code's Live Server (browsers block CSV loading from file://)." : "");
    console.error(err);
  }

  // ---------- 4. plug into the team's tab switcher (their code is not edited) ----------
  function hookTabs() {
    const teamSwitchTab = window.switchTab;              // the team's function from interactive.js
    if (typeof teamSwitchTab !== "function") {
      root.hidden = false;                               // standalone states.html: show immediately
      return;
    }
    window.switchTab = function (tabKey) {
      teamSwitchTab(tabKey);                             // run the team's code first, unchanged
      const dash = document.getElementById("dashboard-content-area"), placeholder = document.getElementById("teammate-placeholder");
      if (tabKey === "states") {                         // my tab: hide their content, show mine
        if (placeholder) placeholder.style.display = "none";
        if (dash) dash.style.display = "none";
        root.hidden = false;
        requestAnimationFrame(() => { if (DATA) drawCharts(); });
      } else {                                           // any other tab: give control back to their classes
        if (placeholder) placeholder.style.display = "";
        if (dash) dash.style.display = "";
        root.hidden = true;
      }
    };
  }

  async function init() {
    buildPage();
    root.hidden = false;
    hookTabs();
    try {
      DATA = await loadData();
      ui.year = DATA.years.at(-1);                                         // start on the latest year
      d3.select("#st-filterYear").selectAll("option").data(DATA.years).join("option").attr("value", d => d).text(d => d);
      d3.select("#st-filterState").selectAll("option").data(["ALL", ...DATA.states]).join("option")
        .attr("value", d => d).text(d => d === "ALL" ? "All states" : DATA.names[d]);
      $("filterYear").addEventListener("change", e => { ui.year = +e.target.value; update(); });
      $("filterState").addEventListener("change", e => { ui.state = e.target.value === "ALL" ? null : e.target.value; update(); });
      root.querySelectorAll(".st-seg button").forEach(b => b.addEventListener("click", () => { ui.measure = b.dataset.m; update(); }));
      root.querySelectorAll(".st-pill").forEach(p => p.addEventListener("click", () => { ui.breakdown = p.dataset.b; update(); }));
      root.querySelectorAll(".st-expand").forEach(b => b.addEventListener("click", () => openZoom(b.dataset.z, b)));
      const resetBtn = $("reset") || document.getElementById("resetBtn");
      if (resetBtn) resetBtn.addEventListener("click", () => { ui.year = DATA.years.at(-1); ui.state = null; ui.measure = "cases"; ui.breakdown = "road"; update(); });
      $("zoomClose").addEventListener("click", closeZoom);
      $("zoom").addEventListener("click", e => { if (e.target.id === "st-zoom") closeZoom(); });   // click the backdrop
      let raf; const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { if (!root.hidden) drawCharts(); }); });
      root.querySelectorAll(".st-chart").forEach(n => ro.observe(n));
      update();
    } catch (err) { showError(err); }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
