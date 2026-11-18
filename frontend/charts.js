(function () {
    const liveChartInstances = [];
    const sampleChartInstances = [];

    const PALETTE = [
        '#0d9488', // teal
        '#2563eb', // cobalt blue
        '#0284c7', // sky blue
        '#4f46e5', // indigo
        '#059669', // emerald
        '#d97706', // amber
        '#475569', // slate
        '#e11d48', // rose
    ];

    const PALETTE_SOFT = [
        'rgba(13, 148, 136, 0.84)',
        'rgba(37, 99, 235, 0.84)',
        'rgba(2, 132, 199, 0.84)',
        'rgba(79, 70, 229, 0.84)',
        'rgba(5, 150, 105, 0.84)',
        'rgba(217, 119, 6, 0.84)',
        'rgba(71, 85, 105, 0.84)',
        'rgba(225, 29, 72, 0.84)',
    ];

    const TOOLTIP_STYLE = {
        backgroundColor: '#0f172a',
        titleColor: '#f8fafc',
        bodyColor: '#e2e8f0',
        borderColor: '#1e293b',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 11,
        displayColors: true,
        boxPadding: 5,
    };

    function applyLightThemeDefaults() {
        if (typeof Chart === 'undefined') return;
        Chart.defaults.color = '#475569';
        Chart.defaults.borderColor = '#e2e8f0';
        Chart.defaults.font.family = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
        Chart.defaults.font.size = 12;
    }

    function destroyList(list) {
        while (list.length > 0) {
            const inst = list.pop();
            if (inst && typeof inst.destroy === 'function') {
                inst.destroy();
            }
        }
    }

    function truncateLabel(str, maxLen) {
        const text = String(str ?? '');
        return text.length > maxLen ? text.slice(0, maxLen - 1) + '\u2026' : text;
    }

    function escapeText(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function formatCompactNumber(val) {
        if (typeof val !== 'number' || Number.isNaN(val)) return val;
        const abs = Math.abs(val);
        if (abs >= 1e6) return (val / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
        if (abs >= 1e3) return (val / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
        return val.toLocaleString();
    }

    /**
     * Render illustrative sample preview charts on the landing page.
     * Clearly separated from live dataset analysis charts.
     */
    window.renderSampleCharts = function () {
        if (typeof Chart === 'undefined') return;
        applyLightThemeDefaults();
        destroyList(sampleChartInstances);

        const barCanvas = document.getElementById('sample-bar-chart');
        if (barCanvas) {
            sampleChartInstances.push(new Chart(barCanvas, {
                type: 'bar',
                data: {
                    labels: ['North America', 'EMEA', 'APAC', 'LATAM'],
                    datasets: [{
                        label: 'Avg Deal ($)',
                        data: [48200, 39600, 34100, 26800],
                        backgroundColor: [
                            'rgba(13, 148, 136, 0.86)',
                            'rgba(37, 99, 235, 0.84)',
                            'rgba(2, 132, 199, 0.82)',
                            'rgba(79, 70, 229, 0.78)',
                        ],
                        borderRadius: 6,
                        barPercentage: 0.62,
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            ...TOOLTIP_STYLE,
                            callbacks: {
                                label: (ctx) => ` Avg Deal: $${ctx.raw.toLocaleString()} (Sample)`
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: { color: '#e2e8f0' },
                            border: { display: false },
                            ticks: {
                                color: '#64748b',
                                font: { size: 11 },
                                callback: (v) => '$' + formatCompactNumber(v)
                            }
                        },
                        y: {
                            grid: { display: false },
                            border: { display: false },
                            ticks: { color: '#0f172a', font: { size: 11, weight: 600 } }
                        }
                    }
                }
            }));
        }

        const doughnutCanvas = document.getElementById('sample-doughnut-chart');
        if (doughnutCanvas) {
            sampleChartInstances.push(new Chart(doughnutCanvas, {
                type: 'doughnut',
                data: {
                    labels: ['Mid-Market', 'Enterprise', 'SMB'],
                    datasets: [{
                        data: [718, 456, 306],
                        backgroundColor: ['#0d9488', '#2563eb', '#64748b'],
                        borderColor: '#f8fafc',
                        borderWidth: 3,
                        hoverOffset: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '62%',
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: '#334155',
                                padding: 14,
                                usePointStyle: true,
                                pointStyle: 'circle',
                                font: { size: 11, weight: 500 }
                            }
                        },
                        tooltip: {
                            ...TOOLTIP_STYLE,
                            callbacks: {
                                label: (ctx) => {
                                    const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                    const pct = ((ctx.raw / total) * 100).toFixed(1);
                                    return ` ${ctx.label}: ${ctx.raw.toLocaleString()} (${pct}% — Sample)`;
                                }
                            }
                        }
                    }
                }
            }));
        }
    };

    /**
     * Render live analysis charts from /api/analyze basic_stats and categorical_stats.
     */
    window.renderCharts = function (numStats, catStats) {
        const container = document.getElementById('charts-container');
        const countBadge = document.getElementById('charts-count-badge');
        if (!container) return;

        applyLightThemeDefaults();
        destroyList(liveChartInstances);
        container.innerHTML = '';

        const wrappers = [];

        function createCanvas(id, title, subtitle) {
            const wrapper = document.createElement('div');
            wrapper.className = 'chart-wrapper';
            wrapper.innerHTML = `
                <div class="chart-head">
                    <span class="chart-title">${escapeText(title)}</span>
                    <span class="chart-sub">${escapeText(subtitle)}</span>
                </div>
                <div class="chart-canvas-box">
                    <canvas id="${id}"></canvas>
                </div>
            `;
            container.appendChild(wrapper);
            wrappers.push(wrapper);
            return document.getElementById(id);
        }

        // ===== CHART 1: Horizontal Bar — Numeric Averages (Top 6) =====
        if (numStats && Object.keys(numStats).length > 0) {
            const entries = Object.entries(numStats)
                .sort((a, b) => Math.abs(b[1].mean) - Math.abs(a[1].mean))
                .slice(0, 6);

            const fullLabels = entries.map(([col]) => col);
            const means = entries.map(([, s]) => s.mean);

            liveChartInstances.push(new Chart(
                createCanvas('num-chart', 'Average Values by Feature', `Top ${entries.length} numeric`),
                {
                    type: 'bar',
                    data: {
                        labels: fullLabels,
                        datasets: [{
                            label: 'Average',
                            data: means,
                            backgroundColor: PALETTE_SOFT.slice(0, fullLabels.length),
                            borderColor: PALETTE.slice(0, fullLabels.length),
                            borderWidth: 1,
                            borderRadius: 6,
                            barPercentage: 0.65,
                        }]
                    },
                    options: {
                        indexAxis: 'y',
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                ...TOOLTIP_STYLE,
                                callbacks: {
                                    title: (items) => fullLabels[items[0].dataIndex],
                                    label: (ctx) => ` Average: ${Number(ctx.raw).toLocaleString()}`
                                }
                            }
                        },
                        scales: {
                            x: {
                                grid: { color: '#e2e8f0' },
                                border: { display: false },
                                ticks: {
                                    color: '#64748b',
                                    font: { size: 11 },
                                    callback: (val) => formatCompactNumber(val)
                                }
                            },
                            y: {
                                grid: { display: false },
                                border: { display: false },
                                ticks: {
                                    color: '#0f172a',
                                    font: { size: 11, weight: 600 },
                                    callback: function (_, idx) {
                                        return truncateLabel(fullLabels[idx], 18);
                                    }
                                }
                            }
                        }
                    }
                }
            ));
        }

        // ===== CHART 2: Doughnut — Top Category =====
        if (catStats && Object.keys(catStats).length > 0) {
            const col = Object.keys(catStats)[0];
            const topValues = catStats[col].top_values || {};
            const labels = Object.keys(topValues);
            const values = Object.values(topValues);

            if (labels.length > 0) {
                liveChartInstances.push(new Chart(
                    createCanvas('cat-chart', `${col} Breakdown`, `Top ${labels.length} values`),
                    {
                        type: 'doughnut',
                        data: {
                            labels: labels.map(l => truncateLabel(l, 22)),
                            datasets: [{
                                data: values,
                                backgroundColor: PALETTE.slice(0, labels.length),
                                borderColor: '#f8fafc',
                                borderWidth: 3,
                                hoverOffset: 7
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            cutout: '58%',
                            plugins: {
                                legend: {
                                    position: 'bottom',
                                    labels: {
                                        color: '#334155',
                                        padding: 12,
                                        usePointStyle: true,
                                        pointStyle: 'circle',
                                        font: { size: 11, weight: 500 }
                                    }
                                },
                                tooltip: {
                                    ...TOOLTIP_STYLE,
                                    callbacks: {
                                        label: (ctx) => {
                                            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                            const pct = total > 0 ? ((ctx.raw / total) * 100).toFixed(1) : '0.0';
                                            return ` ${labels[ctx.dataIndex]}: ${Number(ctx.raw).toLocaleString()} (${pct}%)`;
                                        }
                                    }
                                }
                            }
                        }
                    }
                ));
            }
        }

        // ===== CHART 3: Value Ranges (Min / Median / Max) when 3+ numeric cols =====
        if (numStats && Object.keys(numStats).length >= 3) {
            const entries = Object.entries(numStats).slice(0, 6);
            const fullLabels = entries.map(([col]) => col);
            const mins = entries.map(([, s]) => s.min);
            const medians = entries.map(([, s]) => s.median);
            const maxs = entries.map(([, s]) => s.max);

            liveChartInstances.push(new Chart(
                createCanvas('range-chart', 'Value Ranges (Min / Median / Max)', 'Distribution spread'),
                {
                    type: 'bar',
                    data: {
                        labels: fullLabels.map(l => truncateLabel(l, 14)),
                        datasets: [
                            {
                                label: 'Min',
                                data: mins,
                                backgroundColor: 'rgba(13, 148, 136, 0.78)',
                                borderRadius: 4,
                                barPercentage: 0.75,
                            },
                            {
                                label: 'Median',
                                data: medians,
                                backgroundColor: 'rgba(37, 99, 235, 0.82)',
                                borderRadius: 4,
                                barPercentage: 0.75,
                            },
                            {
                                label: 'Max',
                                data: maxs,
                                backgroundColor: 'rgba(15, 23, 42, 0.78)',
                                borderRadius: 4,
                                barPercentage: 0.75,
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'top',
                                align: 'end',
                                labels: {
                                    color: '#334155',
                                    usePointStyle: true,
                                    pointStyle: 'circle',
                                    padding: 12,
                                    font: { size: 11, weight: 500 }
                                }
                            },
                            tooltip: {
                                ...TOOLTIP_STYLE,
                                callbacks: {
                                    title: (items) => fullLabels[items[0].dataIndex],
                                    label: (ctx) => ` ${ctx.dataset.label}: ${Number(ctx.raw).toLocaleString()}`
                                }
                            }
                        },
                        scales: {
                            x: {
                                grid: { display: false },
                                border: { display: false },
                                ticks: { color: '#334155', font: { size: 10, weight: 500 }, maxRotation: 25 }
                            },
                            y: {
                                grid: { color: '#e2e8f0' },
                                border: { display: false },
                                ticks: {
                                    color: '#64748b',
                                    font: { size: 10 },
                                    callback: (val) => formatCompactNumber(val)
                                }
                            }
                        }
                    }
                }
            ));
        }

        // ===== CHART 4: Second Categorical Column (if exists) =====
        if (catStats && Object.keys(catStats).length > 1) {
            const col = Object.keys(catStats)[1];
            const topValues = catStats[col].top_values || {};
            const labels = Object.keys(topValues);
            const values = Object.values(topValues);

            if (labels.length > 0) {
                liveChartInstances.push(new Chart(
                    createCanvas('cat2-chart', `${col} Breakdown`, `Top ${labels.length} values`),
                    {
                        type: 'polarArea',
                        data: {
                            labels: labels.map(l => truncateLabel(l, 20)),
                            datasets: [{
                                data: values,
                                backgroundColor: PALETTE_SOFT.slice(0, labels.length),
                                borderColor: '#ffffff',
                                borderWidth: 2
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: {
                                    position: 'bottom',
                                    labels: {
                                        color: '#334155',
                                        padding: 10,
                                        usePointStyle: true,
                                        pointStyle: 'circle',
                                        font: { size: 11, weight: 500 }
                                    }
                                },
                                tooltip: {
                                    ...TOOLTIP_STYLE,
                                    callbacks: {
                                        label: (ctx) => ` ${labels[ctx.dataIndex]}: ${Number(ctx.raw).toLocaleString()}`
                                    }
                                }
                            },
                            scales: {
                                r: {
                                    grid: { color: '#e2e8f0' },
                                    ticks: { display: false }
                                }
                            }
                        }
                    }
                ));
            }
        }

        // Visually balance odd chart counts (1 or 3) so no awkward empty half-slot appears
        if (wrappers.length === 1 || wrappers.length === 3) {
            wrappers[wrappers.length - 1].classList.add('chart-wide');
        }

        if (countBadge) {
            countBadge.textContent = `${wrappers.length} ${wrappers.length === 1 ? 'chart' : 'charts'}`;
        }

        // Empty state if dataset has no chartable columns
        if (wrappers.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <div class="empty-state-icon"><i class="fas fa-chart-column"></i></div>
                    <h3>No chartable columns detected</h3>
                    <p>Upload a dataset with numeric or categorical columns to automatically generate visual charts.</p>
                </div>
            `;
        }
    };
})();
