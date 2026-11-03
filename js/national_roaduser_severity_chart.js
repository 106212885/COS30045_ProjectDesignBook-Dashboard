/* ==========================================================================
   js/national_roaduser_severity_chart.js  (Graph 2)
   Paired horizontal bar chart: how serious are injuries for each road user?
   Left panel  = average bed days per case
   Right panel = share of cases ending in death (%), 2011-2020 only.

   Filters, KPI cards, colours and tooltip live in js/interactive.js (setupSeverityInteractivity).
   ========================================================================== */

const SEVERITY_MIN_WIDTH = 900;   // below this the chart scrolls sideways instead of shrinking text
const SEVERITY_ROW_HEIGHT = 38;   // pixels per road user row

function renderSeverityChart(data) {
  const container = d3.select("#severity-chart-container");
  const containerNode = container.node();
  if (!containerNode) return;
  if (!data || data.length === 0) {
    container.html("<p>No severity data available.</p>");
    return;
  }

  // ---- 1. Dimensions (minimum width + horizontal scroll, as in G1) ----
  containerNode.style.overflowX = "auto";
  const svgWidth = Math.max(containerNode.getBoundingClientRect().width || 900, SEVERITY_MIN_WIDTH);
  const margin = { top: 90, right: 60, bottom: 60, left: 270 };
  const panelGap = 50;
  const panelWidth = (svgWidth - margin.left - margin.right - panelGap) / 2;
  const height = SEVERITY_ROW_HEIGHT * data.length;
  container.html("");

  const rows = [...data].sort((a, b) => b.bedDaysPerCase - a.bedDaysPerCase); // longest stays first

  // Road user groups for the filter buttons, largest total first
  const groups = Array.from(d3.rollup(data, v => d3.sum(v, d => d.hospitalisations), d => d.group))
    .sort((a, b) => b[1] - a[1]).map(d => d[0]);

  // ---- 3. Scales ----
  const y = d3.scaleBand().domain(rows.map(d => d.roadUser)).range([0, height]).padding(0.25);
  const xBed = d3.scaleLinear().domain([0, d3.max(rows, d => d.bedDaysPerCase)]).nice().range([0, panelWidth]);
  const xDeath = d3.scaleLinear().domain([0, d3.max(rows, d => d.diedPct)]).nice().range([0, panelWidth]);

  // ---- 4. SVG canvas ----
  const svgParent = container.append("svg")
    .attr("width", svgWidth).attr("height", height + margin.top + margin.bottom)
    .attr("role", "group")
    .attr("aria-label", "Paired bar chart of average bed days per case and percentage of cases ending in death by road user. Tab to each row to hear its values.")
    .style("overflow", "visible");
  const svg = svgParent.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  svg.append("text").attr("x", 0).attr("y", -52).style("font-size", "1.1rem").style("font-weight", "700")
    .style("fill", "#2A2730").text("Average bed days per case");
  svg.append("text").attr("x", panelWidth + panelGap).attr("y", -52).style("font-size", "1.1rem").style("font-weight", "700")
    .style("fill", "#2A2730").text("Cases ending in death (%), 2011–2020");
  const keyText = svg.append("text").attr("x", 0).attr("y", -24).style("font-size", "0.9rem").style("fill", PALETTE.GREY_CONTEXT);

  // ---- 5. Axes and gridlines ----
  function drawPanel(offsetX, scale, tickFormat) {
    const panel = svg.append("g").attr("transform", `translate(${offsetX},0)`);
    panel.append("g").call(d3.axisBottom(scale).ticks(5).tickSize(height).tickFormat(""))
      .call(g => g.select(".domain").remove())
      .call(g => g.selectAll("line").attr("stroke", "#E4DFEA"));
    panel.append("g").attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(scale).ticks(5).tickFormat(tickFormat).tickPadding(8)).attr("font-size", "1rem");
  }
  drawPanel(0, xBed, d3.format("d"));
  drawPanel(panelWidth + panelGap, xDeath, d => d + "%");

  // ---- 6. One focusable <g> per road user holding both bars (colours are set by interactive.js) ----
  const rowGroups = svg.selectAll("g.severity-row").data(rows).join("g")
    .attr("class", "severity-row")
    .attr("transform", d => `translate(0,${y(d.roadUser)})`)
    .attr("role", "img")
    .attr("aria-label", d => `${d.roadUser}: ${d3.format(".1f")(d.bedDaysPerCase)} bed days per case, ${d3.format(".2f")(d.diedPct)} percent of cases ended in death, ${d3.format(",")(d.hospitalisations)} hospitalisations.`)
    .style("outline", "none");

  rowGroups.append("rect").attr("class", "row-band")
    .attr("x", -margin.left + 10).attr("y", -4).attr("width", svgWidth - 20).attr("height", y.bandwidth() + 8)
    .attr("rx", 8).style("fill", "#C3B1E0").style("opacity", 0);
  rowGroups.append("text").attr("class", "row-label")
    .attr("x", -14).attr("y", y.bandwidth() / 2).attr("dy", "0.35em").attr("text-anchor", "end")
    .style("font-size", "1rem").style("fill", "#2A2730").text(d => d.roadUser);
  rowGroups.append("rect").attr("class", "bar-bed").attr("x", 0).attr("height", y.bandwidth())
    .attr("width", d => xBed(d.bedDaysPerCase));
  rowGroups.append("rect").attr("class", "bar-death").attr("x", panelWidth + panelGap).attr("height", y.bandwidth())
    .attr("width", d => xDeath(d.diedPct));
  rowGroups.append("text").attr("x", d => xBed(d.bedDaysPerCase) + 6).attr("y", y.bandwidth() / 2).attr("dy", "0.35em")
    .style("font-size", "0.9rem").style("font-weight", 700).style("fill", "#2A2730").text(d => d3.format(".1f")(d.bedDaysPerCase));
  rowGroups.append("text").attr("x", d => panelWidth + panelGap + xDeath(d.diedPct) + 6).attr("y", y.bandwidth() / 2).attr("dy", "0.35em")
    .style("font-size", "0.9rem").style("font-weight", 700).style("fill", "#2A2730").text(d => d3.format(".2f")(d.diedPct) + "%");

  // ---- 7. Hand over to interactive.js for filters, KPI cards, colours and tooltip ----
  const chartContext = { svgParent, svg, svgWidth, margin, rows, rowGroups, groups, keyText };
  if (typeof setupSeverityInteractivity === "function") setupSeverityInteractivity(chartContext);
}