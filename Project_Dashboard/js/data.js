
const Data = {
  rows: [],
  async load() {
    this.rows = await d3.csv(CFG.DATA_URL, d => ({
      year: +d.year, month: d.month, age: d.age, sex: d.sex, user: d.road_user, cp: d.counterparty,
      rem: d.remoteness, hosp: +d.hosp, bed: +d.bed_days, died: +d.died
    }));
    return this.rows;
  },
  /** Apply filters. `skip` lists filter keys a chart handles itself (highlight instead of remove). */
  filter(st, skip = []) {
    const ok = (k, v) => skip.includes(k) || st[k] === 'ALL' || st[k] === v;
    return this.rows.filter(r => ok('year', r.year) && ok('sex', r.sex) && ok('user', r.user) && ok('age', r.age));
  },
  sum: (rows, f = 'hosp') => d3.sum(rows, r => r[f]),
  avgBed: rows => { const h = d3.sum(rows, r => r.hosp); return h ? d3.sum(rows, r => r.bed) / h : 0; }
};
