/**
 * Main Application Orchestrator
 */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Reset Filters to Defaults
    resetFilters();

    // 2. Initial Dynamic Filter Render
    applyFilters();

    // 3. Ensure First Nations Tab is active
    switchTab('firstnations');
});