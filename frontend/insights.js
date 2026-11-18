(function () {
    let cachedInsights = [];
    let activeFilter = 'all';

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function formatValue(val) {
        if (val === null || val === undefined) return 'N/A';
        if (typeof val === 'number' && !Number.isNaN(val)) {
            return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
        }
        return String(val);
    }

    const ICON_MAP = {
        'About': { icon: 'fa-database', cls: 'about', group: 'metrics' },
        'Data Cleaning': { icon: 'fa-broom', cls: 'cleaning', group: 'quality' },
        'Summary': { icon: 'fa-chart-bar', cls: 'summary', group: 'metrics' },
        'Distribution': { icon: 'fa-chart-pie', cls: 'distribution', group: 'metrics' },
        'Concentration Risk': { icon: 'fa-circle-exclamation', cls: 'distribution', group: 'quality' },
        'Data Quality': { icon: 'fa-circle-info', cls: 'summary', group: 'quality' },
        'Risk Alert': { icon: 'fa-shield-halved', cls: 'risk', group: 'quality' },
        'Relationship': { icon: 'fa-link', cls: 'relationship', group: 'patterns' },
        'Pattern': { icon: 'fa-diagram-project', cls: 'pattern', group: 'patterns' },
        'Segmentation': { icon: 'fa-object-group', cls: 'segmentation', group: 'patterns' },
        'Info': { icon: 'fa-circle-info', cls: 'about', group: 'metrics' }
    };

    const SEGMENT_COLORS = ['#0d9488', '#2563eb', '#4f46e5', '#0284c7', '#059669'];

    function renderInsightCards(filterKey) {
        const container = document.getElementById('insights-container');
        if (!container) return;

        container.innerHTML = '';

        if (!cachedInsights || cachedInsights.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <div class="empty-state-icon"><i class="fas fa-lightbulb"></i></div>
                    <h3>No significant insights generated</h3>
                    <p>Try uploading a larger dataset with more rows or varied numeric and categorical columns.</p>
                </div>
            `;
            return;
        }

        const filtered = filterKey === 'all'
            ? cachedInsights
            : cachedInsights.filter((item) => {
                const meta = ICON_MAP[item.type] || { group: 'metrics' };
                return meta.group === filterKey;
            });

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <div class="empty-state-icon"><i class="fas fa-filter"></i></div>
                    <h3>No insights in this category</h3>
                    <p>Switch back to <strong>All</strong> to view every finding discovered in this dataset.</p>
                </div>
            `;
            return;
        }

        const html = filtered.map((insight, i) => {
            const mapping = ICON_MAP[insight.type] || { icon: 'fa-circle-info', cls: 'about' };
            const conf = typeof insight.confidence_score === 'number'
                ? `<span class="confidence-pill">${insight.confidence_score}% confidence</span>`
                : '';

            return `
                <article class="insight-item ${mapping.cls}" style="animation-delay: ${Math.min(i * 0.03, 0.3)}s">
                    <div class="insight-header">
                        <div class="insight-header-left">
                            <span class="insight-type-icon ${mapping.cls}" aria-hidden="true">
                                <i class="fas ${mapping.icon}"></i>
                            </span>
                            <span class="badge ${mapping.cls}">${escapeHtml(insight.badge || insight.type)}</span>
                        </div>
                        ${conf}
                    </div>
                    <p class="insight-text">${escapeHtml(insight.text)}</p>
                    ${insight.details ? `<div class="insight-details">${escapeHtml(insight.details)}</div>` : ''}
                </article>
            `;
        }).join('');

        container.innerHTML = html;
    }

    function setupFilterListeners() {
        const filterContainer = document.getElementById('insights-filters');
        if (!filterContainer || filterContainer.dataset.bound === 'true') return;
        filterContainer.dataset.bound = 'true';

        filterContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.filter-pill');
            if (!btn) return;
            activeFilter = btn.dataset.filter || 'all';

            filterContainer.querySelectorAll('.filter-pill').forEach((pill) => {
                pill.classList.toggle('active', pill === btn);
            });

            renderInsightCards(activeFilter);
        });
    }

    function renderSegments(segments) {
        const container = document.getElementById('segments-container');
        const badge = document.getElementById('segments-count-badge');
        if (!container) return;

        const list = Array.isArray(segments) ? segments : [];

        if (badge) {
            badge.textContent = `${list.length} ${list.length === 1 ? 'segment' : 'segments'}`;
        }

        if (list.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon"><i class="fas fa-object-group"></i></div>
                    <h3>No automatic segments generated</h3>
                    <p>K-Means clustering activates automatically on datasets with at least 100 clean rows and 2 or more numeric columns.</p>
                </div>
            `;
            return;
        }

        const sorted = [...list].sort((a, b) => (b.size || 0) - (a.size || 0));

        const cardsHtml = sorted.map((seg, idx) => {
            const color = SEGMENT_COLORS[idx % SEGMENT_COLORS.length];
            const pct = typeof seg.percentage === 'number' ? seg.percentage : 0;
            const size = typeof seg.size === 'number' ? seg.size.toLocaleString() : '0';
            const avgEntries = Object.entries(seg.average_values || {}).slice(0, 6);

            const statsHtml = avgEntries.map(([col, val]) => `
                <div class="segment-stat" title="${escapeHtml(col)}: ${escapeHtml(formatValue(val))}">
                    <span class="segment-stat-key">${escapeHtml(col)}</span>
                    <span class="segment-stat-val">${escapeHtml(formatValue(val))}</span>
                </div>
            `).join('');

            return `
                <div class="segment-card" style="animation-delay: ${idx * 0.06}s">
                    <div class="segment-head">
                        <span class="segment-name">
                            <span class="segment-dot" style="background: ${color};"></span>
                            Segment ${idx + 1}
                        </span>
                        <span class="segment-size">${size} records</span>
                    </div>
                    <div class="segment-share-row">
                        <span class="segment-pct">${pct}%</span>
                        <span class="segment-share-label">of clean dataset</span>
                    </div>
                    <div class="segment-bar-track" aria-hidden="true">
                        <div class="segment-bar-fill" style="width: ${Math.min(100, Math.max(4, pct))}%; background: ${color};"></div>
                    </div>
                    <div class="segment-metrics-list">
                        ${statsHtml}
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = `<div class="segments-grid">${cardsHtml}</div>`;
    }

    function renderAnomalies(anomalies) {
        const container = document.getElementById('anomalies-container');
        const badge = document.getElementById('anomalies-count-badge');
        if (!container) return;

        const list = Array.isArray(anomalies) ? anomalies : [];

        if (badge) {
            badge.textContent = `${list.length} flagged`;
            badge.className = list.length > 0 ? 'count-pill danger' : 'count-pill success';
        }

        if (list.length === 0) {
            container.innerHTML = `
                <div class="empty-state positive">
                    <div class="empty-state-icon"><i class="fas fa-circle-check"></i></div>
                    <h3>No anomalies detected</h3>
                    <p>All analyzed records fall within expected statistical ranges. No manual review is required.</p>
                </div>
            `;
            return;
        }

        const itemsHtml = list.map((anomaly, i) => {
            const reasons = (anomaly.reasons || [])
                .map((r) => `<li>${escapeHtml(r)}</li>`)
                .join('');

            const chips = Object.entries(anomaly.data || {})
                .map(([key, val]) => `<span class="data-chip"><strong>${escapeHtml(key)}:</strong> ${escapeHtml(formatValue(val))}</span>`)
                .join('');

            return `
                <article class="anomaly-item" style="animation-delay: ${Math.min(i * 0.05, 0.35)}s">
                    <div class="anomaly-head">
                        <span class="anomaly-record-id">
                            <i class="fas fa-triangle-exclamation"></i>
                            Record #${escapeHtml(anomaly.row_index)}
                        </span>
                        <span class="badge risk">Outlier</span>
                    </div>
                    <ul class="anomaly-reasons">${reasons}</ul>
                    <div class="anomaly-tags">${chips}</div>
                </article>
            `;
        }).join('');

        container.innerHTML = `
            <div class="anomalies-intro">
                <i class="fas fa-magnifying-glass-chart"></i>
                <span><strong>${list.length} record${list.length === 1 ? '' : 's'}</strong> flagged by Isolation Forest for deviating significantly from normal feature distributions.</span>
            </div>
            <div class="anomalies-list">${itemsHtml}</div>
        `;
    }

    window.renderInsights = function (insights, anomalies, segments) {
        cachedInsights = Array.isArray(insights) ? insights : [];
        activeFilter = 'all';

        const filterContainer = document.getElementById('insights-filters');
        if (filterContainer) {
            filterContainer.querySelectorAll('.filter-pill').forEach((pill) => {
                pill.classList.toggle('active', pill.dataset.filter === 'all');
            });
        }

        setupFilterListeners();
        renderInsightCards('all');
        renderSegments(segments || []);
        renderAnomalies(anomalies || []);
    };
})();
