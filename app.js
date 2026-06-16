const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/1bqJBGYzVbyv2_s2bdyAqcyBf8H0h4YEJNzlYv1veXCk/gviz/tq?tqx=out:csv";

// Utility to clean numbers with commas (e.g., "50,000" -> 50000)
const parseNumber = (val) => {
    if (!val) return 0;
    const cleaned = val.toString().replace(/,/g, '');
    const num = parseInt(cleaned, 10);
    return isNaN(num) ? 0 : num;
};

// Utility to format numbers with commas
const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num);
};

document.addEventListener("DOMContentLoaded", () => {
    fetchData();
});

function fetchData() {
    Papa.parse(SHEET_CSV_URL, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            const data = results.data;
            // Filter out rows without a Post Date or Content Title to ensure valid data
            const validData = data.filter(row => row['Post Date'] && row['Content Title']);
            processData(validData);
        },
        error: function(err) {
            console.error("Error fetching data:", err);
            document.getElementById('loading').innerHTML = "<p style='color: var(--danger)'>Error loading data. Please check the Google Sheet link.</p>";
        }
    });
}

function processData(data) {
    // 1. Calculate KPI Metrics
    const totalPosts = data.length;
    let totalEngagement = 0;

    data.forEach(row => {
        totalEngagement += parseNumber(row['TOTAL ENG.']);
    });

    document.getElementById('total-posts').innerText = formatNumber(totalPosts);
    document.getElementById('total-engagement').innerText = formatNumber(totalEngagement);

    // 2. Prepare Top Posts Lists
    // Clone data for sorting
    const engSorted = [...data].sort((a, b) => parseNumber(b['TOTAL ENG.']) - parseNumber(a['TOTAL ENG.'])).slice(0, 5);
    const reachSorted = [...data].sort((a, b) => parseNumber(b['Reach / View']) - parseNumber(a['Reach / View'])).slice(0, 5);

    renderTable('top-eng-table', engSorted, 'TOTAL ENG.');
    renderTable('top-reach-table', reachSorted, 'Reach / View');

    // 3. Prepare Chart Data - Content Format
    const formatCounts = {};
    data.forEach(row => {
        const format = row['Format'] || 'Unknown';
        formatCounts[format] = (formatCounts[format] || 0) + 1;
    });
    renderFormatChart(formatCounts);

    // 4. Prepare Chart Data - MOM (Month over Month) Trend
    // Group by Month, calculating Total Reach and Total Engagement
    const momData = {};
    data.forEach(row => {
        const month = row['Month'];
        if (!month) return;
        
        if (!momData[month]) {
            momData[month] = { reach: 0, engagement: 0 };
        }
        momData[month].reach += parseNumber(row['Reach / View']);
        momData[month].engagement += parseNumber(row['TOTAL ENG.']);
    });
    renderMOMChart(momData);

    // Hide loading, show dashboard
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('dashboard-content').classList.remove('hidden');
}

function renderTable(tableId, data, statKey) {
    const tbody = document.querySelector(`#${tableId} tbody`);
    tbody.innerHTML = '';

    data.forEach(row => {
        const tr = document.createElement('tr');
        
        const tdDate = document.createElement('td');
        tdDate.innerText = row['Post Date'];
        
        const tdTitle = document.createElement('td');
        tdTitle.className = 'title-cell';
        tdTitle.innerText = row['Content Title'];
        tdTitle.title = row['Content Title']; // Tooltip
        
        const tdFormat = document.createElement('td');
        const spanFormat = document.createElement('span');
        spanFormat.className = 'format-badge';
        spanFormat.innerText = row['Format'] || '-';
        tdFormat.appendChild(spanFormat);
        
        const tdStat = document.createElement('td');
        tdStat.className = 'stat-value';
        tdStat.innerText = formatNumber(parseNumber(row[statKey]));

        tr.appendChild(tdDate);
        tr.appendChild(tdTitle);
        tr.appendChild(tdFormat);
        tr.appendChild(tdStat);
        
        tbody.appendChild(tr);
    });
}

function renderFormatChart(formatCounts) {
    const ctx = document.getElementById('formatChart').getContext('2d');
    
    // Setup vibrant colors
    const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#0ea5e9'];
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(formatCounts),
            datasets: [{
                data: Object.values(formatCounts),
                backgroundColor: colors,
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: '#f8fafc' }
                }
            }
        }
    });
}

function renderMOMChart(momData) {
    const ctx = document.getElementById('momChart').getContext('2d');
    
    const labels = Object.keys(momData); // e.g. ['ม.ค.-26', 'ก.พ.-26']
    const reachData = labels.map(label => momData[label].reach);
    const engData = labels.map(label => momData[label].engagement);

    // Configure Chart.js defaults for dark mode
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Total Reach',
                    data: reachData,
                    backgroundColor: 'rgba(59, 130, 246, 0.8)',
                    borderRadius: 4
                },
                {
                    label: 'Total Engagement',
                    data: engData,
                    backgroundColor: 'rgba(139, 92, 246, 0.8)',
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            plugins: {
                legend: {
                    labels: { color: '#f8fafc' }
                }
            }
        }
    });
}
