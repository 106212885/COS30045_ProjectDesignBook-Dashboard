/* =====================================================================
   config.js  –  constants only (file names, colours, labels, options)
   Everything of mine lives inside window.ST so it cannot clash with the
   team's globals.
   ===================================================================== */
(function () {
  const CONFIG = {
    DATA_DIR: "data/states-and-territory/",          // folder holding the KNIME-exported CSVs
    FILES: {                                          // one file per graph (tags from the KNIME workflow)
      state: "g1_state_year.csv",                    // graph 1 + KPIs
      aus:   "g1_australia_year.csv",                // KPI: Australia total / rate
      pct:   "g2_pct_change_state_year.csv",         // graph 2
      road:  "g3_road_user_state_year.csv",          // graph 3 (road user)
      cp:    "g3_counterparty_state_year.csv",       // graph 3 (counterparty)
      age:   "g4_age_state_year.csv",                // graph 4
      sex:   "g5_sex_state_year.csv"                 // graph 5
    },
    STATES: [                                         // codes exactly as in the CSVs
      { code: "NSW", name: "New South Wales" },  { code: "Vic", name: "Victoria" },
      { code: "Qld", name: "Queensland" },        { code: "SA",  name: "South Australia" },
      { code: "WA",  name: "Western Australia" }, { code: "Tas", name: "Tasmania" },
      { code: "NT",  name: "Northern Territory" },{ code: "ACT", name: "Australian Capital Territory" }
    ],
    BREAKS: { NSW: 2017, Vic: 2012 },                // first year of a break in the series
    TILES: { NT: [1, 0], Qld: [2, 0], WA: [0, 1], SA: [1, 1], NSW: [2, 1], ACT: [3, 1], Vic: [2, 2], Tas: [3, 2] },  // map layout (zoom view)
    // Team palette (same colours as the Hospitalisation / First Nations pages)
    COLORS: { navy: "#0E2A47", blue: "#3070AD", sky: "#6FB2E4", green: "#469C76", gold: "#DCA237",
              orange: "#C66526", pink: "#C17DA5", grey: "#94A3B8", tile: "#F1F5F9", band: "#E2E8F0" },
    HEAT: ["#EAF3FA", "#A9D0EA", "#6FB2E4", "#3070AD", "#123252"],       // heatmap ramp, light -> dark
    SEX: { Female: "#C66526", Male: "#3070AD" },
    BREAKDOWNS: {                                     // the switch on graph 3 (bars always show SHARES)
      road: { file: "road", title: "Road user mix by state",
              note: "Shares of each state's cases (same in Cases and Rates). Hover for cases or rate.",
              groups: ["Car occupant", "Motorcyclist", "Pedal cyclist", "Pedestrian", "Other road users"],
              labels: ["Car occupant", "Motorcyclist", "Pedal cyclist", "Pedestrian", "Other"],
              colors: ["#3070AD", "#469C76", "#6FB2E4", "#DCA237", "#C66526"] },
      cp:   { file: "cp", title: "Counterparty mix by state",
              note: "Shares of each state's cases (same in Cases and Rates). Non-collision = nothing hit, e.g. a rollover.",
              groups: ["Car, pick-up or van", "Fixed object", "Non-collision", "Other"],
              labels: ["Car, pick-up or van", "Fixed object", "Non-collision", "Other"],
              colors: ["#0E2A47", "#C17DA5", "#6FB2E4", "#94A3B8"] }
    }
  };
  window.ST = window.ST || {};
  ST.CONFIG = CONFIG;
})();
