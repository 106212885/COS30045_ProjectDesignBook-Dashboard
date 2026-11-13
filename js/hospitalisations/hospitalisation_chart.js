
const Charts = { mode: { bed: 'age' } };
const short = n => n === 'Other road user / animal / train' ? 'Other road user/animal' : n;
/* Text/size scale: 1 on the page, larger in the expanded (modal) view */
const fs = n => (n * UI.k) + 'px';
const M = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v * UI.k]));
const hi = (st, k, v) => st[k] === 'ALL' || st[k] === v;   // is value v active under filter k?

/* 1. SANKEY: road user -> crash type (counterparty) -> remoteness of residence */
Charts.sankey = (el, rows, st, act) => {
  const { svg, w, h } = UI.svg(el, 'Sankey diagram: road user to crash type to remoteness of residence');
  const total = Data.sum(rows);
  if (!total) { UI.empty(svg, w, h); return 'No cases match the current filters.'; }
  const l1 = d3.rollup(rows, v => Data.sum(v), r => r.user, r => r.cp);
  const l2 = d3.rollup(rows, v => Data.sum(v), r => r.cp, r => r.rem);
  const nodes = [], links = [];
  CFG.USERS.filter(u => l1.has(u)).forEach(u => nodes.push({ id: 'u|' + u, name: u, col: CFG.USER_COL[u], kind: 'user' }));
  CFG.CPS.filter(c => l2.has(c)).forEach(c => nodes.push({ id: 'c|' + c, name: c, col: CFG.CP_COL[c], kind: 'cp' }));
  CFG.REMOTE.filter(m => rows.some(r => r.rem === m)).forEach(m => nodes.push({ id: 'r|' + m, name: m, col: CFG.REMOTE_COL, kind: 'rem' }));
  l1.forEach((m, u) => m.forEach((v, c) => links.push({ source: 'u|' + u, target: 'c|' + c, value: v, col: CFG.USER_COL[u] })));
  l2.forEach((m, c) => m.forEach((v, r) => links.push({ source: 'c|' + c, target: 'r|' + r, value: v, col: CFG.CP_COL[c] })));

  const narrow = w < 620, ml = (narrow ? 74 : 104) * UI.k, mr = (narrow ? 70 : 84) * UI.k;
  const ulabel = n => narrow ? CFG.USER_SHORT[n] : n;
  const g = d3.sankey().nodeId(d => d.id).nodeWidth(14 * UI.k).nodePadding(12 * UI.k).nodeSort(null)
    .extent([[ml, 22 * UI.k], [w - mr, h - 6]])({ nodes, links });

  const link = svg.append('g').attr('fill', 'none').selectAll('path').data(g.links).join('path')
    .attr('d', d3.sankeyLinkHorizontal()).attr('stroke', d => d.col)
    .attr('stroke-width', d => Math.max(1, d.width)).attr('stroke-opacity', .4)
    .on('mousemove', (e, d) => UI.showTip(e, `<b>${short(d.source.name)} → ${short(d.target.name)}</b><br>${UI.fmt(d.value)} cases (${UI.pct(d.value / total)} of selection)`))
    .on('mouseleave', UI.hideTip.bind(UI));

  const focus = n => link.attr('stroke-opacity', d => !n ? .4 : (d.source === n || d.target === n ? .75 : .08));
  const node = svg.append('g').selectAll('g').data(g.nodes).join('g')
    .attr('class', d => d.kind === 'user' ? 'clickable' : null)
    .attr('tabindex', d => d.kind === 'user' ? 0 : null).attr('role', d => d.kind === 'user' ? 'button' : null)
    .attr('aria-label', d => `${d.name}: ${UI.fmt(d.value)} cases`)
    .on('mouseenter', (e, d) => focus(d)).on('mouseleave', () => { focus(null); UI.hideTip(); })
    .on('focus', (e, d) => focus(d)).on('blur', () => focus(null))
    .on('mousemove', (e, d) => UI.showTip(e, `<b>${d.name}</b><br>${UI.fmt(d.value)} cases (${UI.pct(d.value / total)})` + (d.kind === 'user' ? '<br><i>Click to filter</i>' : '')))
    .on('click', (e, d) => d.kind === 'user' && act.toggle('user', d.name))
    .on('keydown', (e, d) => { if (e.key === 'Enter' && d.kind === 'user') act.toggle('user', d.name); });
  node.append('rect').attr('x', d => d.x0).attr('y', d => d.y0).attr('width', d => d.x1 - d.x0)
    .attr('height', d => Math.max(2, d.y1 - d.y0)).attr('fill', d => d.col).attr('rx', 2);
  node.append('text').attr('class', 'halo').style('font-size', fs(11)).style('font-weight', 600)
    .attr('y', d => (d.y0 + d.y1) / 2).attr('dy', '.35em')
    .attr('x', d => d.kind === 'user' ? d.x0 - 7 * UI.k : d.x1 + 7 * UI.k).attr('text-anchor', d => d.kind === 'user' ? 'end' : 'start')
    .text(d => d.kind === 'user' ? ulabel(d.name) : short(d.name));
  // column headings
  [['Road user', ml], ['Crash type', (w - mr + ml) / 2], ['Residence', w - mr]].forEach(([t, x], i) =>
    svg.append('text').attr('x', x)  .attr('y', 11 * UI.k).attr('text-anchor', i === 0 ? 'start' : i === 1 ? 'middle' : 'end')
      .style('font-size', fs(10)).style('font-weight', 700).text(t));

  const ut = [...l1].map(([u, m]) => [u, d3.sum(m.values())]).sort((a, b) => b[1] - a[1])[0];
  const tc = [...l1.get(ut[0])].sort((a, b) => b[1] - a[1])[0];
  return `${ut[0]} are ${UI.pct(ut[1] / total)} of cases; ${UI.pct(tc[1] / ut[1])} of them involve ${short(tc[0]).toLowerCase()}.`;
};

/* 2. MARIMEKKO: column width = cases in age group, stacked share = road user mix */
Charts.meki = (el, rows, st, act) => {
  rows = rows.filter(r => r.age !== 'Unknown');
  const { svg, w, h } = UI.svg(el, 'Marimekko chart: road user mix within each age group, column width proportional to cases');
  const total = Data.sum(rows);
  if (!total) { UI.empty(svg, w, h); return 'No cases match the current filters.'; }
  const m = M({ t: 6, r: 4, b: 26, l: 36 }), iw = w - m.l - m.r, ih = h - m.t - m.b, gap = 3;
  const byAge = d3.rollup(rows, v => Data.sum(v), r => r.age);
  const byAU = d3.rollup(rows, v => Data.sum(v), r => r.age, r => r.user);
  const ages = CFG.AGES.filter(a => byAge.get(a) > 0), usable = iw - gap * (ages.length - 1);
  const y = d3.scaleLinear([0, 1], [ih, 0]);
  const g = svg.append('g').attr('transform', `translate(${m.l},${m.t})`);
  g.append('g').call(UI.styleAxis).call(d3.axisLeft(y).tickValues([0, .25, .5, .75, 1]).tickFormat(d3.format('.0%')).tickSize(-iw)).select('.domain').remove();
  g.selectAll('.tick line').attr('stroke', '#EDF1F6');
  let x = 0; const segs = [];
  ages.forEach(a => {
    const cw = byAge.get(a) / total * usable; let acc = 0;
    CFG.USERS.forEach(u => {
      const v = byAU.get(a).get(u) || 0; if (!v) return;
      const f = v / byAge.get(a); segs.push({ a, u, v, f, x, cw, y0: acc, y1: acc + f, n: byAge.get(a) }); acc += f;
    });
    g.append('text').attr('x', x + cw / 2).attr('y', ih + 15 * UI.k).attr('text-anchor', 'middle').style('font-size', fs(10)).style('font-weight', 600).text(a);
    x += cw + gap;
  });
  const sg = g.selectAll('g.s').data(segs).join('g').attr('class', 's clickable').attr('tabindex', 0).attr('role', 'button')
    .attr('aria-label', d => `${d.u}, age ${d.a}: ${UI.pct(d.f)} of age group`)
    .attr('opacity', d => hi(st, 'age', d.a) && hi(st, 'user', d.u) ? 1 : .3)
    .on('mousemove', (e, d) => UI.showTip(e, `<b>${d.u}</b>, age ${d.a}<br>${UI.fmt(d.v)} cases<br>${UI.pct(d.f)} of this age group<br>${UI.pct(d.v / total)} of all cases<br><i>Click to filter</i>`))
    .on('mouseleave', UI.hideTip.bind(UI))
    .on('click', (e, d) => (st.user === d.u && st.age === d.a) ? act.set({ user: 'ALL', age: 'ALL' }) : act.set({ user: d.u, age: d.a }))
    .on('keydown', (e, d) => { if (e.key === 'Enter') act.set({ user: d.u, age: d.a }); });
  sg.append('rect').attr('x', d => d.x).attr('width', d => Math.max(0, d.cw)).attr('y', d => y(d.y1))
    .attr('height', d => y(d.y0) - y(d.y1)).attr('fill', d => CFG.USER_COL[d.u]).attr('stroke', '#fff').attr('stroke-width', 1);
  sg.filter(d => d.cw >= 28 && y(d.y0) - y(d.y1) >= 15).append('text').attr('x', d => d.x + d.cw / 2)
    .attr('y', d => (y(d.y0) + y(d.y1)) / 2).attr('dy', '.35em').attr('text-anchor', 'middle').style('font-size', fs(10))
    .style('font-weight', 700).style('pointer-events', 'none').style('fill', d => UI.txtCol(CFG.USER_COL[d.u])).text(d => Math.round(d.f * 100) + '%');

  const peak = u => ages.map(a => [a, (byAU.get(a).get(u) || 0) / byAge.get(a)]).sort((p, q) => q[1] - p[1])[0];
  const c = peak('Pedal cyclist'), p = peak('Pedestrian');
  return `Cyclists peak at age ${c[0]} (${UI.pct(c[1])} of that group); pedestrians peak at ${p[0]} (${UI.pct(p[1])}).`;
};

/* 3. DONUT: share of cases by crash type (counterparty) */
Charts.donut = (el, rows, st, act) => {
  const { svg, w, h } = UI.svg(el, 'Donut chart of crash type distribution');
  const roll = d3.rollup(rows, v => Data.sum(v), r => r.cp), total = Data.sum(rows);
  const data = CFG.CPS.map(c => ({ c, v: roll.get(c) || 0 })).filter(d => d.v > 0);
  if (!total) { UI.empty(svg, w, h); return 'No cases match the current filters.'; }
  const side = w >= 460, rowH = (side ? 22 : 18) * UI.k, legH = side ? 0 : data.length * rowH + 4;
  const size = Math.min(side ? w * .5 : w, h - legH) - 8, R = size / 2;
  const cx = side ? R + 4 : w / 2, cy = (h - legH) / 2;
  const arcs = d3.pie().value(d => d.v).sort(null).padAngle(.015)(data), arc = d3.arc().innerRadius(R * .62).outerRadius(R).cornerRadius(3);
  const dimOthers = k => svg.selectAll('path.sl').style('opacity', d => !k || d.data.c === k ? 1 : .3);
  svg.append('g').attr('transform', `translate(${cx},${cy})`).selectAll('path').data(arcs).join('path').attr('class', 'sl')
    .attr('d', arc).attr('fill', d => CFG.CP_COL[d.data.c]).attr('stroke', '#fff').attr('stroke-width', 1.5)
    .on('mousemove', (e, d) => { dimOthers(d.data.c); UI.showTip(e, `<b>${d.data.c}</b><br>${UI.fmt(d.data.v)} cases (${UI.pct(d.data.v / total)})`); })
    .on('mouseleave', () => { dimOthers(null); UI.hideTip(); });
  const c = svg.append('g').attr('transform', `translate(${cx},${cy})`).style('pointer-events', 'none');
  c.append('text').attr('text-anchor', 'middle').attr('dy', '-.1em').style('font-size', Math.max(13 * UI.k, R / 5) + 'px').style('font-weight', 800).text(UI.fmt(total));
  c.append('text').attr('text-anchor', 'middle').attr('dy', '1.5em').style('font-size', fs(9)).style('font-weight', 600).text('TOTAL CASES');
  const lx = side ? cx + R + 28 : 12, lw = side ? w - lx - 8 : w - 24, ly = side ? (h - data.length * rowH) / 2 : h - legH + 6;
  const lg = svg.append('g').attr('transform', `translate(${lx},${ly})`).selectAll('g').data(data).join('g').attr('transform', (d, i) => `translate(0,${i * rowH})`)
    .on('mouseenter', (e, d) => dimOthers(d.c)).on('mouseleave', () => dimOthers(null));
  lg.append('circle').attr('r', 5 * UI.k).attr('cy', 6 * UI.k).attr('fill', d => CFG.CP_COL[d.c]);
  lg.append('text').attr('x', 12 * UI.k).attr('y', 11 * UI.k).style('font-size', fs(10.5)).text(d => short(d.c));
  lg.append('text').attr('x', lw).attr('y', 11 * UI.k).attr('text-anchor', 'end').style('font-size', fs(10.5)).style('font-weight', 700).text(d => UI.pct(d.v / total));
  const s = [...data].sort((a, b) => b.v - a.v);
  return `${s[0].c} leads at ${UI.pct(s[0].v / total)}; ${short(s[1] ? s[1].c : s[0].c).toLowerCase()} is next${s[1] ? ' (' + UI.pct(s[1].v / total) + ')' : ''}.`;
};

/* 4. BAR CHART: average bed days per case, by age group or road user */
Charts.bed = (el, rows, st, act) => {
  const dim = Charts.mode.bed, key = dim === 'age' ? 'age' : 'user';
  const { svg, w, h } = UI.svg(el, 'Bar chart of average bed days per case');
  const cats = dim === 'age' ? CFG.AGES : CFG.USERS, grp = d3.group(rows, r => r[key]);
  const data = cats.map(c => { const rr = grp.get(c) || []; return { c, n: Data.sum(rr), bed: Data.sum(rr, 'bed'), avg: Data.avgBed(rr) }; }).filter(d => d.n > 0);
  if (!data.length) { UI.empty(svg, w, h); return 'No cases match the current filters.'; }
  const m = M({ t: 16, r: 8, b: 24, l: 34 }), iw = w - m.l - m.r, ih = h - m.t - m.b;
  const x = d3.scaleBand(data.map(d => d.c), [0, iw]).padding(.3), y = d3.scaleLinear([0, d3.max(data, d => d.avg) * 1.1], [ih, 0]).nice();
  const g = svg.append('g').attr('transform', `translate(${m.l},${m.t})`);
  g.append('g').call(UI.styleAxis).call(d3.axisLeft(y).ticks(5).tickSize(-iw)).select('.domain').remove();
  g.selectAll('.tick line').attr('stroke', '#EDF1F6');
  g.append('g').call(UI.styleAxis).attr('transform', `translate(0,${ih})`).call(d3.axisBottom(x).tickSize(0).tickFormat(d => dim === 'age' ? d : CFG.USER_SHORT[d])).select('.domain').remove();
  const bars = g.selectAll('g.b').data(data).join('g').attr('class', 'b clickable').attr('opacity', d => hi(st, key, d.c) ? 1 : .35)
    .on('mousemove', (e, d) => UI.showTip(e, `<b>${dim === 'age' ? 'Age ' + d.c : d.c}</b><br>${d.avg.toFixed(1)} bed days per case<br>${UI.fmt(d.n)} cases, ${UI.fmt(d.bed)} bed days<br><i>Click to filter</i>`))
    .on('mouseleave', UI.hideTip.bind(UI)).on('click', (e, d) => act.toggle(key, d.c));
  bars.append('rect').attr('x', d => x(d.c)).attr('width', x.bandwidth()).attr('y', d => y(d.avg)).attr('height', d => ih - y(d.avg)).attr('fill', '#0072B2').attr('rx', 3);
  bars.append('text').attr('x', d => x(d.c) + x.bandwidth() / 2).attr('y', d => y(d.avg) - 5).attr('text-anchor', 'middle').style('font-size', fs(10)).style('font-weight', 700).text(d => d.avg.toFixed(1));
  g.append('text').attr('x', -m.l + 2).attr('y', -6).style('font-size', fs(9.5)).text('bed days');
  const mx = d3.greatest(data, d => d.avg);
  return `Longest stays: ${dim === 'age' ? 'age ' + mx.c : mx.c} averages ${mx.avg.toFixed(1)} bed days per case vs ${Data.avgBed(rows).toFixed(1)} overall.`;
};

/* 5. HEATMAP: month (rows) x year (columns), cases per month */
Charts.season = (el, rows, st, act) => {
  const { svg, w, h } = UI.svg(el, 'Heatmap of hospitalised cases by month and year');
  const roll = d3.rollup(rows, v => Data.sum(v), r => r.year, r => r.month);
  const cells = []; CFG.YEARS.forEach(yr => CFG.MONTHS.forEach((mo, i) => cells.push({ yr, mo, i, v: roll.get(yr)?.get(mo) || 0 })));
  const [lo, hiV] = d3.extent(cells, d => d.v);
  if (!hiV) { UI.empty(svg, w, h); return 'No cases match the current filters.'; }
  const m = M({ t: 16, r: 2, b: 2, l: 34 }), iw = w - m.l - m.r, ih = h - m.t - m.b;
  const x = d3.scaleBand(CFG.YEARS, [0, iw]).padding(.05), y = d3.scaleBand(d3.range(12), [0, ih]).padding(.08);
  const ramp = ['#EAF3FA', '#A8D3EA', '#56B4E9', '#0072B2', '#002B49'];   // light-to-dark blue, colour-blind safe
  const col = d3.scaleSequential(d3.interpolateRgbBasis(ramp)).domain([lo, hiV]);
  const g = svg.append('g').attr('transform', `translate(${m.l},${m.t})`);
  CFG.YEARS.forEach(yr => g.append('text').attr('x', x(yr) + x.bandwidth() / 2).attr('y', -5).attr('text-anchor', 'middle')
    .style('font-size', fs(10)).style('font-weight', hi(st, 'year', yr) ? 700 : 400).text(yr + (CFG.BREAKS.includes(yr) ? '†' : '')));
  CFG.MONTHS.forEach((mo, i) => g.append('text').attr('x', -6).attr('y', y(i) + y.bandwidth() / 2).attr('dy', '.35em').attr('text-anchor', 'end').style('font-size', fs(10)).style('font-weight', 600).text(mo.slice(0, 3)));
  g.selectAll('rect').data(cells).join('rect').attr('class', 'clickable').attr('x', d => x(d.yr)).attr('y', d => y(d.i))
    .attr('width', x.bandwidth()).attr('height', y.bandwidth()).attr('rx', 3).attr('fill', d => col(d.v)).attr('opacity', d => hi(st, 'year', d.yr) ? 1 : .35)
    .on('mousemove', (e, d) => UI.showTip(e, `<b>${d.mo} ${d.yr}</b><br>${UI.fmt(d.v)} cases<br><i>Click to highlight year</i>`))
    .on('mouseleave', UI.hideTip.bind(UI)).on('click', (e, d) => act.toggle('year', d.yr));
  d3.select('#legHeat').html(`<span>Low</span><span class="grad" style="background:linear-gradient(90deg,${ramp.join(',')})"></span><span>High</span>`);
  const mt = CFG.MONTHS.map((mo, i) => [mo, d3.sum(cells.filter(c => c.i === i), c => c.v)]).sort((a, b) => b[1] - a[1]), tot = d3.sum(mt, d => d[1]);
  return `${mt[0][0]} is the busiest month (${UI.pct(mt[0][1] / tot)} of cases); ${mt[11][0]} is the quietest (${UI.pct(mt[11][1] / tot)}). † = series break.`;
};
