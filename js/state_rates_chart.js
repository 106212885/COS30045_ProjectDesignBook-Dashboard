/* ==========================================================================
   js/state_rates_chart.js  (Graph 3)
   Multi-line chart of hospitalisations per 100,000 people, by state, 2011-2021.
   Dashed lines mark the Victoria (2012) and NSW (2017) counting changes.

   Filters, KPI cards, colours and tooltip live in js/interactive.js (setupStateInteractivity).
   ========================================================================== */

const STATE_MIN_WIDTH = 900;
const STATE_YEARS = [2011, 2021];
const STATE_BREAKS = [
  { year: 2012, label: "Vic counting change" },
  { year: 2017, label: "NSW counting change" }
];

function renderStateRatesChart(data) {
  const container = d3.select("#state-chart-container");
  const containerNode = container.node();
  if (!containerNode) return;
  if (!data || data.length === 0) {
    container.html("<p>No state data available.</p>");
    return;
  }

  // ---- 1. Dimensions ----
  containerNode.style.overflowX = "auto";
  const svgWidth = Math.max(containerNode.getBoundingClientRect().width || 900, STATE_MIN_WIDTH);
  const margin = { top: 70, right: 150, bottom: 90, left: 110 };
  const width = svgWidth - margin.left - margin.right;
  const height = 560 - margin.top - margin.bottom;
  container.html("");

  // ---- 2. Data (states sorted by 2021 rate, highest first) ----
  const nested = d3.group(data, d => d.state);
  const latest = s => nested.get(s).find(r => r.year === STATE_YEARS[1]);
  const states = Array.from(nested.keys()).sort((a, b) => latest(b).rate - latest(a).rate); // highest 2021 rate first

  // ---- 3. Scales and axes (y starts at zero) ----
  const x = d3.scaleLinear().domain(STATE_YEARS).range([0, width]);
  const y = d3.scaleLinear().domain([0, d3.max(data, d => d.rate)]).nice().range([height, 0]);

  const svgParent = container.append("svg")
    .attr("width", svgWidth).attr("height", height + margin.top + margin.bottom)
    .attr("tabindex", 0)
    .attr("aria-label", "Line chart of hospitalisations per 100,000 people by state. Use Left and Right arrow keys to move between years.")
    .style("overflow", "visible");
  const svg = svgParent.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  svg.append("g").attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(11).tickFormat(d3.format("d")).tickPadding(12).tickSizeOuter(0)).attr("font-size", "1rem");
  svg.append("g").call(d3.axisLeft(y).ticks(6).tickPadding(10).tickSizeOuter(0)).attr("font-size", "1rem");
  svg.append("text").attr("x", width / 2).attr("y", height + 60).attr("text-anchor", "middle")
    .style("font-size", "1.15rem").style("font-weight", 700).style("fill", PALETTE.GREY_CONTEXT).text("Calendar Year");
  svg.append("text").attr("transform", "rotate(-90)").attr("x", -height / 2).attr("y", -margin.left + 35).attr("text-anchor", "middle")
    .style("font-size", "1.15rem").style("font-weight", 700).style("fill", PALETTE.GREY_CONTEXT).text("Hospitalisations per 100,000 people");

  // ---- 4. Series-break annotations ----
  STATE_BREAKS.forEach(b => {
    svg.append("line").attr("x1", x(b.year)).attr("x2", x(b.year)).attr("y1", -10).attr("y2", height)
      .attr("stroke", PALETTE.PURPLE).attr("stroke-dasharray", "2,4").attr("stroke-width", 1.5);
    svg.append("text").attr("x", x(b.year)).attr("y", -16).attr("text-anchor", "middle")
      .style("font-size", "0.85rem").style("font-weight", 600).style("fill", PALETTE.PURPLE).text(b.label);
  });

  // ---- 5. Lines and direct end labels (colours and opacity are set by interactive.js) ----
  const line = d3.line().x(d => x(d.year)).y(d => y(d.rate));
  const paths = {};
  states.forEach(s => { paths[s] = svg.append("path").datum(nested.get(s)).attr("fill", "none").attr("d", line); });

  const labelData = states.map(s => ({ state: s, y: y(latest(s).rate), value: latest(s).rate })).sort((a, b) => a.y - b.y);
  for (let i = 1; i < labelData.length; i++) {            // simple anti-collision: keep labels 20px apart
    if (labelData[i].y - labelData[i - 1].y < 20) labelData[i].y = labelData[i - 1].y + 20;
  }
  const labelEls = {};
  labelData.forEach(l => {
    labelEls[l.state] = svg.append("text").attr("x", width + 10).attr("y", l.y).attr("dy", "0.35em")
      .style("font-size", "0.95rem").text(`${l.state} ${d3.format(".0f")(l.value)}`);
  });

  // ---- 6. Hand over to interactive.js for filters, KPI cards, colours, crosshair and tooltip ----
  const chartContext = { svgParent, svg, containerNode, width, height, margin, x, years: STATE_YEARS, nested, states, paths, labelEls };
  if (typeof setupStateInteractivity === "function") setupStateInteractivity(chartContext);
}