/* =====================================================================
   charts.js  –  the five D3 charts + tooltip + highlight helpers.
   Every chart reads the pixel size of its container and fills it, so the
   same function draws the small card version and the large zoom version.
   ===================================================================== */
(function () {
  const CONFIG = ST.CONFIG, C = CONFIG.COLORS;
  const fmt = d3.format(","), f1 = d3.format(",.1f");
  let focus = null;                                        // state currently focused (cross-highlight)

  // ---- tooltip: one shared element; every tooltip ends with a "click to ..." hint ----
  const tip = d3.select("body").append("div").attr("class", "st-tooltip").attr("role", "tooltip");
  const moveTip = e => tip.style("left", Math.min(e.clientX + 14, innerWidth - 250) + "px").style("top", Math.min(e.clientY + 14, innerHeight - 130) + "px");
  const showTip = (e, html) => { tip.html(html).style("opacity", 1); moveTip(e); };
  const hideTip = () => tip.style("opacity", 0);
  const hint = t => `<div class="st-hint">${t}</div>`;

  // ---- helpers ----
  const isRate = ui => ui.measure === "rate";
  const isAllYears = ui => ui.year === "ALL";
  const val = (D, ui, s, y) => isRate(ui) ? D.rate[s][y] : D.totals[s][y];     // value shown in tiles
  const fv = (ui, v) => isRate(ui) ? f1(v) : fmt(v);
  const unit = ui => isRate(ui) ? " per 100,000" : " cases";
  const pctF = v => (v >= 0 ? "+" : "") + (v * 100).toFixed(1) + "%";           // fraction -> text
  const pctP = v => (v >= 0 ? "+" : "") + v.toFixed(1) + "%";                   // percent -> text
  const svgIn = (el, label) => {                           // empty the container, add an SVG exactly as big as it
    const n = d3.select(el).node(), w = n.clientWidth, h = n.clientHeight;
    const svg = d3.select(el).html("").append("svg").attr("width", w).attr("height", h)
      .attr("viewBox", `0 0 ${w} ${h}`).attr("role", "img").attr("aria-label", label);
    return { svg, w, h };
  };
  // Fade everything except the chosen state (hover wins over the clicked focus)
  const dim = hover => { const t = hover || focus;
    d3.selectAll(".st-page [data-s]").style("opacity", function () { return !t || this.dataset.s === t ? 1 : 0.22; }); };
  // Hover tooltip + cross-highlight (+ optional click) for an element that belongs to state `s`
  const hook = (sel, s, html, onClick) => {
    sel.attr("data-s", s)
      .on("mouseover", e => { dim(s); showTip(e, typeof html === "function" ? html(e) : html); })
      .on("mousemove", e => { if (typeof html === "function") tip.html(html(e)); moveTip(e); })
      .on("mouseout", () => { dim(null); hideTip(); });
    if (onClick) sel.style("cursor", "pointer").on("click", onClick);
    return sel;
  };

  /* ---------- Graph 1: one small line chart per state (a row; the zoom view uses a map layout) ---------- */
  function tiles(el, D, ui, onPick, zoom) {
    const { svg, w, h } = svgIn(el, "Small line charts of hospitalisations for each state and territory");
    if (w < 160 || h < 50) return;
    const allY = isAllYears(ui), n = D.states.length, last = D.years.length - 1;
    const yi = allY ? -1 : D.years.indexOf(ui.year);
    const cols = zoom ? 4 : n, rows = zoom ? 3 : 1, gp = zoom ? 10 : 6, px = zoom ? 14 : 8;
    const tw = (w - (cols - 1) * gp) / cols, th = (h - (rows - 1) * gp) / rows;
    D.states.forEach((s, i) => {
      const [col, row] = zoom ? CONFIG.TILES[s] : [i, 0], v = D.years.map(y => val(D, ui, s, y));
      const headVal = allY ? val(D, ui, s, "ALL") : v[yi];
      const x = d3.scaleLinear([0, last], [px, tw - px]);
      const top = zoom ? 54 : 25, bot = th - (zoom ? 48 : 15);     // zoom leaves room above/below the line for the high/low labels
      const y = d3.scaleLinear(d3.extent(v), [bot, top]);               // own scale per state
      const ariaVal = allY
        ? `${fv(ui, headVal)}${isRate(ui) ? " average annual rate" : " total cases"} across ${D.years[0]}–${D.years[last]}`
        : `${fv(ui, v[yi])}${unit(ui)} in ${ui.year}`;
      const g = svg.append("g").attr("class", "tile").attr("transform", `translate(${col * (tw + gp)},${row * (th + gp)})`)
        .attr("tabindex", 0).attr("role", "button").attr("aria-pressed", ui.state === s)
        .attr("aria-label", `${D.names[s]}: ${ariaVal}. Press Enter to filter by this state.`)
        .on("click", () => onPick(s))
        .on("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(s); } });
      g.append("rect").attr("class", "bg").attr("width", tw).attr("height", th).attr("rx", 10)
        .attr("fill", C.tile).attr("stroke", ui.state === s ? C.blue : "none").attr("stroke-width", 2.5);
      const b = CONFIG.BREAKS[s];                                       // grey band = break in series
      if (b) { const k = D.years.indexOf(b);
        g.append("rect").attr("x", x(k)).attr("y", top - 4).attr("width", x(last) - x(k) + px).attr("height", Math.max(0, bot - top + 8)).attr("fill", C.band); }
      g.append("path").datum(v).attr("fill", "none").attr("stroke", C.navy).attr("stroke-width", zoom ? 2.5 : 2)
        .attr("d", d3.line().x((_, k) => x(k)).y(y));
      if (!allY && yi >= 0) {
        g.append("circle").attr("cx", x(yi)).attr("cy", y(v[yi])).attr("r", zoom ? 6 : 4).attr("fill", C.orange);
      }
      if (zoom) [[d3.maxIndex(v), -11], [d3.minIndex(v), 19]].forEach(([k, dy]) => {   // zoom view: label highest and lowest year
        if (!allY && k === yi) return;
        const pxk = x(k), ty = Math.max(40, Math.min(th - 27, y(v[k]) + dy));
        g.append("circle").attr("cx", pxk).attr("cy", y(v[k])).attr("r", 3).attr("fill", C.navy);
        g.append("text").attr("class", "mut").attr("x", pxk).attr("y", ty)
          .attr("text-anchor", pxk < 34 ? "start" : pxk > tw - 34 ? "end" : "middle").text(fv(ui, v[k]));
      });
      g.append("text").attr("x", px).attr("y", zoom ? 22 : 15).style("font-weight", 700).text(s);
      g.append("text").attr("class", "mut").attr("x", tw - px).attr("y", zoom ? 22 : 15).attr("text-anchor", "end").text(fv(ui, headVal));
      g.append("text").attr("class", "mut").attr("x", px).attr("y", th - 5).text(D.years[0]);
      g.append("text").attr("class", "mut").attr("x", tw - px).attr("y", th - 5).attr("text-anchor", "end").text(D.years[last]);
      const tipHtml = allY
        ? `<b>${D.names[s]}</b><br>${D.years[0]}–${D.years[last]} ${isRate(ui) ? "avg annual rate" : "total"}: <b>${fv(ui, headVal)}</b>${unit(ui)}<br>${D.years[0]}: ${fv(ui, v[0])}${unit(ui)} · ${D.years[last]}: ${fv(ui, v[last])}${unit(ui)}<br>Change: ${pctF(v[last] / v[0] - 1)}${hint("Click to filter by this state")}`
        : `<b>${D.names[s]}</b><br>${D.years[0]}: ${fv(ui, v[0])}${unit(ui)}<br>${ui.year}: ${fv(ui, v[yi])}${unit(ui)}<br>Change: ${pctF(v[yi] / v[0] - 1)}${hint("Click to filter by this state")}`;
      hook(g, s, tipHtml);
    });
    if (zoom) {                                                          // legend in the empty bottom-left corner of the map
      const lg = svg.append("g").attr("transform", `translate(10,${2 * (th + gp) + 30})`);
      lg.append("line").attr("x2", 20).attr("stroke", C.navy).attr("stroke-width", 2.2);
      lg.append("text").attr("class", "mut").attr("x", 28).attr("y", 4).text(isRate(ui) ? "Hospitalisations per 100,000 people" : "Hospitalisations per year");
      let nextY = 24;
      if (!allY) {
        lg.append("circle").attr("cx", 10).attr("cy", nextY).attr("r", 5).attr("fill", C.orange);
        lg.append("text").attr("class", "mut").attr("x", 28).attr("y", nextY + 4).text("Selected year");
        nextY += 18;
      }
      lg.append("rect").attr("y", nextY).attr("width", 20).attr("height", 10).attr("fill", C.band);
      lg.append("text").attr("class", "mut").attr("x", 28).attr("y", nextY + 9).text("Break in series: " + Object.entries(CONFIG.BREAKS).map(([s, y]) => `${s} from ${y}`).join(", "));
      lg.append("text").attr("class", "mut").attr("y", nextY + 34).text("Each tile has its own scale.");
    }
  }

  /* ---------- Graph 2: line chart of the % change since the first year ---------- */
  function line(el, D, ui, cb, zoom) {
    const { svg, w, h } = svgIn(el, "Line chart of the percentage change in hospitalisations since " + D.years[0] + " for each state");
    if (w < 220 || h < 110) return;
    const allY = isAllYears(ui);
    const m = { l: 40, r: zoom ? 46 : 36, t: 10, b: zoom ? 24 : 18 }, last = D.years.length - 1, k = isRate(ui) ? "rate" : "cases";
    const P = (s, yr) => D.pct[s][yr][k];
    const all = D.states.flatMap(s => D.years.map(yr => P(s, yr)));
    const x = d3.scaleLinear([D.years[0], D.years[last]], [m.l, w - m.r]);
    const y = d3.scaleLinear([Math.min(0, d3.min(all)), Math.max(0, d3.max(all))], [h - m.b, m.t]).nice();
    y.ticks(zoom ? 6 : 4).forEach(t => {                                  // gridlines + % labels
      svg.append("line").attr("x1", m.l).attr("x2", w - m.r).attr("y1", y(t)).attr("y2", y(t)).attr("stroke", t === 0 ? "#94A3B8" : "#E2E8F0");
      svg.append("text").attr("class", "mut").attr("x", m.l - 6).attr("y", y(t)).attr("dy", "0.35em").attr("text-anchor", "end").text((t > 0 ? "+" : "") + t + "%");
    });
    D.years.forEach((yr, i) => { if (zoom || i % 2 === 0) svg.append("text").attr("class", "mut").attr("x", x(yr)).attr("y", h - 4).attr("text-anchor", "middle").text(yr); });
    const bw = (x(D.years[last]) - x(D.years[0])) / last;                // one invisible band per year: hover for the year, click to highlight it
    D.years.forEach(yr => {
      const base = !allY && yr === ui.year ? "rgba(48,112,173,.13)" : "rgba(0,0,0,0)";
      const band = svg.append("rect").attr("x", x(yr) - bw / 2).attr("y", m.t).attr("width", bw).attr("height", h - m.t - m.b).attr("fill", base).style("cursor", "pointer")
        .on("mouseover", e => {
          band.attr("fill", "rgba(48,112,173,.2)");
          const v = D.states.map(s => [s, P(s, yr)]).sort((a, b) => b[1] - a[1]);
          showTip(e, `<b>${yr}</b><br>Highest: ${v[0][0]} ${pctP(v[0][1])}<br>Lowest: ${v[v.length - 1][0]} ${pctP(v[v.length - 1][1])}${hint("Click to highlight the year / click again for all years")}`);
        })
        .on("mousemove", moveTip).on("mouseout", () => { band.attr("fill", base); hideTip(); })
        .on("click", () => cb.pickYear(yr));
    });
    if (!allY) {
      svg.append("line").attr("x1", x(ui.year)).attr("x2", x(ui.year)).attr("y1", m.t).attr("y2", h - m.b).attr("stroke", C.navy).attr("stroke-dasharray", "3 3").attr("pointer-events", "none");
    }
    const ys = D.states.map((s, i) => ({ i, y: y(P(s, D.years[last])) })).sort((a, b) => a.y - b.y);
    ys.forEach((d, i) => { if (i) d.y = Math.max(d.y, ys[i - 1].y + (zoom ? 15 : 12)); });   // nudge end labels apart
    D.states.forEach((s, i) => {
      const col = P(s, D.years[last]) >= 0 ? C.orange : C.blue, g = svg.append("g");
      g.append("path").datum(D.years).attr("fill", "none").attr("stroke", col).attr("stroke-width", zoom ? 2.8 : 2.2)
        .attr("d", d3.line().x(yr => x(yr)).y(yr => y(P(s, yr))));
      g.append("path").datum(D.years).attr("fill", "none").attr("stroke", "rgba(0,0,0,0)").attr("stroke-width", 12)   // wide invisible line = easy to hover
        .attr("d", d3.line().x(yr => x(yr)).y(yr => y(P(s, yr)))).attr("pointer-events", "stroke");
      if (!allY) {
        g.append("circle").attr("cx", x(ui.year)).attr("cy", y(P(s, ui.year))).attr("r", 3.8).attr("fill", col).attr("pointer-events", "none");
      }
      g.append("text").attr("x", x(D.years[last]) + 6).attr("y", ys.find(d => d.i === i).y).attr("dy", "0.35em").style("font-weight", ui.state === s ? 800 : 500).text(s);
      hook(g, s, e => {
        const yr = D.years[Math.max(0, Math.min(last, Math.round(x.invert(d3.pointer(e, svg.node())[0]) - D.years[0])))];
        return `<b>${D.names[s]}</b><br>${yr}: ${pctP(P(s, yr))} since ${D.years[0]}${hint("Click to filter by this state")}`;
      }, e => { e.stopPropagation(); cb.pickState(s); });
    });
  }

  /* ---------- Graph 3: horizontal 100% stacked bars (always shares); groups depend on the switch ---------- */
  function mix(el, D, ui, onPick, zoom) {
    const B = CONFIG.BREAKDOWNS[ui.breakdown], data = D.mix[B.file];
    const { svg, w, h } = svgIn(el, `Stacked bars: ${B.title}`);
    if (w < 150 || h < 100) return;
    const allY = isAllYears(ui), rateLabel = allY ? "Average annual rate" : "Rate";
    const top = 24, rh = Math.min(zoom ? 50 : 40, (h - top - 2) / D.states.length), bh = rh - (zoom ? 11 : 7);
    const x = d3.scaleLinear([0, 1], [40, w - 6]), step = (w - 40) / B.groups.length;
    B.groups.forEach((g, j) => {                                         // legend
      svg.append("rect").attr("x", 40 + j * step).attr("y", 3).attr("width", 10).attr("height", 10).attr("rx", 2).attr("fill", B.colors[j]);
      svg.append("text").attr("class", "mut").attr("x", 54 + j * step).attr("y", 12).text(B.labels[j]);
    });
    D.states.forEach((s, i) => {
      const cells = B.groups.map(g => data[s][ui.year][g] || { cases: 0, rate: 0 }), tot = d3.sum(cells, d => d.cases), y = top + i * rh;
      let a = 0;
      hook(svg.append("text").attr("x", 0).attr("y", y + bh / 2 + 4).style("font-weight", ui.state === s ? 800 : 500).text(s), s,
           `<b>${D.names[s]}</b>${hint("Click to filter by this state")}`, () => onPick(s));
      cells.forEach((c, j) => {
        const sw = x(c.cases / tot) - x(0), share = c.cases / tot * 100;
        hook(svg.append("rect").attr("x", x(a / tot)).attr("y", y).attr("width", Math.max(0, sw - 1)).attr("height", bh).attr("rx", 3).attr("fill", B.colors[j]),
             s, `<b>${D.names[s]}</b> · ${B.groups[j]}<br>${isRate(ui) ? `${rateLabel}: <b>${f1(c.rate)}</b> per 100,000` : `Cases: <b>${fmt(c.cases)}</b>`}<br>Share: <b>${share.toFixed(1)}%</b>${hint("Click to filter by this state")}`, () => onPick(s));
        if ((zoom || ui.state === s) && sw > 30)                         // % labels: all rows in zoom, else focused state only
          svg.append("text").attr("data-s", s).attr("x", x(a / tot) + sw / 2).attr("y", y + bh / 2 + 4).attr("text-anchor", "middle").attr("pointer-events", "none")
            .style("fill", d3.lab(B.colors[j]).l > 62 ? "#1E293B" : "#fff").style("font-size", "10px").text(Math.round(share) + "%");
        a += c.cases;
      });
    });
  }

  /* ---------- Graph 4: age group x year heatmap + Total column (cases only; hatched = withheld small counts) ---------- */
  function heat(el, D, ui, cb, zoom) {
    const { svg, w, h } = svgIn(el, "Heatmap of hospitalisations by age group and year");
    if (w < 200 || h < 90) return;
    const allY = isAllYears(ui), A = D.ageGroups, Y = D.years, inc = ui.state ? [ui.state] : D.states;
    const cell = (a, yr) => ({ v: d3.sum(inc, s => D.age[s]?.[yr]?.[a]?.cases || 0), np: !!ui.state && D.age[ui.state]?.[yr]?.[a]?.withheld });   // hatch only for a single state (the small withheld counts are negligible in the all-states total)
    const totCell = a => ({ v: d3.sum(Y, yr => cell(a, yr).v), np: !!ui.state && Y.some(yr => cell(a, yr).np) });
    const max = d3.max(A.flatMap(a => Y.map(yr => cell(a, yr).v))) || 1;
    const maxTot = d3.max(A.map(a => totCell(a).v)) || 1;
    const color = d3.scaleSequential(d3.interpolateRgbBasis(CONFIG.HEAT)).domain([0, max]);
    const totColor = d3.scaleSequential(d3.interpolateRgbBasis(CONFIG.HEAT)).domain([0, maxTot]);
    const lw = 40, th = 16, gp = 2, totGap = 6;
    const cw = (w - lw - totGap) / (Y.length + 1), ch = (h - th) / A.length;
    const totX = lw + Y.length * cw + totGap;

    svg.append("defs").append("pattern").attr("id", "st-hatch").attr("width", 6).attr("height", 6).attr("patternUnits", "userSpaceOnUse").attr("patternTransform", "rotate(45)")
      .append("rect").attr("width", 3).attr("height", 6).attr("fill", "rgba(30,41,59,.38)");

    Y.forEach((yr, j) => svg.append("text").attr("class", "mut").attr("x", lw + j * cw + cw / 2).attr("y", 11).attr("text-anchor", "middle")
      .style("font-weight", !allY && yr === ui.year ? 800 : 400)
      .text(cw >= 34 ? yr : "’" + String(yr).slice(2)));

    const totHead = svg.append("text").attr("class", "mut").attr("x", totX + cw / 2).attr("y", 11).attr("text-anchor", "middle")
      .style("font-weight", 700).text("Total");
    if (!allY) totHead.style("cursor", "pointer").on("click", () => cb.pickYear(ui.year));

    A.forEach((a, i) => {
      svg.append("text").attr("class", "mut").attr("x", lw - 6).attr("y", th + i * ch + ch / 2).attr("dy", "0.35em").attr("text-anchor", "end").text(a);
      Y.forEach((yr, j) => {
        const c = cell(a, yr), g = svg.append("g").style("cursor", "pointer").on("click", () => cb.pickYear(yr))
          .on("mouseover", e => showTip(e, `<b>${a}</b> · ${yr}<br>Cases: <b>${fmt(c.v)}</b>${c.np ? "<br><i>Includes withheld small counts (n.p.)</i>" : ""}<br>${ui.state ? D.names[ui.state] : "All states"}${hint("Click to highlight the year / click again for all years")}`))
          .on("mousemove", moveTip).on("mouseout", hideTip);
        g.append("rect").attr("x", lw + j * cw + gp / 2).attr("y", th + i * ch + gp / 2).attr("width", cw - gp).attr("height", ch - gp).attr("rx", 3).attr("fill", color(c.v));
        if (c.np) g.append("rect").attr("x", lw + j * cw + gp / 2).attr("y", th + i * ch + gp / 2).attr("width", cw - gp).attr("height", ch - gp).attr("rx", 3).attr("fill", "url(#st-hatch)");
      });

      // Total column (all 11 years combined)
      const tc = totCell(a), tg = svg.append("g")
        .on("mouseover", e => showTip(e, `<b>${a}</b> · All years (${Y[0]}–${Y.at(-1)})<br>Total cases: <b>${fmt(tc.v)}</b>${tc.np ? "<br><i>Includes withheld small counts (n.p.)</i>" : ""}<br>${ui.state ? D.names[ui.state] : "All states"}${!allY ? hint("Click to return to all years") : ""}`))
        .on("mousemove", moveTip).on("mouseout", hideTip);
      if (!allY) tg.style("cursor", "pointer").on("click", () => cb.pickYear(ui.year));
      tg.append("rect").attr("x", totX + gp / 2).attr("y", th + i * ch + gp / 2).attr("width", cw - gp).attr("height", ch - gp).attr("rx", 3).attr("fill", totColor(tc.v));
      if (tc.np) tg.append("rect").attr("x", totX + gp / 2).attr("y", th + i * ch + gp / 2).attr("width", cw - gp).attr("height", ch - gp).attr("rx", 3).attr("fill", "url(#st-hatch)");
      if (cw >= 30 && ch >= 13) {
        const lbl = (zoom || cw >= 48) ? fmt(tc.v) : (tc.v >= 10000 ? Math.round(tc.v / 1000) + "k" : fmt(tc.v));
        tg.append("text").attr("x", totX + cw / 2).attr("y", th + i * ch + ch / 2).attr("dy", "0.35em").attr("text-anchor", "middle")
          .style("font-size", zoom ? "11.5px" : "9px").style("font-weight", 700)
          .style("fill", tc.v / maxTot > 0.5 ? "#fff" : "#1E293B").attr("pointer-events", "none").text(lbl);
      }
    });

    const j = allY ? -1 : Y.indexOf(ui.year);                            // outline the selected year's column
    if (j >= 0) {
      svg.append("rect").attr("x", lw + j * cw).attr("y", th).attr("width", cw).attr("height", ch * A.length).attr("fill", "none").attr("stroke", C.navy).attr("stroke-width", 2).attr("rx", 3).attr("pointer-events", "none");
    }
  }

  /* ---------- Graph 5: butterfly chart, female (left) vs male (right), one row per state ---------- */
  function sex(el, D, ui, onPick, zoom) {
    const { svg, w, h } = svgIn(el, "Butterfly chart of hospitalisations by sex for each state");
    if (w < 200 || h < 100) return;
    const allY = isAllYears(ui), rateLabel = allY ? "Average annual rate" : "Rate";
    const S = CONFIG.SEX, key = isRate(ui) ? "rate" : "cases", top = 22, rh = Math.min(zoom ? 50 : 40, (h - top - 2) / D.states.length), bh = rh - (zoom ? 11 : 7);
    const cx = w / 2, gap = 20, half = cx - gap - 4, labelRoom = zoom ? 52 : 40;
    const max = d3.max(D.states.flatMap(s => ["Female", "Male"].map(g => D.sex[s][ui.year][g][key]))) || 1;
    const len = d3.scaleLinear([0, max], [0, half - labelRoom]);
    svg.append("rect").attr("x", cx - gap - 90).attr("y", 3).attr("width", 10).attr("height", 10).attr("rx", 2).attr("fill", S.Female);
    svg.append("text").attr("class", "mut").attr("x", cx - gap - 76).attr("y", 12).text("Female");
    svg.append("rect").attr("x", cx + gap + 30).attr("y", 3).attr("width", 10).attr("height", 10).attr("rx", 2).attr("fill", S.Male);
    svg.append("text").attr("class", "mut").attr("x", cx + gap + 44).attr("y", 12).text("Male");
    D.states.forEach((s, i) => {
      const y = top + i * rh, f = D.sex[s][ui.year].Female, m = D.sex[s][ui.year].Male, tot = f.cases + m.cases;
      const tipFor = (who, d) => `<b>${D.names[s]}</b> · ${who}<br>Cases: <b>${fmt(d.cases)}</b> (${(d.cases / tot * 100).toFixed(0)}% of cases)<br>${rateLabel}: <b>${f1(d.rate)}</b> per 100,000${hint("Click to filter by this state")}`;
      hook(svg.append("text").attr("x", cx).attr("y", y + bh / 2 + 4).attr("text-anchor", "middle").style("font-weight", ui.state === s ? 800 : 500).text(s), s, `<b>${D.names[s]}</b>${hint("Click to filter by this state")}`, () => onPick(s));
      [["Female", f, -1], ["Male", m, 1]].forEach(([who, d, dir]) => {
        const v = d[key], L = len(v), x0 = dir < 0 ? cx - gap - L : cx + gap;
        hook(svg.append("rect").attr("x", x0).attr("y", y).attr("width", Math.max(0, L)).attr("height", bh).attr("rx", 3).attr("fill", S[who]), s, tipFor(who, d), () => onPick(s));
        svg.append("text").attr("data-s", s).attr("class", "mut").attr("x", dir < 0 ? x0 - 4 : x0 + L + 4).attr("y", y + bh / 2 + 4).attr("text-anchor", dir < 0 ? "end" : "start").attr("pointer-events", "none")
          .text(isRate(ui) ? f1(v) : fmt(v));
      });
    });
  }

  ST.Charts = { tiles, line, mix, heat, sex, hideTip, setFocus: s => { focus = s; dim(null); } };
})();