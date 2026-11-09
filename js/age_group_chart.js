/**
 * Chart 2: Age Group Horizontal Bar Chart
 * Dynamically re-aggregates by Age Group and auto-scales X-axis
 */
let chartAgeGroupInstance = null;

function renderAgeGroupChart(records) {
    const ctx = document.getElementById('chartAgeGroup').getContext('2d');
    if (chartAgeGroupInstance) chartAgeGroupInstance.destroy();

    const ageKeys = ['0-7', '8-16', '17-25', '26-39', '40-64', '65+'];
    const ageValues = ageKeys.map(ag => {
        return records.filter(r => r.a === ag).reduce((sum, r) => sum + r.v, 0);
    });

    chartAgeGroupInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ageKeys,
            datasets: [{
                label: 'Hospitalisations',
                data: ageValues,
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