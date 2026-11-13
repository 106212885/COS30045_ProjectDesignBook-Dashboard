/* Shared horizontal-bar renderer for age-group and road-user charts. */
const FN_AGE_COLORS = {
  '0-7': '#3070AD', '8-16': '#6FB2E4', '17-25': '#469C76',
  '26-39': '#DCA237', '40-64': '#C66526', '65+': '#C17DA5'
};
const FN_USER_COLORS = {
  'Car driver/passenger': '#3070AD', 'Motorcyclist': '#469C76',
  'Pedestrian': '#DCA237', 'Pedal cyclist': '#6FB2E4',
  'Pick-up truck/van': '#C66526', 'Heavy transport': '#0E2A47',
  'Bus occupant': '#C17DA5'
};
function hbar(el, rows, st, act, key, cats, left, label) {
  const stateKey = key === 'a' ? 'age' : 'user';
  const { svg, w, h } = UI.svg(el, label);
  const g0 = d3.rollup(rows, FN.sum, r => r[key]), data = cats.map(c => ({ c, v: g0.get(c) || 0 })), tot = d3.sum(data, d => d.v);
  if (!tot) { UI.empty(svg, w, h); return 'No cases match the current filters.'; }
  const m = M({ t: 6, r: 44, b: 22, l: left }), iw = w - m.l - m.r, ih = h - m.t - m.b;
  const y = d3.scaleBand(cats, [0, ih]).padding(.28), x = d3.scaleLinear([0, d3.max(data, d => d.v) * 1.05], [0, iw]).nice();
  const g = svg.append('g').attr('transform', `translate(${m.l},${m.t})`);
  g.append('g').call(UI.styleAxis).attr('transform', `translate(0,${ih})`).call(d3.axisBottom(x).ticks(5).tickSize(-ih).tickFormat(d3.format('.2s'))).select('.domain').remove(); grid(g);
  g.append('g').call(UI.styleAxis).call(d3.axisLeft(y).tickSize(0)).select('.domain').remove();
  const b = g.selectAll('g.b').data(data).join('g').attr('class', 'b clickable').attr('tabindex', 0).attr('role', 'button')
    .attr('aria-label', d => `${d.c}: ${R0(d.v)} cases`).attr('opacity', d => hi(st, stateKey, d.c) ? 1 : .35)
    .on('mousemove', (e, d) => UI.showTip(e, `<b>${d.c}</b><br>${R0(d.v)} cases (${UI.pct(d.v / tot)})<br><i>Click to filter</i>`))
    .on('mouseleave', UI.hideTip.bind(UI)).on('click', (e, d) => act.toggle(stateKey, d.c))
    .on('keydown', (e, d) => { if (e.key === 'Enter') act.toggle(stateKey, d.c); });
  b.append('rect').attr('y', d => y(d.c)).attr('height', y.bandwidth()).attr('width', d => Math.max(0, x(d.v))).attr('fill', d => key === 'a' ? FN_AGE_COLORS[d.c] : FN_USER_COLORS[d.c]).attr('rx', 3);
  b.append('text').attr('x', d => x(d.v) + 5).attr('y', d => y(d.c) + y.bandwidth() / 2).attr('dy', '.35em').style('font-size', fs(10)).style('font-weight', 700).text(d => R0(d.v));
  const top = d3.greatest(data, d => d.v);
  return `${top.c} is the largest group: ${UI.pct(top.v / tot)} of cases.`;
}
FNC.ageBar = (el, rows, st, act) => hbar(el, rows, st, act, 'a', FN.AGES, 40, 'Bar chart of hospitalisations by age group');
