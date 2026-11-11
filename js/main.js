// Page controller dispatcher. Each HTML page runs only its own original controller.
if (document.getElementById('filterSex')) {
  const state = { year: 'ALL', sex: 'ALL', user: 'ALL', age: 'ALL' };
  const $ = id => document.getElementById(id);

  /* ---- actions handed to charts ---- */
  const act = {
    set(patch) { Object.assign(state, patch); syncSelects(); render(); },
    toggle(k, v) { act.set({ [k]: state[k] === v ? 'ALL' : v }); }
  };

  /* ---- filter controls ---- */
  const FILTERS = {
    filterYear: ['year', 'All years (2011–2021)', CFG.YEARS],
    filterSex: ['sex', 'All sexes', CFG.SEXES],
    filterUser: ['user', 'All road users', CFG.USERS],
    filterAge: ['age', 'All age groups', CFG.AGES]
  };
  function initSelects() {
    Object.entries(FILTERS).forEach(([id, [key, allLabel, opts]]) => {
      const sel = d3.select('#' + id);
      sel.selectAll('option').data([['ALL', allLabel], ...opts.map(o => [String(o), String(o)])]).join('option').attr('value', d => d[0]).text(d => d[1]);
      sel.on('change', function () { act.set({ [key]: key === 'year' && this.value !== 'ALL' ? +this.value : this.value }); });
    });
  }
  function syncSelects() { Object.entries(FILTERS).forEach(([id, [key]]) => { $(id).value = String(state[key]); }); }

  /* ---- KPI cards ---- */
  function renderKpis() {
    const rows = Data.filter(state), n = Data.sum(rows), all = Data.sum(Data.rows), died = Data.sum(rows, 'died');
    $('k1v').textContent = UI.fmt(n);
    let sub = n === all ? 'All traffic cases, 2011–2021' : `${UI.pct(n / all)} of all cases`;
    if (state.year !== 'ALL' && state.year > 2011) {
      const prev = Data.sum(Data.filter({ ...state, year: state.year - 1 }));
      if (prev) sub = `${n >= prev ? '▲' : '▼'} ${Math.abs((n / prev - 1) * 100).toFixed(1)}% vs ${state.year - 1}`;
    }
    $('k1s').textContent = sub;
    $('k2v').textContent = n ? Data.avgBed(rows).toFixed(1) : '–';
    $('k2s').textContent = `${UI.fmt(Data.sum(rows, 'bed'))} bed days in total`;
    $('k3v').textContent = UI.fmt(died);
    $('k3s').textContent = n ? `${(died / n * 100).toFixed(2)}% of cases` : '';
    const mt = d3.rollup(rows, v => Data.sum(v), r => r.month), pk = d3.greatest([...mt], d => d[1]);
    $('k4v').textContent = pk ? pk[0] : '–';
    $('k4s').textContent = pk ? `${UI.pct(pk[1] / n)} of selected cases` : '';
  }

  /* ---- legends ---- */
  function renderLegends() {
    UI.legend('#legUser', CFG.USERS.map(u => ({ key: u, label: CFG.USER_SHORT[u], col: CFG.USER_COL[u] })),
      { onClick: u => act.toggle('user', u), isOn: u => state.user === u });
  }

  /* ---- chart registry: one entry per chart (used by the cards AND the expand modal) ---- */
  const REG = {
    Sankey: { title: 'Who is hurt, in what crash type, and where do they live?', id: 'chartSankey', fn: Charts.sankey, rows: () => Data.filter(state) },
    Meki:   { title: 'Road user mix by age group', id: 'chartMeki', fn: Charts.meki, rows: () => Data.filter(state, ['user', 'age']) },
    Donut:  { title: 'Crash Type Distribution', id: 'chartDonut', fn: Charts.donut, rows: () => Data.filter(state) },
    Bed:    { title: 'Average Bed Days per Case', id: 'chartBed', fn: Charts.bed, rows: () => Data.filter(state, [Charts.mode.bed === 'age' ? 'age' : 'user']) },
    Season: { title: 'Seasonality: Month & Year', id: 'chartSeason', fn: Charts.season, rows: () => Data.filter(state, ['year']) }
  };
  let openName = null, lastZoomBtn = null;

  function render() {
    Object.entries(REG).forEach(([name, r]) => { const t = r.fn($(r.id), r.rows(), state, act); $('sub' + name).textContent = t; $('sub' + name).title = t; });
    renderKpis(); renderLegends(); renderModal();
  }

  /* ---- expand (full-screen) view ---- */
  function renderModal() {
    if (!openName) return;
    const r = REG[openName];
    UI.k = Math.max(1.25, Math.min(1.7, $('modalChart').clientWidth / 760));   // bigger text in expanded view
    try { $('modalSub').textContent = r.fn($('modalChart'), r.rows(), state, act); } finally { UI.k = 1; }
  }
  function openModal(name, btn) {
    openName = name; lastZoomBtn = btn; $('modalTitle').textContent = REG[name].title;
    $('overlay').hidden = false; document.body.style.overflow = 'hidden';
    renderModal(); $('modalClose').focus();
  }
  function closeModal() {
    openName = null; $('overlay').hidden = true; document.body.style.overflow = ''; UI.hideTip();
    $('modalChart').innerHTML = ''; render(); if (lastZoomBtn) lastZoomBtn.focus();
  }

  /* ---- bed-days grouping toggle ---- */
  function bindToggle() {
    document.querySelectorAll('[data-bed]').forEach(btn => btn.addEventListener('click', () => {
      Charts.mode.bed = btn.dataset.bed;
      document.querySelectorAll('[data-bed]').forEach(b => b.classList.toggle('on', b === btn));
      render();
    }));
  }

  /* ---- start ---- */
  (async function init() {
    try {
      await Data.load();
    } catch (err) {
      console.error(err);
      document.querySelector('.main').insertAdjacentHTML('afterbegin',
        '<div class="card" style="padding:16px;font-weight:600">Could not load data/Hospitalisations/traffic_injuries.csv. Open this page through a web server (e.g. VS Code Live Server or the Mercury server), not by double-clicking the file.</div>');
      return;
    }
    initSelects(); syncSelects();
    bindToggle();
    document.querySelectorAll('[data-zoom]').forEach(b => b.addEventListener('click', () => openModal(b.dataset.zoom, b)));
    $('modalClose').addEventListener('click', closeModal);
    $('overlay').addEventListener('click', e => { if (e.target === $('overlay')) closeModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && openName) closeModal(); });
    $('resetBtn').addEventListener('click', () => act.set({ year: 'ALL', sex: 'ALL', user: 'ALL', age: 'ALL' }));
    render();
    let t; window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(render, 150); });
  })();
} else if (document.getElementById('filterState')) {
  const state = { year: 'ALL', state: 'ALL', user: 'ALL', age: 'ALL' };
  const $ = id => document.getElementById(id);
  const act = {
    set(p) { Object.assign(state, p); syncSelects(); render(); },
    toggle(k, v) { act.set({ [k]: state[k] === v ? 'ALL' : v }); }
  };

  /* ---- filters ---- */
  const FILTERS = {
    filterYear: ['year', 'All years (2011–2021)', FN.YEARS],
    filterState: ['state', 'All states', FN.STATES],
    filterUser: ['user', 'All road users', FN.USERS],
    filterAge: ['age', 'All age groups', FN.AGES]
  };
  function initSelects() {
    Object.entries(FILTERS).forEach(([id, [key, all, opts]]) => {
      const sel = d3.select('#' + id);
      sel.selectAll('option').data([['ALL', all], ...opts.map(o => [String(o), String(o)])]).join('option').attr('value', d => d[0]).text(d => d[1]);
      sel.on('change', function () { act.set({ [key]: key === 'year' && this.value !== 'ALL' ? +this.value : this.value }); });
    });
  }
  function syncSelects() { Object.entries(FILTERS).forEach(([id, [key]]) => { $(id).value = String(state[key]); }); }

  /* ---- KPIs and insights ---- */
  function renderKpis() {
    const rows = FN.filter(state), n = FN.sum(rows), all = FN.sum(FN.records);
    $('k1v').textContent = R0(n);
    const byY = d3.rollup(FN.filter(state, ['year']), FN.sum, r => r.y), a = byY.get(2011), b = byY.get(2021);
    $('k1s').textContent = state.year !== 'ALL' ? `Cases in ${state.year}` : (a ? `${b >= a ? '▲' : '▼'} ${Math.abs((b / a - 1) * 100).toFixed(1)}% (2011–2021)` : '');
    const car = FN.sum(rows.filter(r => r.u === 'Car driver/passenger'));
    $('k2v').textContent = n ? (car / n * 100).toFixed(1) + '%' : '–';
    $('k2s').textContent = n ? `${R0(car)} cases` : '';
    const ages = d3.rollup(rows, FN.sum, r => r.a), pk = d3.greatest([...ages], d => d[1]);
    $('k3v').textContent = pk && n ? (pk[1] / n * 100).toFixed(1) + '%' : '–';
    $('k3n').textContent = pk ? `Peak age group (${pk[0]})` : 'Peak age group';
    $('k3s').textContent = pk ? `${R0(pk[1])} cases` : '';
    const yrs = new Set(rows.map(r => r.y)).size || 1;
    $('k4v').textContent = R0(n / yrs);
    $('k4s').textContent = n === all ? 'Across 11 years' : `${UI.pct(n / all)} of all cases`;
    // Key insights (always from the year-unfiltered view so the trend statement stays meaningful)
    $('insight1').textContent = a ? `Hospitalisations ${b >= a ? 'rose' : 'fell'} from ${R0(a)} (2011) to ${R0(b)} (2021), a ${Math.abs((b / a - 1) * 100).toFixed(1)}% ${b >= a ? 'increase' : 'decrease'} over eleven years.` : 'No cases match the current filters.';
    const yr = state.year === 'ALL' ? 2021 : state.year, base = d3.sum(FN.AGES, x => FN.ageYear[x][yr]);
    const yaFn = (FN.ageYear['17-25'][yr] / base * 100).toFixed(1), yaNon = FN.bench['17-25'].non.toFixed(1);
    $('insight2').textContent = `Young adults (17–25) account for ${yaFn}% of First Nations hospitalisations in ${yr} vs ${yaNon}% for non-Indigenous Australians.`;
  }

  /* ---- chart registry (cards and expand modal) ---- */
  const REG = {
    Trend: { title: '1. Annual Hospitalisations Trend (2011–2021)', id: 'chartTrend', fn: FNC.trend, rows: () => FN.filter(state, ['year']) },
    User:  { title: '3. Hospitalisations by Road User', id: 'chartUser', fn: FNC.user, rows: () => FN.filter(state) },
    AgeBar:{ title: '2. Hospitalisations by Age Group', id: 'chartAgeBar', fn: FNC.ageBar, rows: () => FN.filter(state) },
    Heat:  { title: '4. Age Group × Year Heatmap', id: 'chartHeat', fn: FNC.heat, rows: () => FN.filter(state, ['age', 'year']) },
    Dumb:  { title: '5. Age Profile Comparison (Dumbbell)', id: 'chartDumb', fn: FNC.dumb, rows: () => FN.filter(state, ['age']) }
  };
  let openName = null, lastBtn = null;
  function render() {
    Object.entries(REG).forEach(([name, r]) => { const t = r.fn($(r.id), r.rows(), state, act); $('sub' + name).textContent = t; $('sub' + name).title = t; });
    renderKpis(); renderModal();
  }
  function renderModal() {
    if (!openName) return;
    const r = REG[openName];
    UI.k = Math.max(1.25, Math.min(1.7, $('modalChart').clientWidth / 760));   // bigger text in expanded view
    try { $('modalSub').textContent = r.fn($('modalChart'), r.rows(), state, act); } finally { UI.k = 1; }
  }
  function openModal(name, btn) {
    openName = name; lastBtn = btn; $('modalTitle').textContent = REG[name].title;
    $('overlay').hidden = false; document.body.style.overflow = 'hidden'; renderModal(); $('modalClose').focus();
  }
  function closeModal() {
    openName = null; $('overlay').hidden = true; document.body.style.overflow = ''; UI.hideTip();
    $('modalChart').innerHTML = ''; render(); if (lastBtn) lastBtn.focus();
  }

  /* ---- start ---- */
  (async function init() {
    try { await FN.load(); } catch (err) {
      console.error(err);
      document.querySelector('.main').insertAdjacentHTML('afterbegin', '<div class="card" style="padding:16px;font-weight:600">Could not load the CSV files in data/First Nations People/. Open this page through a web server (e.g. VS Code Live Server or the Mercury server), not by double-clicking the file.</div>');
      return;
    }
    initSelects(); syncSelects();
    document.querySelectorAll('[data-zoom]').forEach(b => b.addEventListener('click', () => openModal(b.dataset.zoom, b)));
    $('modalClose').addEventListener('click', closeModal);
    $('overlay').addEventListener('click', e => { if (e.target === $('overlay')) closeModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (openName) closeModal(); else act.set({ year: 'ALL', state: 'ALL', user: 'ALL', age: 'ALL' }); } });
    $('resetBtn').addEventListener('click', () => act.set({ year: 'ALL', state: 'ALL', user: 'ALL', age: 'ALL' }));
    render();
    let t; window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(render, 150); });
  })();
}
