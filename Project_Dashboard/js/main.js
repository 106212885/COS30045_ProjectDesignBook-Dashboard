
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
      '<div class="card" style="padding:16px;font-weight:600">Could not load data/traffic_injuries.csv. Open this page through a web server (e.g. VS Code Live Server or the Mercury server), not by double-clicking the file.</div>');
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
