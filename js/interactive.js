
const UI = {
  k: 1,   // text/size scale (1 on page, >1 in expanded view)
  fmt: d3.format(','), pct: d3.format('.1%'),
  tip: document.getElementById('tip'),
  showTip(ev, html) {
    const t = this.tip; t.innerHTML = html; t.style.opacity = 1;
    const x = Math.min(ev.clientX + 14, window.innerWidth - t.offsetWidth - 8);
    const y = Math.min(ev.clientY + 14, window.innerHeight - t.offsetHeight - 8);
    t.style.left = x + 'px'; t.style.top = y + 'px';
  },
  hideTip() { this.tip.style.opacity = 0; },
  /** Clear a container and return a fresh responsive <svg> with its pixel size. */
  svg(el, label) {
    el.innerHTML = '';
    const w = el.clientWidth, h = el.clientHeight;
    const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${w} ${h}`).attr('role', 'img').attr('aria-label', label);
    return { svg, w, h };
  },
  empty(svg, w, h) {
    svg.append('text').attr('x', w / 2).attr('y', h / 2).attr('text-anchor', 'middle').style('font-size', '12px').text('No cases for this selection');
  },
  txtCol: hex => CFG.LIGHT_FILLS.has(hex) ? '#0F2438' : '#fff',
  /** Build legend buttons. items: [{key,label,col}] */
  legend(sel, items, opt = {}) {
    const box = d3.select(sel); box.selectAll('*').remove();
    box.selectAll('button').data(items).join('button').attr('type', 'button')
      .classed('on', d => opt.isOn ? opt.isOn(d.key) : false)
      .html(d => `<i style="background:${d.col}"></i>${d.label}`)
      .on('click', (e, d) => opt.onClick && opt.onClick(d.key))
      .on('mouseenter', (e, d) => opt.onHover && opt.onHover(d.key))
      .on('mouseleave', () => opt.onHover && opt.onHover(null));
  },
  /** Axis tick text styling shared by all charts. */
  styleAxis(g) { g.attr('class', 'axis').style('font-size', (10 * UI.k) + 'px'); return g; }
};
