/**
 * Chart 4: Heatmap Matrix
 * Dynamically re-calculates exact grid cell numbers and color intensity
 */
function renderAgeYearHeatmap(records) {
    const container = document.getElementById('heatmap-matrix-container');
    if (!container) return;

    const ageRows = ['0-7', '8-16', '17-25', '26-39', '40-64', '65+'];
    const years = [2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021];

    let maxVal = 1;
    ageRows.forEach(ag => {
        years.forEach(yr => {
            const cellVal = records.filter(r => r.a === ag && r.y === yr).reduce((sum, r) => sum + r.v, 0);
            if (cellVal > maxVal) maxVal = cellVal;
        });
    });

    let html = `
        <div class="grid grid-cols-12 gap-1 text-center font-bold text-slate-400 text-[8px]">
            <span></span>${years.map(y => `<span>${y.toString().slice(2)}</span>`).join('')}
        </div>
    `;

    ageRows.forEach(age => {
        html += `<div class="grid grid-cols-12 gap-1 items-center flex-1">
            <span class="text-right pr-0.5 text-[8px] font-bold text-slate-500">${age}</span>`;
        
        years.forEach(yr => {
            const val = records.filter(r => r.a === age && r.y === yr).reduce((sum, r) => sum + r.v, 0);
            const ratio = val / maxVal;

            let intensityColor = '#E0F2F1';
            if (ratio > 0.8) intensityColor = '#004D40';
            else if (ratio > 0.6) intensityColor = '#00695C';
            else if (ratio > 0.4) intensityColor = '#00897B';
            else if (ratio > 0.2) intensityColor = '#26A69A';
            else if (ratio > 0.05) intensityColor = '#80CBC4';

            html += `<div title="${age} (${yr}): ${val} cases" class="heat-cell h-full rounded" style="background:${intensityColor};"></div>`;
        });
        html += `</div>`;
    });

    container.innerHTML = html;
}