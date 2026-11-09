/**
 * Chart 3: Road User Horizontal Bar Chart
 * Dynamically re-aggregates by Road User and auto-scales X-axis
 */
let chartRoadUserInstance = null;

function renderRoadUserChart(records) {
    const ctx = document.getElementById('chartRoadUser').getContext('2d');
    if (chartRoadUserInstance) chartRoadUserInstance.destroy();

    const userKeys = [
        "Car driver/passenger",
        "Motorcyclist",
        "Pedestrian",
        "Pedal cyclist",
        "Pick-up truck/van",
        "Heavy transport",
        "Bus occupant"
    ];

    const userValues = userKeys.map(usr => {
        return records.filter(r => r.u === usr).reduce((sum, r) => sum + r.v, 0);
    });

    chartRoadUserInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: userKeys,
            datasets: [{
                label: 'Hospitalisations',
                data: userValues,
                backgroundColor: '#143736',
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { backgroundColor: '#143736', padding: 8, cornerRadius: 6 }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { font: { family: 'Inter', size: 9 } },
                    grid: { color: '#F1F5F9' }
                },
                y: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 9 } } }
            }
        }
    });
}