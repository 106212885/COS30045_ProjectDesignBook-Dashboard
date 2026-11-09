let activeTab = 'firstnations';

function switchTab(tabKey) {
    activeTab = tabKey;

    document.querySelectorAll('.side-nav-btn').forEach(btn => {
        btn.className = "side-nav-btn w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-teal-100 hover:bg-teal-900/60 hover:text-white transition-all duration-200";
    });
    const sideActive = document.getElementById(`side-nav-${tabKey}`);
    if (sideActive) {
        sideActive.className = "side-nav-btn w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 bg-white text-teal-dark shadow-md";
    }

    document.querySelectorAll('.top-pill-btn').forEach(pill => {
        pill.className = "top-pill-btn px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 bg-slate-100 text-slate-600 hover:bg-slate-200";
    });
    const pillActive = document.getElementById(`top-pill-${tabKey}`);
    if (pillActive) {
        pillActive.className = "top-pill-btn px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 bg-teal-dark text-white shadow-sm";
    }

    const placeholder = document.getElementById('teammate-placeholder');
    const mainContent = document.getElementById('dashboard-content-area');

    if (tabKey === 'firstnations') {
        placeholder.classList.add('hidden');
        mainContent.classList.remove('opacity-30');
    } else {
        placeholder.classList.remove('hidden');
        mainContent.classList.add('opacity-30');
    }
}

function resetFilters() {
    document.getElementById('filterYear').value = 'ALL';
    document.getElementById('filterState').value = 'ALL';
    document.getElementById('filterUser').value = 'ALL';
    document.getElementById('filterAge').value = 'ALL';
}

/**
 * Filter Engine: Filters the full dataset across (Year, State, Road User, Age Group)
 */
function getFilteredRecords() {
    const yearVal = document.getElementById('filterYear').value;
    const stateVal = document.getElementById('filterState').value;
    const userVal = document.getElementById('filterUser').value;
    const ageVal = document.getElementById('filterAge').value;

    return FIRST_NATIONS_RECORDS.filter(r => {
        if (yearVal !== 'ALL' && r.y.toString() !== yearVal) return false;
        if (stateVal !== 'ALL' && r.s !== stateVal) return false;
        if (userVal !== 'ALL' && !r.u.toLowerCase().includes(userVal.toLowerCase())) return false;
        if (ageVal !== 'ALL' && r.a !== ageVal) return false;
        return true;
    });
}

/**
 * Main Dynamic Trigger called on any dropdown change
 */
function applyFilters() {
    const filteredRecords = getFilteredRecords();
    const yearVal = document.getElementById('filterYear').value;

    // 1. Recalculate KPI Summary Cards
    updateKPICards(filteredRecords, yearVal);

    // 2. Re-render All 5 Charts dynamically with auto-scaling axes
    renderTrendChart(filteredRecords);
    renderAgeGroupChart(filteredRecords);
    renderRoadUserChart(filteredRecords);
    renderAgeYearHeatmap(filteredRecords);
    renderAgeProfileDumbbell(filteredRecords);
}

function updateKPICards(records, yearVal) {
    const totalCases = records.reduce((sum, r) => sum + r.v, 0);
    const kpi1 = document.getElementById('kpi1-value');
    const kpi1Sub = document.getElementById('kpi1-sub');
    const kpi2 = document.getElementById('kpi2-value');
    const kpi2Donut = document.getElementById('kpi2-donut');
    const kpi3 = document.getElementById('kpi3-value');
    const kpi3Label = document.getElementById('kpi3-label');
    const kpi3Donut = document.getElementById('kpi3-donut');
    const kpi4 = document.getElementById('kpi4-value');

    // KPI 1: Total Hospitalisations
    kpi1.innerText = totalCases.toLocaleString();
    if (yearVal === 'ALL') {
        kpi1Sub.innerHTML = `<span>↑ 90.2%</span> <span class="text-slate-400 font-normal">increase (2011–2021)</span>`;
    } else {
        kpi1Sub.innerHTML = `<span class="text-slate-500 font-normal">Filtered Count in ${yearVal}</span>`;
    }

    // KPI 2: Car Driver/Passenger Share
    const carCases = records.filter(r => r.u.includes('Car')).reduce((sum, r) => sum + r.v, 0);
    const carPct = totalCases > 0 ? ((carCases / totalCases) * 100).toFixed(1) : '0.0';
    kpi2.innerText = `${carPct}%`;
    kpi2Donut.setAttribute('stroke-dasharray', `${carPct}, 100`);

    // KPI 3: Peak Age Group Share
    const ageMap = {};
    records.forEach(r => ageMap[r.a] = (ageMap[r.a] || 0) + r.v);
    let peakAge = '17–25';
    let peakVal = 0;
    Object.keys(ageMap).forEach(ag => {
        if (ageMap[ag] > peakVal) {
            peakVal = ageMap[ag];
            peakAge = ag;
        }
    });
    const peakPct = totalCases > 0 ? ((peakVal / totalCases) * 100).toFixed(1) : '0.0';
    kpi3.innerText = `${peakPct}%`;
    kpi3Label.innerText = `Peak Age Group (${peakAge})`;
    kpi3Donut.setAttribute('stroke-dasharray', `${peakPct}, 100`);

    // KPI 4: Annual Average Cases
    const uniqueYearsCount = new Set(records.map(r => r.y)).size || 1;
    const avgCases = Math.round(totalCases / uniqueYearsCount);
    kpi4.innerText = avgCases.toLocaleString();
}