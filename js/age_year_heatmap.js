/* 4. Heatmap: age group x year (hatched = suppressed 'n.p.', estimated) */
FNC.heat = (el, rows, st, act) => {
  const { svg, w, h } = UI.svg(el, 'Heatmap of hospitalisations by age group and year');
  const roll = d3.rollup(rows, FN.sum, r => r.a, r => r.y), cells = [];
  FN.AGES.forEach(a => FN.YEARS.forEach(y => cells.push({ a, y, v: roll.get(a)?.get(y) || 0, np: FN.np.has(a + '|' + y) })));
  const [lo, hiV] = d3.extent(cells, d => d.v);
  if (!hiV) { UI.empty(svg, w, h); return 'No cases match the current filters.'; }
  const m = M({ t: 16, r: 2, b: 2, l: 36 }), iw = w - m.l - m.r, ih = h - m.t - m.b;
  const x = d3.scaleBand(FN.YEARS, [0, iw]).padding(.05), y = d3.scaleBand(FN.AGES, [0, ih]).padding(.08);
  const ramp = ['#EAF3FA', '#A8D3EA', '#56B4E9', '#0072B2', '#002B49'], col = d3.scaleSequential(d3.interpolateRgbBasis(ramp)).domain([lo, hiV]);
  svg.append('defs').html('<pattern id="npHatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#E2E8F0"/><rect width="2.5" height="6" fill="#94A3B8"/></pattern>');
  const g = svg.append('g').attr('transform', `translate(${m.l},${m.t})`);
  FN.YEARS.forEach(yr => g.append('text').attr('x', x(yr) + x.bandwidth() / 2).attr('y', -5 * UI.k).attr('text-anchor', 'middle').style('font-size', fs(10)).style('font-weight', hi(st, 'year', yr) ? 700 : 400).text(yr));
  FN.AGES.forEach(a => g.append('text').attr('x', -6).attr('y', y(a) + y.bandwidth() / 2).attr('dy', '.35em').attr('text-anchor', 'end').style('font-size', fs(10)).style('font-weight', 600).text(a));
  const c = g.selectAll('g.c').data(cells).join('g').attr('class', 'c clickable')
    .attr('opacity', d => hi(st, 'age', d.a) && hi(st, 'year', d.y) ? 1 : .35)
    .on('mousemove', (e, d) => UI.showTip(e, `<b>${d.a}, ${d.y}</b><br>${d.np ? 'Suppressed (n.p.), estimated ≈ ' : ''}${R0(d.v)} cases<br><i>Click to filter age group</i>`))
    .on('mouseleave', UI.hideTip.bind(UI)).on('click', (e, d) => act.toggle('age', d.a));
  c.append('rect').attr('x', d => x(d.y)).attr('y', d => y(d.a)).attr('width', x.bandwidth()).attr('height', y.bandwidth()).attr('rx', 3)
    .attr('fill', d => d.np ? 'url(#npHatch)' : col(d.v));
  c.append('text').attr('x', d => x(d.y) + x.bandwidth() / 2).attr('y', d => y(d.a) + y.bandwidth() / 2).attr('dy', '.35em').attr('text-anchor', 'middle')
    .style('font-size', fs(9.5)).style('font-weight', 600).style('pointer-events', 'none')
    .style('fill', d => d.np ? '#33455A' : ((d.v - lo) / (hiV - lo || 1) > .45 ? '#fff' : '#0F2438')).text(d => (d.np ? '~' : '') + R0(d.v));
  d3.select('#legHeat').html(`<span>Low</span><span class="grad" style="background:linear-gradient(90deg,${ramp.join(',')})"></span><span>High</span><span>Hatched = n.p.</span>`);
  const pk = d3.greatest(cells, d => d.v);
  return `Peak: ${pk.a} in ${pk.y} (${R0(pk.v)} cases). Hatched cells are suppressed (n.p.) and estimated.`;
};

