/**
 * Chart 5: Age Profile Dumbbell Comparison
 * Dynamically calculates First Nations % share vs Non-Indigenous benchmark
 */
let chartAgeDumbbellInstance = null;

function renderAgeProfileDumbbell(records) {
    const ctx = document.getElementById('chartAgeDumbbell').getContext('2d');
    if (chartAgeDumbbellInstance) chartAgeDumbbellInstance.destroy();

    const ageKeys = ['0-7', '8-16', '17-25', '26-39', '40-64', '65+'];
    const totalCases = records.reduce((sum, r) => sum + r.v, 0);

    const fnValues = ageKeys.map(ag => {
        const agCount = records.filter(r => r.a === ag).reduce((sum, r) => sum + r.v, 0);
        return totalCases > 0 ? parseFloat(((agCount / totalCases) * 100).toFixed(1)) : 0;
    });

    const nonIndValues = ageKeys.map(ag => NON_INDIGENOUS_AGE_BENCHMARK[ag]);

    const dumbbellLinePlugin = {
        id: 'dumbbellLine',
        beforeDatasetsDraw(chart) {
            const { ctx } = chart;
            const meta0 = chart.getDatasetMeta(0);
            const meta1 = chart.getDatasetMeta(1);
            
            meta0.data.forEach((pt0, index) => {
                const pt1 = meta1.data[index];
                if (pt0 && pt1) {
                    ctx.save();
                    ctx.beginPath();
                    ctx.moveTo(pt0.x, pt0.y);
                    ctx.lineTo(pt1.x, pt1.y);
                    ctx.strokeStyle = '#CBD5E1';
                    ctx.lineWidth = 2.5;
                    ctx.stroke();
                    ctx.restore();
                }
            });
        }
    };

    chartAgeDumbbellInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ageKeys,
            datasets: [
                {
                    label: 'First Nations %',
                    data: fnValues,
                    borderColor: 'transparent',
                    pointBackgroundColor: '#143736',
                    pointBorderColor: '#FFFFFF',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8
                },
                {
                    label: 'Non-Indigenous %',
                    data: nonIndValues,
                    borderColor: 'transparent',
                    pointBackgroundColor: '#E67E22',
                    pointBorderColor: '#FFFFFF',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }
            ]
        },
        plugins: [dumbbellLinePlugin],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    align: 'end',
                    labels: { font: { family: 'Inter', size: 9 }, usePointStyle: true, boxWidth: 6 }
                },
                tooltip: {
                    backgroundColor: '#143736',
                    padding: 8,
                    cornerRadius: 6,
                    callbacks: {
                        label: (ctx) => ` ${ctx.dataset.label}: ${ctx.raw}%`
                    }
                }
            },
            scales: {
                x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 9 } } },
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => value + '%',
                        font: { family: 'Inter', size: 9 }
                    },
                    grid: { color: '#F1F5F9' }
                }
            }
        }
    });
}