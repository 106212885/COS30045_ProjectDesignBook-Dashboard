const FNC = {};
const fs = n => (n * UI.k) + 'px';
const M = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v * UI.k]));
const hi = (st, k, v) => st[k] === 'ALL' || st[k] === v;
const BLUE = '#3070AD', ORANGE = '#C66526';
const R0 = x => UI.fmt(Math.round(x));
const grid = (g, sc, len) => { g.selectAll('.tick line').attr('stroke', '#EDF1F6'); };


/* 1. Annual trend (line + area) */
FNC.trend = (el, rows, st, act) => {
  const { svg, w, h } = UI.svg(el, 'Line chart of First Nations hospitalisations per year');
  const byY = d3.rollup(rows, FN.sum, r => r.y), data = FN.YEARS.map(y => ({ y, v: byY.get(y) || 0 }));
  if (!d3.sum(data, d => d.v)) { UI.empty(svg, w, h); return 'No cases match the current filters.'; }
  const m = M({ t: 18, r: 14, b: 22, l: 40 }), iw = w - m.l - m.r, ih = h - m.t - m.b;
  const x = d3.scalePoint(FN.YEARS, [0, iw]).padding(.3), y = d3.scaleLinear([0, d3.max(data, d => d.v) * 1.1], [ih, 0]).nice();
  const g = svg.append('g').attr('transform', `translate(${m.l},${m.t})`);
  g.append('g').call(UI.styleAxis).call(d3.axisLeft(y).ticks(5).tickSize(-iw).tickFormat(d3.format(','))).select('.domain').remove(); grid(g);
  g.append('g').call(UI.styleAxis).attr('transform', `translate(0,${ih})`).call(d3.axisBottom(x).tickSize(0)).select('.domain').remove();
  g.append('path').datum(data).attr('fill', BLUE).attr('opacity', .12).attr('d', d3.area().x(d => x(d.y)).y0(ih).y1(d => y(d.v)).curve(d3.curveMonotoneX));
  g.append('path').datum(data).attr('fill', 'none').attr('stroke', BLUE).attr('stroke-width', 2.5).attr('d', d3.line().x(d => x(d.y)).y(d => y(d.v)).curve(d3.curveMonotoneX));
  const pt = g.selectAll('g.p').data(data).join('g').attr('class', 'p clickable').attr('tabindex', 0).attr('role', 'button')
    .attr('aria-label', d => `${d.y}: ${R0(d.v)} cases`).attr('opacity', d => hi(st, 'year', d.y) ? 1 : .4)
    .on('mousemove', (e, d) => UI.showTip(e, `<b>${d.y}</b><br>${R0(d.v)} hospitalisations<br><i>Click to highlight year</i>`))
    .on('mouseleave', UI.hideTip.bind(UI)).on('click', (e, d) => act.toggle('year', d.y))
    .on('keydown', (e, d) => { if (e.key === 'Enter') act.toggle('year', d.y); });
  pt.append('circle').attr('cx', d => x(d.y)).attr('cy', d => y(d.v)).attr('r', d => (st.year === d.y ? 7 : 4.5) * UI.k).attr('fill', BLUE).attr('stroke', '#fff').attr('stroke-width', 2);
  pt.append('text').attr('class', 'halo').attr('x', d => x(d.y)).attr('y', d => y(d.v) - 10 * UI.k).attr('text-anchor', 'middle').style('font-size', fs(9)).style('font-weight', 700).text(d => R0(d.v));
  const a = data[0], b = data[data.length - 1];
  return a.v ? `${R0(a.v)} cases in ${a.y} to ${R0(b.v)} in ${b.y}: ${b.v >= a.v ? '+' : ''}${((b.v / a.v - 1) * 100).toFixed(1)}%.` : '';
};

