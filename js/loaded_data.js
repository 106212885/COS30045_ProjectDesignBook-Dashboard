/**
 * Dynamic Multi-Dimensional Micro Dataset Engine for Power BI Cross-Filtering
 * Stores full breakdown array: { y: Year, s: State, u: RoadUser, a: AgeGroup, v: Count }
 */
const FIRST_NATIONS_RECORDS = (function() {
    const years = [2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021];
    const yearTotals = {
        2011: 1167, 2012: 1404, 2013: 1414, 2014: 1407, 2015: 1600,
        2016: 1669, 2017: 1733, 2018: 1930, 2019: 1856, 2020: 2290, 2021: 2220
    };
    const stateWeights = { QLD: 0.32, NSW: 0.28, WA: 0.19, NT: 0.12, VIC: 0.04, SA: 0.03, TAS: 0.015, ACT: 0.005 };
    const userWeights = {
        "Car driver/passenger": 0.523,
        "Motorcyclist": 0.235,
        "Pedestrian": 0.106,
        "Pedal cyclist": 0.093,
        "Pick-up truck/van": 0.013,
        "Heavy transport": 0.015,
        "Bus occupant": 0.015
    };
    const ageWeights = { "17-25": 0.309, "26-39": 0.269, "40-64": 0.232, "8-16": 0.131, "0-7": 0.039, "65+": 0.020 };

    const records = [];
    years.forEach(y => {
        const total = yearTotals[y];
        Object.keys(stateWeights).forEach(st => {
            Object.keys(userWeights).forEach(usr => {
                Object.keys(ageWeights).forEach(ag => {
                    const val = Math.round(total * stateWeights[st] * userWeights[usr] * ageWeights[ag]);
                    if (val > 0) {
                        records.push({ y: y, s: st, u: usr, a: ag, v: val });
                    }
                });
            });
        });
    });
    return records;
})();

// Non-Indigenous age benchmark distribution constants
const NON_INDIGENOUS_AGE_BENCHMARK = {
    '0-7': 1.7,
    '8-16': 6.9,
    '17-25': 19.7,
    '26-39': 23.6,
    '40-64': 33.6,
    '65+': 14.6
};