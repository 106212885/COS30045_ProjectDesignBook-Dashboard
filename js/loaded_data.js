// Hospitalisation and First Nations data loaders.

const Data = {
  rows: [],
  async load() {
    this.rows = await d3.csv(CFG.DATA_URL, d => ({
      year: +d.year, month: d.month, age: d.age, sex: d.sex, user: d.road_user, cp: d.counterparty,
      rem: d.remoteness, hosp: +d.hosp, bed: +d.bed_days, died: +d.died
    }));
    return this.rows;
  },

  filter(st, skip = []) {
    const ok = (k, v) => skip.includes(k) || st[k] === 'ALL' || st[k] === v;
    return this.rows.filter(r => ok('year', r.year) && ok('sex', r.sex) && ok('user', r.user) && ok('age', r.age));
  },
  sum: (rows, f = 'hosp') => d3.sum(rows, r => r[f]),
  avgBed: rows => { const h = d3.sum(rows, r => r.hosp); return h ? d3.sum(rows, r => r.bed) / h : 0; }
};

const FN = {
  YEARS: d3.range(2011, 2022),
  AGES: ['0-7', '8-16', '17-25', '26-39', '40-64', '65+'],
  STATES: ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'NT', 'ACT'],
  STATE_W: { QLD: 0.32, NSW: 0.28, WA: 0.19, NT: 0.12, VIC: 0.04, SA: 0.03, TAS: 0.015, ACT: 0.005 },   // estimated weights
  USERS: ['Car driver/passenger', 'Motorcyclist', 'Pedestrian', 'Pedal cyclist', 'Pick-up truck/van', 'Heavy transport', 'Bus occupant'],
  USER_LABEL: {
    'Car driver, passenger or unknown position': 'Car driver/passenger', 'Motorcyclist': 'Motorcyclist', 'Pedestrian': 'Pedestrian',
    'Pedal cyclist': 'Pedal cyclist', 'Pick-up truck or van occupant': 'Pick-up truck/van',
    'Heavy transport driver, passenger or unknown position': 'Heavy transport', 'Bus occupant': 'Bus occupant'
  },
  total: {}, ageYear: {}, np: new Set(), userW: {}, bench: {}, records: [],

  async load() {
    const b = 'data/First Nations People/';
    const [tr, ay, ru, bm] = await Promise.all(['chart1_trend', 'chart4_age_group_year', 'chart3_road_user_2021', 'chart5_age_profile_comparison'].map(f => d3.csv(b + f + '.csv')));
    const num = v => (v === 'n.p.' ? null : +v);
    tr.forEach(d => { this.total[+d.Year] = +d.Cases; });
    this.AGES.forEach(a => { this.ageYear[a] = {}; });
    ay.forEach(d => { this.ageYear[d.Age_Group][+d.Year] = num(d.Hospitalisations); });

    // estimate suppressed age x year cells: remainder of the yearly total, split by each age's average known size
    const avg = {}; this.AGES.forEach(a => { avg[a] = d3.mean(this.YEARS.map(y => this.ageYear[a][y]).filter(v => v != null)); });
    this.YEARS.forEach(y => {
      const miss = this.AGES.filter(a => this.ageYear[a][y] == null); if (!miss.length) return;
      const rem = this.total[y] - d3.sum(this.AGES, a => this.ageYear[a][y] || 0), ws = d3.sum(miss, a => avg[a]);
      miss.forEach(a => { this.ageYear[a][y] = rem * avg[a] / ws; this.np.add(a + '|' + y); });
    });

    // road-user shares from 2021; suppressed users share the remainder equally
    const ruv = {}; ru.forEach(d => { ruv[this.USER_LABEL[d.Road_User]] = num(d.Hospitalisations); });
    const t21 = this.total[2021], miss = this.USERS.filter(u => ruv[u] == null);
    const rem = t21 - d3.sum(this.USERS.filter(u => ruv[u] != null), u => ruv[u]);
    miss.forEach(u => { ruv[u] = rem / miss.length; });
    this.USERS.forEach(u => { this.userW[u] = ruv[u] / t21; });

    bm.forEach(d => { this.bench[d.Age_Group] = { fn: +d.FirstNations_Percentage, non: +d.NonIndigenous_Percentage }; });

    this.YEARS.forEach(y => this.AGES.forEach(a => this.USERS.forEach(u => this.STATES.forEach(s =>
      this.records.push({ y, a, u, s, v: this.ageYear[a][y] * this.userW[u] * this.STATE_W[s] })))));
  },
  /** Apply filters; `skip` = filter keys a chart handles itself (highlight instead of remove). */
  filter(st, skip = []) {
    const ok = (k, v) => skip.includes(k) || st[k] === 'ALL' || st[k] === v;
    return this.records.filter(r => ok('year', r.y) && ok('user', r.u) && ok('age', r.a));
  },
  sum: rows => d3.sum(rows, r => r.v)
};
