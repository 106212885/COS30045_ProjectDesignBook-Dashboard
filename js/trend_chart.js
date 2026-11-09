/**
 * Chart 1: Annual Trend Line Chart
 * Dynamically re-aggregates by Year and auto-scales Y-axis
 */
let chartTrendInstance = null;

function renderTrendChart(records) {
    const ctx = document.getElementById('chartTrend').getContext('2d');
    if (chartTrendInstance) chartTrendInstance.destroy();

    const years = [2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021];
    const yearValues = years.map(yr => {
        return records.filter(r => r.y === yr).reduce((sum, r) => sum + r.v, 0);
    });

    chartTrendInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: years.map(y => y.toString()),
            datasets: [{
                label: 'Hospitalisations',
                data: yearValues,
                borderColor: '#143736',
                borderWidth: 2.5,
                pointBackgroundColor: '#143736',
                pointBorderColor: '#FFFFFF',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                tension: 0.2,
                fill: true,
                backgroundColor: (context) => {
                    const chart = context.chart;
                    const {ctx, chartArea} = chart;
                    if (!chartArea) return null;
                    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                    gradient.addColorStop(0, 'rgba(20, 55, 54, 0.2)');
                    gradient.addColorStop(1, 'rgba(20, 55, 54, 0.0)');
                    return gradient;
                }
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { backgroundColor: '#143736', padding: 8, cornerRadius: 6 }
            },
            scales: {
                x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 9 } } },
                y: {
                    beginAtZero: true,
                    ticks: { font: { family: 'Inter', size: 9 } },
                    grid: { color: '#F1F5F9' }
                }
            }
        }
    });
}