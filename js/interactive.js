/**
 * Initializes interaction handlers for the line chart.
 * @param {Object} chartContext - Context object containing D3 scales, selection elements, and groups.
 */
function setupInteractivity(chartContext) {
  const { svgParent, svg, width, height, x, y, nested, groups, groupTotals, paths } = chartContext;

  // ------------------------------------------------------------------------------------------------
  // BUNDLE 1: STATE PERSISTENCE & COLOR LOGIC
  // Preserves active filter selection across screen resizes and window redraws.
  // ------------------------------------------------------------------------------------------------
  if (!window.chartActiveGroups) {
      window.chartActiveGroups = new Set(groups);
  }
  const activeGroups = window.chartActiveGroups;
  
  let currentHighestGroup = "";
  let currentLowestGroup = "";

  /**
   * Applies the project's 3-Color Semiotic Rule:
   * - Vermillion (#D55E00): Dynamically denotes the highest active volume series.
   * - Emerald Green (#009E73): Dynamically denotes the lowest active volume series.
   * - Dark Charcoal (#222222): Baseline color for other active series.
   * - Light Grey (#B0B0B0): Inactive/deselected state.
   */
  function getDynamicColor(g) {
      if (!activeGroups.has(g)) return '#B0B0B0'; 
      if (g === currentHighestGroup) return '#D55E00'; 
      if (g === currentLowestGroup) return '#009E73'; 
      return '#222222'; 
  }

  // ------------------------------------------------------------------------------------------------
  // BUNDLE 2: INTERACTIVE FILTER CONTROLS & AFFORDANCE
  // Renders "Filter :" guide text and accessible filter pill buttons.
  // ------------------------------------------------------------------------------------------------
  const filterContainer = d3.select("#filter-container");
  filterContainer.append("span")
    .attr("class", "filter-guide-label")
    .text("Filter :");

  groups.forEach(group => {
    const safeId = group.replace(/\s+/g, '');
    const btn = filterContainer.append("button")
      .attr("id", `pill-${safeId}`)
      .attr("class", `filter-pill ${activeGroups.has(group) ? 'active' : ''}`)
      .attr("type", "button")
      // SPECIAL INDEX: aria-pressed informs assistive tech whether a toggle button is currently active
      .attr("aria-pressed", activeGroups.has(group))
      .on("click", function() {
        if (activeGroups.has(group)) {
          activeGroups.delete(group);
          d3.select(this).classed("active", false).attr("aria-pressed", "false");
        } else {
          activeGroups.add(group);
          d3.select(this).classed("active", true).attr("aria-pressed", "true");
        }
        updateColorsAndKPIs();
      });

    // Small color dot icon inside filter button
    btn.append("span")
      .attr("id", `pill-dot-${safeId}`)
      .attr("class", "pill-color-dot")
      .attr("aria-hidden", "true");

    btn.append("span")
      .text(group);
  });

  // ------------------------------------------------------------------------------------------------
  // BUNDLE 3: DYNAMIC KPI RECALCULATION & VISUAL ENCODING UPDATE
  // Recomputes aggregated statistics for the metric cards and updates stroke colors and opacity.
  // ------------------------------------------------------------------------------------------------
  function updateColorsAndKPIs() {
    if (activeGroups.size === 0) {
        d3.select("#kpi-total").text("0");
        d3.select("#kpi-highest-val").text("0");
        d3.select("#kpi-highest-name").text("-").style("color", "#5E5A66");
        d3.select("#kpi-lowest-val").text("0");
        d3.select("#kpi-lowest-name").text("-").style("color", "#5E5A66");
        currentHighestGroup = "";
        currentLowestGroup = "";
    } else {
        let filteredTotal = 0;
        let highest = { name: '', val: -Infinity };
        let lowest = { name: '', val: Infinity };

        activeGroups.forEach(g => {
           const gTotal = groupTotals.find(item => item.group === g).total;
           filteredTotal += gTotal;
           if (gTotal > highest.val) highest = { name: g, val: gTotal };
           if (gTotal < lowest.val) lowest = { name: g, val: gTotal };
        });

        currentHighestGroup = highest.name;
        currentLowestGroup = lowest.name;

        // Update KPI values in the DOM with thousands formatting
        d3.select("#kpi-total").text(d3.format(",")(filteredTotal));
        d3.select("#kpi-highest-val").text(d3.format(",")(highest.val));
        d3.select("#kpi-highest-name").text(highest.name).style("color", "#D55E00");
        d3.select("#kpi-lowest-val").text(d3.format(",")(lowest.val));
        d3.select("#kpi-lowest-name").text(lowest.name).style("color", "#009E73");
    }

    // Apply updated colors and opacity across paths, direct text labels, and pill controls
    groups.forEach(g => {
       const safeId = g.replace(/\s+/g, '');
       const isActive = activeGroups.has(g);
       const color = getDynamicColor(g);

       paths[g].attr("stroke", color).style("opacity", isActive ? 1 : 0.08);
       svg.selectAll(`.label-${safeId} tspan`).style("fill", color).style("opacity", isActive ? 1 : 0.15);
       svg.selectAll(`.label-${safeId}`).style("fill", color).style("opacity", isActive ? 1 : 0.15);
       
       d3.select(`#pill-${safeId}`)
         .style("color", isActive ? color : "#8E8A96")
         .style("border-color", isActive ? color : "var(--glass-border)");

       d3.select(`#pill-dot-${safeId}`)
         .style("background-color", color)
         .style("opacity", isActive ? 1 : 0.4);
    });
  }

  updateColorsAndKPIs(); // Initial synchronization run

  // ------------------------------------------------------------------------------------------------
  // BUNDLE 4: HYBRID ACCESSIBLE TOOLTIP (MOUSE + ARROW-KEYPAD NAVIGATION)
  // SPECIAL INDEX EXPLANATION:
  // - aria-live="polite": WCAG standard ensuring screen readers announce tooltip content changes 
  //   without interrupting other current speech.
  // - x.invert(mouseX): Mathematical inversion of linear scale. Converts pixel coordinate values
  //   back to the domain variable (calendar year: 2011 to 2021).
  // - stroke-dasharray="4,4": SVG stroke property creating dashed indicator lines for crosshairs.
  // ------------------------------------------------------------------------------------------------
  d3.select(".a11y-tooltip.g1-tooltip").remove(); // only remove G1's own tooltip, never the G2/G3 ones 
  
  const tooltip = d3.select("body").append("div")
    .attr("class", "a11y-tooltip g1-tooltip")
    .attr("aria-live", "polite") 
    .style("opacity", 0);
    
  const crosshair = svg.append("line")
    .attr("class", "crosshair")
    .style("opacity", 0)
    .attr("y1", 0)
    .attr("y2", height)
    .attr("stroke", "#C3B1E0")
    .attr("stroke-dasharray", "4,4");

  const chartContainerNode = d3.select("#chart-container").node();

  function drawTooltip(year, pointerX, pointerY, isKeypad = false) {
     crosshair.style("opacity", 1).attr("x1", x(year)).attr("x2", x(year));
     
     let html = `<div style="font-size:1.1rem; font-weight:700; border-bottom:1.5px solid #C3B1E0; padding-bottom:6px; margin-bottom:8px;">Year: ${year}</div>`;
     
     activeGroups.forEach(group => {
         const groupData = nested.get(group);
         const current = groupData.find(d => d.year === year);
         
         if (current) {
             const color = getDynamicColor(group);
             html += `<div style="margin-bottom:6px; font-size:1rem;">
                        <span style="color:${color}; font-size:1.2rem;">●</span> ${group}: 
                        <strong>${d3.format(",")(current.hospitalisations)}</strong>
                      </div>`;
         }
     });
     
     tooltip.html(html);

     // Tooltip placement: Follows mouse pointer during hover; docks above SVG during keyboard navigation
     if (isKeypad) {
         const rect = chartContainerNode.getBoundingClientRect();
         tooltip.style("left", (rect.left + window.scrollX + x(year) + 20) + "px")
                .style("top", (rect.top + window.scrollY + 100) + "px")
                .style("opacity", 1);
     } else {
         tooltip.style("left", (pointerX + 20) + "px")
                .style("top", (pointerY - 20) + "px")
                .style("opacity", 1);
     }
  }

  // Pointer Interaction Overlay (Transparent rect capturing all mouse coordinates)
  svg.append("rect")
    .attr("width", width).attr("height", height).style("fill", "none").style("pointer-events", "all")
    .on("mousemove", (event) => {
       const [mouseX] = d3.pointer(event);
       const year = Math.round(x.invert(mouseX)); // Map mouse X pixel back to discrete year
       drawTooltip(year, event.pageX, event.pageY, false);
    })
    .on("mouseout", () => { 
       crosshair.style("opacity", 0); 
       tooltip.style("opacity", 0); 
    });

  // Keyboard Interaction Listeners (Allows keyboard-only exploration via Left/Right arrows)
  let keypadYear = 2011;
  svgParent.on("keydown", (event) => {
      if (event.key === "ArrowRight") {
          keypadYear = Math.min(2021, keypadYear + 1);
          drawTooltip(keypadYear, 0, 0, true);
          event.preventDefault(); 
      } else if (event.key === "ArrowLeft") {
          keypadYear = Math.max(2011, keypadYear - 1);
          drawTooltip(keypadYear, 0, 0, true);
          event.preventDefault(); 
      } else if (event.key === "Escape") {
          crosshair.style("opacity", 0); 
          tooltip.style("opacity", 0); 
      }
  });

  svgParent.on("focus", () => drawTooltip(keypadYear, 0, 0, true));
  svgParent.on("focusout", () => { crosshair.style("opacity", 0); tooltip.style("opacity", 0); });
}

/* ==========================================================================
   GRAPH 2 INTERACTIVITY: filter pills, KPI cards, colour rule, tooltip
   Called by renderSeverityChart() in national_roaduser_severity_chart.js.

   GenAI acknowledgement: [EDIT THIS TO SAY HONESTLY WHAT YOU USED AI FOR]
   Drafted with help from Claude (Anthropic). Prompt summary: "add G1-style filter pill buttons,
   KPI cards and the three-colour rule to the G2 and G3 charts inside interactive.js".
   I read, tested and edited the code before using it.
   ========================================================================== */
function setupSeverityInteractivity(chartContext) {
  const { svgParent, svg, svgWidth, margin, rows, rowGroups, groups, keyText } = chartContext;

  // State is kept on window so the selection survives a resize redraw (same idea as G1)
  if (!window.severityActiveGroups) window.severityActiveGroups = new Set(groups);
  const activeGroups = window.severityActiveGroups;
  let highestRow = null; // active row with the longest stay
  let lowestRow = null;  // active row with the shortest stay

  /** Three-colour rule on the ACTIVE rows: longest = vermillion, shortest = green, rest = charcoal. */
  function rowColour(d) {
    if (!activeGroups.has(d.group)) return "#B0B0B0";
    if (d === highestRow) return PALETTE.VERMILLION;
    if (d === lowestRow) return PALETTE.GREEN;
    return "#222222";
  }

  // ---- Tooltip (hover, touch and keyboard focus) ----
  d3.selectAll(".severity-tooltip").remove();
  const tooltip = d3.select("body").append("div")
    .attr("class", "a11y-tooltip severity-tooltip")
    .attr("aria-live", "polite")
    .style("opacity", 0);
  const hideTooltip = () => tooltip.style("opacity", 0);
  function showTooltip(d, left, top) {
    tooltip.html(
      `<div style="font-size:1.1rem; font-weight:700; border-bottom:1.5px solid #C3B1E0; padding-bottom:6px; margin-bottom:8px;">${d.roadUser}</div>
       <div>Group: ${d.group}</div>
       <div>Hospitalisations: <strong>${d3.format(",")(d.hospitalisations)}</strong></div>
       <div>Bed days per case: <strong>${d3.format(".1f")(d.bedDaysPerCase)}</strong></div>
       <div>Cases ending in death: <strong>${d3.format(".2f")(d.diedPct)}%</strong> (${d3.format(",")(d.diedCases)} cases)</div>`
    ).style("left", left + "px").style("top", top + "px").style("opacity", 1);
  }

  // ---- Filter pill buttons (same classes as G1) ----
  const filterContainer = d3.select("#severity-filter-container").html("");
  filterContainer.append("span").attr("class", "filter-guide-label").text("Filter :");
  groups.forEach(g => {
    const safeId = g.replace(/\s+/g, "");
    const btn = filterContainer.append("button")
      .attr("id", `sev-pill-${safeId}`).attr("type", "button")
      .attr("class", `filter-pill ${activeGroups.has(g) ? "active" : ""}`)
      .attr("aria-pressed", activeGroups.has(g))
      .on("click", function () {
        if (activeGroups.has(g)) activeGroups.delete(g); else activeGroups.add(g);
        d3.select(this).classed("active", activeGroups.has(g)).attr("aria-pressed", activeGroups.has(g));
        hideTooltip();
        updateColorsAndKPIs();
      });
    btn.append("span").attr("id", `sev-pill-dot-${safeId}`).attr("class", "pill-color-dot").attr("aria-hidden", "true");
    btn.append("span").text(g);
  });

  // ---- Recalculate extremes, KPI cards and colours after every filter change ----
  function setKpi(idVal, idName, val, name, colour) {
    d3.select(idVal).text(val);
    d3.select(idName).text(name).style("color", colour);
  }
  function updateColorsAndKPIs() {
    const activeRows = rows.filter(d => activeGroups.has(d.group)); // rows are sorted longest to shortest stay
    highestRow = activeRows.length ? activeRows[0] : null;
    lowestRow = activeRows.length > 1 ? activeRows[activeRows.length - 1] : null;

    if (activeRows.length === 0) {
      d3.select("#g2-kpi-total").text("0");
      setKpi("#g2-kpi-long-val", "#g2-kpi-long-name", "0", "-", "#5E5A66");
      setKpi("#g2-kpi-short-val", "#g2-kpi-short-name", "0", "-", "#5E5A66");
      keyText.text("No road user groups selected. Choose a group above to see its bars.");
    } else {
      const shortest = activeRows[activeRows.length - 1];
      d3.select("#g2-kpi-total").text(d3.format(",")(d3.sum(activeRows, d => d.hospitalisations)));
      setKpi("#g2-kpi-long-val", "#g2-kpi-long-name", d3.format(".1f")(highestRow.bedDaysPerCase), highestRow.roadUser, PALETTE.VERMILLION);
      setKpi("#g2-kpi-short-val", "#g2-kpi-short-name", d3.format(".1f")(shortest.bedDaysPerCase), shortest.roadUser, PALETTE.GREEN);
      keyText.text(lowestRow
        ? `Highlighted: ${highestRow.roadUser} (longest stays, vermillion) and ${lowestRow.roadUser} (shortest stays, green)`
        : `Only ${highestRow.roadUser} is shown (longest and shortest stay among the selected groups)`);
    }

    rowGroups
      .style("opacity", d => activeGroups.has(d.group) ? 1 : 0.1)
      .attr("tabindex", d => activeGroups.has(d.group) ? 0 : -1)   // switched-off rows are skipped by Tab
      .style("pointer-events", d => activeGroups.has(d.group) ? "all" : "none");
    rowGroups.select(".bar-bed").style("fill", rowColour);
    rowGroups.select(".bar-death").style("fill", rowColour);
    rowGroups.select(".row-label").style("font-weight", d => (d === highestRow || d === lowestRow) ? 800 : 500);

    groups.forEach(g => {
      const safeId = g.replace(/\s+/g, "");
      const isActive = activeGroups.has(g);
      const colour = !isActive ? "#8E8A96"
        : (highestRow && highestRow.group === g) ? PALETTE.VERMILLION
        : (lowestRow && lowestRow.group === g) ? PALETTE.GREEN : "#222222";
      d3.select(`#sev-pill-${safeId}`).style("color", colour).style("border-color", isActive ? colour : "var(--glass-border)");
      d3.select(`#sev-pill-dot-${safeId}`).style("background-color", isActive ? colour : "#B0B0B0").style("opacity", isActive ? 1 : 0.4);
    });
  }
  updateColorsAndKPIs(); // initial synchronisation

  // ---- Hover, touch and keyboard focus on each row ----
  rowGroups
    .on("mousemove", function (event, d) {
      d3.select(this).select(".row-band").style("opacity", 0.25);
      showTooltip(d, event.pageX + 20, event.pageY - 20);
    })
    .on("mouseout", function () { d3.select(this).select(".row-band").style("opacity", 0); hideTooltip(); })
    .on("focus", function (event, d) {
      d3.select(this).select(".row-band").style("opacity", 0.25);
      const r = this.getBoundingClientRect(); // dock the tooltip next to the focused row
      showTooltip(d, r.left + window.scrollX + r.width * 0.55, r.top + window.scrollY - 10);
    })
    .on("blur", function () { d3.select(this).select(".row-band").style("opacity", 0); hideTooltip(); })
    .on("keydown", (event) => { if (event.key === "Escape") hideTooltip(); });
}

/* ==========================================================================
   GRAPH 3 INTERACTIVITY: filter pills, KPI cards, colour rule, crosshair tooltip
   Called by renderStateRatesChart() in state_rates_chart.js.
   GenAI acknowledgement: see the block above.
   ========================================================================== */
function setupStateInteractivity(chartContext) {
  const { svgParent, svg, containerNode, width, height, margin, x, years, nested, states, paths, labelEls } = chartContext;
  const latest = s => nested.get(s).find(r => r.year === years[1]);

  if (!window.stateActiveStates) window.stateActiveStates = new Set(states);
  const activeStates = window.stateActiveStates;
  let highestState = "";
  let lowestState = "";

  /** Three-colour rule on the ACTIVE states (by 2021 rate). */
  function stateColour(s) {
    if (!activeStates.has(s)) return "#B0B0B0";
    if (s === highestState) return PALETTE.VERMILLION;
    if (s === lowestState) return PALETTE.GREEN;
    return "#222222";
  }
  const isExtreme = s => activeStates.has(s) && (s === highestState || s === lowestState);

  // ---- Tooltip and crosshair ----
  d3.selectAll(".state-tooltip").remove();
  const tooltip = d3.select("body").append("div")
    .attr("class", "a11y-tooltip state-tooltip")
    .attr("aria-live", "polite")
    .style("opacity", 0);
  const crosshair = svg.append("line").attr("y1", 0).attr("y2", height).attr("stroke", "#C3B1E0")
    .attr("stroke-dasharray", "4,4").style("opacity", 0);
  const hideAll = () => { crosshair.style("opacity", 0); tooltip.style("opacity", 0); };

  // ---- Filter pill buttons (same classes as G1) ----
  const filterContainer = d3.select("#state-filter-container").html("");
  filterContainer.append("span").attr("class", "filter-guide-label").text("Filter :");
  states.forEach(s => {
    const btn = filterContainer.append("button")
      .attr("id", `state-pill-${s}`).attr("type", "button")
      .attr("class", `filter-pill ${activeStates.has(s) ? "active" : ""}`)
      .attr("aria-pressed", activeStates.has(s))
      .on("click", function () {
        if (activeStates.has(s)) activeStates.delete(s); else activeStates.add(s);
        d3.select(this).classed("active", activeStates.has(s)).attr("aria-pressed", activeStates.has(s));
        hideAll();
        updateColorsAndKPIs();
      });
    btn.append("span").attr("id", `state-pill-dot-${s}`).attr("class", "pill-color-dot").attr("aria-hidden", "true");
    btn.append("span").text(s);
  });

  // ---- Recalculate extremes, KPI cards and colours after every filter change ----
  function setKpi(idVal, idName, val, name, colour) {
    d3.select(idVal).text(val);
    d3.select(idName).text(name).style("color", colour);
  }
  function updateColorsAndKPIs() {
    const active = states.filter(s => activeStates.has(s)); // states are sorted highest to lowest 2021 rate
    highestState = active.length ? active[0] : "";
    lowestState = active.length > 1 ? active[active.length - 1] : "";

    if (active.length === 0) {
      d3.select("#g3-kpi-combined").text("0");
      setKpi("#g3-kpi-high-val", "#g3-kpi-high-name", "0", "-", "#5E5A66");
      setKpi("#g3-kpi-low-val", "#g3-kpi-low-name", "0", "-", "#5E5A66");
    } else {
      // Combined rate = total cases / total population of the selected states (not a simple average)
      const cases = d3.sum(active, s => latest(s).cases);
      const pop = d3.sum(active, s => latest(s).population);
      const lowest = active[active.length - 1];
      d3.select("#g3-kpi-combined").text(d3.format(".1f")(cases / pop * 100000));
      setKpi("#g3-kpi-high-val", "#g3-kpi-high-name", d3.format(".1f")(latest(highestState).rate), highestState, PALETTE.VERMILLION);
      setKpi("#g3-kpi-low-val", "#g3-kpi-low-name", d3.format(".1f")(latest(lowest).rate), lowest, PALETTE.GREEN);
    }

    states.forEach(s => {
      const isActive = activeStates.has(s);
      const colour = stateColour(s);
      paths[s].attr("stroke", colour).attr("stroke-width", isActive ? 4 : 2).style("opacity", isActive ? 1 : 0.08);
      if (isExtreme(s)) paths[s].raise(); // draw the highlighted lines on top
      labelEls[s].style("fill", colour).style("font-weight", isExtreme(s) ? 800 : 600).style("opacity", isActive ? 1 : 0.2);
      d3.select(`#state-pill-${s}`).style("color", isActive ? colour : "#8E8A96").style("border-color", isActive ? colour : "var(--glass-border)");
      d3.select(`#state-pill-dot-${s}`).style("background-color", colour).style("opacity", isActive ? 1 : 0.4);
    });
    crosshair.raise();
  }
  updateColorsAndKPIs(); // initial synchronisation

  // ---- Tooltip content, mouse and keyboard ----
  function drawTooltip(year, left, top) {
    crosshair.style("opacity", 1).attr("x1", x(year)).attr("x2", x(year));
    const rowsAtYear = states.filter(s => activeStates.has(s))
      .map(s => ({ s, d: nested.get(s).find(r => r.year === year) })).filter(r => r.d).sort((a, b) => b.d.rate - a.d.rate);
    let html = `<div style="font-size:1.1rem; font-weight:700; border-bottom:1.5px solid #C3B1E0; padding-bottom:6px; margin-bottom:8px;">Year: ${year}</div>`;
    if (rowsAtYear.length === 0) html += "<div>No states selected.</div>";
    rowsAtYear.forEach(r => {
      html += `<div style="font-weight:${isExtreme(r.s) ? 800 : 400};"><span style="color:${stateColour(r.s)}">●</span> ${r.s}: <strong>${d3.format(".1f")(r.d.rate)}</strong> per 100k (${d3.format(",")(r.d.cases)} cases)</div>`;
    });
    tooltip.html(html).style("left", left + "px").style("top", top + "px").style("opacity", 1);
  }
  const clampYear = v => Math.max(years[0], Math.min(years[1], Math.round(v)));

  svg.append("rect").attr("width", width).attr("height", height).style("fill", "none").style("pointer-events", "all")
    .on("mousemove", (event) => drawTooltip(clampYear(x.invert(d3.pointer(event)[0])), event.pageX + 20, event.pageY - 20))
    .on("mouseout", hideAll);

  let keyYear = years[1];
  svgParent.on("keydown", (event) => {
    if (event.key === "ArrowRight") keyYear = clampYear(keyYear + 1);
    else if (event.key === "ArrowLeft") keyYear = clampYear(keyYear - 1);
    else if (event.key === "Escape") { hideAll(); return; }
    else return;
    event.preventDefault();
    const r = containerNode.getBoundingClientRect();
    drawTooltip(keyYear, r.left + window.scrollX + margin.left + x(keyYear) + 20, r.top + window.scrollY + margin.top);
  });
  svgParent.on("blur", hideAll);
}