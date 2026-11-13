/* 5. Dumbbell: age profile, First Nations % vs non-Indigenous % */
FNC.dumb = (el, rows, st, act) => {
  const { svg, w, h } = UI.svg(el, 'Dumbbell chart comparing age profile of First Nations and non-Indigenous hospitalisations');
  const tot = FN.sum(rows), by = d3.rollup(rows, FN.sum, r => r.a);
  if (!tot) { UI.empty(svg, w, h); return 'No cases match the current filters.'; }
  const data = FN.AGES.map(a => ({ a, fn: (by.get(a) || 0) / tot * 100, non: FN.bench[a].non }));
  const m = M({ t: 12, r: 14, b: 22, l: 40 }), iw = w - m.l - m.r, ih = h - m.t - m.b;
  const x = d3.scalePoint(FN.AGES, [0, iw]).padding(.45), y = d3.scaleLinear([0, d3.max(data, d => Math.max(d.fn, d.non)) * 1.15], [ih, 0]).nice();
  const g = svg.append('g').attr('transform', `translate(${m.l},${m.t})`);
  g.append('g').call(UI.styleAxis).call(d3.axisLeft(y).ticks(5).tickSize(-iw).tickFormat(d => d + '%')).select('.domain').remove(); grid(g);
  g.append('g').call(UI.styleAxis).attr('transform', `translate(0,${ih})`).call(d3.axisBottom(x).tickSize(0)).select('.domain').remove();
  const d = g.selectAll('g.d').data(data).join('g').attr('class', 'd clickable').attr('opacity', q => hi(st, 'age', q.a) ? 1 : .35)
    .on('mousemove', (e, q) => UI.showTip(e, `<b>Age ${q.a}</b><br>First Nations: ${q.fn.toFixed(1)}%<br>Non-Indigenous: ${q.non.toFixed(1)}%<br>Gap: ${(q.fn - q.non >= 0 ? '+' : '') + (q.fn - q.non).toFixed(1)} pts<br><i>Click to filter age group</i>`))
    .on('mouseleave', UI.hideTip.bind(UI)).on('click', (e, q) => act.toggle('age', q.a));
  d.append('line').attr('x1', q => x(q.a)).attr('x2', q => x(q.a)).attr('y1', q => y(q.fn)).attr('y2', q => y(q.non)).attr('stroke', '#B8C4D2').attr('stroke-width', 3 * UI.k);
  d.append('circle').attr('cx', q => x(q.a)).attr('cy', q => y(q.non)).attr('r', 6 * UI.k).attr('fill', ORANGE).attr('stroke', '#fff').attr('stroke-width', 2);
  d.append('circle').attr('cx', q => x(q.a)).attr('cy', q => y(q.fn)).attr('r', 6 * UI.k).attr('fill', BLUE).attr('stroke', '#fff').attr('stroke-width', 2);
  d.append('text').attr('class', 'halo').attr('x', q => x(q.a) + 11 * UI.k).attr('y', q => y(q.fn)).attr('dy', '.35em').style('font-size', fs(9)).style('font-weight', 700).text(q => q.fn.toFixed(1) + '%');
  d.append('text').attr('class', 'halo').attr('x', q => x(q.a) + 11 * UI.k).attr('y', q => y(q.non)).attr('dy', '.35em').style('font-size', fs(9)).text(q => q.non.toFixed(1) + '%');
  const mx = d3.greatest(data, q => q.fn - q.non);
  return `Largest gap: age ${mx.a} is ${mx.fn.toFixed(1)}% of First Nations cases vs ${mx.non.toFixed(1)}% non-Indigenous.`;
};
