/* =====================================================================
   data.js  –  loading, validating and reshaping the KNIME CSV exports.
   No drawing happens here (separation of concerns).
   ===================================================================== */
(function () {
  const CONFIG = ST.CONFIG;
  const readCsv = file => d3.csv(CONFIG.DATA_DIR + file);       // rejects if the file is missing

  // Stop early with a clear message if a file is empty or a column is missing
  function need(rows, cols, file) {
    if (!rows.length) throw new Error(`${file} is empty.`);
    cols.forEach(c => { if (!(c in rows[0])) throw new Error(`${file} is missing the column "${c}". Check the KNIME export.`); });
  }
  // put(obj, [a, b, c], value)  ->  obj[a][b][c] = value
  function put(obj, path, value) {
    let t = obj;
    path.slice(0, -1).forEach(k => { t = t[k] ??= {}; });
    t[path[path.length - 1]] = value;
  }

  async function loadData() {
    const F = CONFIG.FILES;
    const [st, au, pc, rd, cp, ag, sx] = await Promise.all([F.state, F.aus, F.pct, F.road, F.cp, F.age, F.sex].map(readCsv));
    need(st, ["Year", "State", "Cases", "Populations", "Rate"], F.state);
    need(au, ["Year", "Australia", "Populations", "Rate"], F.aus);
    need(pc, ["State", "Year", "PctChangeCases", "PctChangeRate"], F.pct);
    need(rd, ["State", "Year", "RoadUserGroup", "Cases", "Rate"], F.road);
    need(cp, ["State", "Year", "CounterpartyGroup", "Cases", "Rate"], F.cp);
    const ageState = ag.length && "State" in ag[0] ? "State" : "States";     // the KNIME export may call it "States"
    need(ag, [ageState, "Year", "AgeGroup", "AgeOrder", "Cases", "Withheld"], F.age);
    need(sx, ["State", "Year", "Sex", "Cases", "Rate"], F.sex);

    const states = CONFIG.STATES.map(s => s.code), names = {};
    CONFIG.STATES.forEach(s => { names[s.code] = s.name; });
    const years = [...new Set(st.map(d => +d.Year))].sort(d3.ascending);

    const totals = {}, rate = {}, pop = {}, pct = {}, aus = {}, sex = {}, age = {};
    st.forEach(d => {
      if (!names[d.State]) throw new Error(`Unknown state "${d.State}" in ${F.state}.`);
      put(totals, [d.State, +d.Year], +d.Cases); put(rate, [d.State, +d.Year], +d.Rate); put(pop, [d.State, +d.Year], +d.Populations);
    });
    // Every state needs a number for every year, otherwise charts would silently break
    states.forEach(s => years.forEach(y => {
      if (!Number.isFinite(totals[s]?.[y])) throw new Error(`No value for ${s} in ${y} (${F.state}).`);
    }));
    au.forEach(d => { aus[+d.Year] = { cases: +d.Australia, rate: +d.Rate, pop: +d.Populations }; });
    pc.forEach(d => put(pct, [d.State, +d.Year], { cases: +d.PctChangeCases, rate: +d.PctChangeRate }));

    const mix = { road: {}, cp: {} };
    rd.forEach(d => put(mix.road, [d.State, +d.Year, d.RoadUserGroup], { cases: +d.Cases, rate: +d.Rate }));
    cp.forEach(d => put(mix.cp, [d.State, +d.Year, d.CounterpartyGroup], { cases: +d.Cases, rate: +d.Rate }));
    sx.forEach(d => put(sex, [d.State, +d.Year, d.Sex], { cases: +d.Cases, rate: +d.Rate }));
    ag.forEach(d => put(age, [d[ageState], +d.Year, d.AgeGroup], { cases: +d.Cases, withheld: +d.Withheld > 0 }));
    const ageGroups = [...new Map(ag.map(d => [+d.AgeOrder, d.AgeGroup]))].sort((a, b) => a[0] - b[0]).map(d => d[1]);

    return { years, states, names, totals, rate, pop, pct, aus, mix, sex, age, ageGroups };
  }
  ST.loadData = loadData;
})();
