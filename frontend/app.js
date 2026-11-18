document.addEventListener('DOMContentLoaded', () => {
    const landingView = document.getElementById('landing-view');
    const dashboard = document.getElementById('dashboard');
    const navLanding = document.getElementById('nav-landing');
    const navDashboard = document.getElementById('nav-dashboard');

    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const browseBtn = document.getElementById('browse-btn');
    const navUploadBtn = document.getElementById('nav-upload-btn');
    const previewUploadCta = document.getElementById('preview-upload-cta');
    const dashboardUploadBtn = document.getElementById('dashboard-upload-btn');
    const backToStartBtn = document.getElementById('back-to-start-btn');

    const loadingPanel = document.getElementById('loading');
    const loadingFilename = document.getElementById('loading-filename');
    const loadingStep = document.getElementById('loading-step');
    const dashboardLoading = document.getElementById('dashboard-loading');
    const dashboardLoadingTitle = document.getElementById('dashboard-loading-title');

    const errorBox = document.getElementById('error-msg');
    const errorText = document.getElementById('error-text');
    const errorDismiss = document.getElementById('error-dismiss');
    const statusBanner = document.getElementById('status-banner');

    let isUploading = false;
    let progressTimer = null;
    let bannerTimer = null;

    const LOADING_STEPS = [
        'Cleaning records and detecting column types...',
        'Computing statistical profiles and distributions...',
        'Running correlations, K-Means clustering, and Isolation Forest...',
        'Generating plain-English insights and executive summary...'
    ];

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // Render illustrative sample preview charts on initial load
    if (typeof window.renderSampleCharts === 'function') {
        window.renderSampleCharts();
    }

    // ---- Navigation active state on click ----
    document.querySelectorAll('.nav-links').forEach((navGroup) => {
        navGroup.addEventListener('click', (e) => {
            const link = e.target.closest('.nav-link');
            if (!link) return;
            navGroup.querySelectorAll('.nav-link').forEach((el) => el.classList.remove('active'));
            link.classList.add('active');
        });
    });

    // ---- Upload Triggers ----
    function openFileDialog() {
        if (isUploading) return;
        fileInput.click();
    }

    browseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openFileDialog();
    });

    dropZone.addEventListener('click', () => openFileDialog());

    dropZone.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openFileDialog();
        }
    });

    if (navUploadBtn) navUploadBtn.addEventListener('click', openFileDialog);
    if (previewUploadCta) previewUploadCta.addEventListener('click', openFileDialog);
    if (dashboardUploadBtn) dashboardUploadBtn.addEventListener('click', openFileDialog);

    if (backToStartBtn) {
        backToStartBtn.addEventListener('click', () => {
            dashboard.classList.add('hidden');
            landingView.classList.remove('hidden');
            navDashboard.classList.add('hidden');
            navLanding.classList.remove('hidden');
            hideStatusBanner();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            if (typeof window.renderSampleCharts === 'function') {
                window.renderSampleCharts();
            }
        });
    }

    if (errorDismiss) {
        errorDismiss.addEventListener('click', () => {
            errorBox.classList.add('hidden');
        });
    }

    // ---- Drag & Drop Handlers ----
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (!isUploading) dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', (e) => {
        if (!dropZone.contains(e.relatedTarget)) {
            dropZone.classList.remove('dragover');
        }
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (isUploading) return;
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
            fileInput.value = '';
        }
    });

    // ---- Status Banner Helpers ----
    function showStatusBanner(type, message) {
        if (!statusBanner) return;
        clearTimeout(bannerTimer);

        const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation';
        statusBanner.innerHTML = `
            <div class="status-banner-inner ${type}">
                <div class="status-banner-left">
                    <i class="fas ${icon}"></i>
                    <span>${escapeHtml(message)}</span>
                </div>
                <button type="button" class="status-banner-close" aria-label="Dismiss notification">
                    <i class="fas fa-xmark"></i>
                </button>
            </div>
        `;
        statusBanner.classList.remove('hidden');

        const closeBtn = statusBanner.querySelector('.status-banner-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', hideStatusBanner);
        }

        if (type === 'success') {
            bannerTimer = setTimeout(hideStatusBanner, 6500);
        }
    }

    function hideStatusBanner() {
        clearTimeout(bannerTimer);
        if (statusBanner) statusBanner.classList.add('hidden');
    }

    // ---- Loading Step Animation ----
    function startLoadingState(fileName, inDashboard) {
        isUploading = true;
        setUploadButtonsDisabled(true);
        hideStatusBanner();
        errorBox.classList.add('hidden');

        if (inDashboard) {
            if (dashboardLoadingTitle) {
                dashboardLoadingTitle.textContent = `Analyzing ${fileName}...`;
            }
            dashboardLoading.classList.remove('hidden');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            dropZone.classList.add('hidden');
            loadingPanel.classList.remove('hidden');
            if (loadingFilename) loadingFilename.textContent = fileName;

            let stepIdx = 0;
            updateStepUI(0);
            progressTimer = setInterval(() => {
                stepIdx = Math.min(stepIdx + 1, LOADING_STEPS.length - 1);
                updateStepUI(stepIdx);
            }, 900);
        }
    }

    function updateStepUI(activeIdx) {
        if (loadingStep) loadingStep.textContent = LOADING_STEPS[activeIdx];
        loadingPanel.querySelectorAll('.step-chip').forEach((chip) => {
            const idx = Number(chip.dataset.step);
            chip.classList.toggle('active', idx === activeIdx);
            chip.classList.toggle('done', idx < activeIdx);
        });
    }

    function stopLoadingState() {
        isUploading = false;
        setUploadButtonsDisabled(false);
        clearInterval(progressTimer);
        progressTimer = null;
        loadingPanel.classList.add('hidden');
        dropZone.classList.remove('hidden');
        dashboardLoading.classList.add('hidden');
    }

    function setUploadButtonsDisabled(disabled) {
        [browseBtn, navUploadBtn, previewUploadCta, dashboardUploadBtn].forEach((btn) => {
            if (btn) btn.disabled = disabled;
        });
    }

    // ---- Upload & API Call ----
    async function handleFileUpload(file) {
        const lowerName = (file.name || '').toLowerCase();
        const isSupported = lowerName.endsWith('.csv') || lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls');
        const inDashboard = !dashboard.classList.contains('hidden');

        if (!isSupported) {
            const msg = `Unsupported file "${file.name}". Please upload a CSV (.csv) or Excel (.xlsx, .xls) file.`;
            if (inDashboard) {
                showStatusBanner('error', msg);
            } else {
                errorText.textContent = msg;
                errorBox.classList.remove('hidden');
            }
            return;
        }

        startLoadingState(file.name, inDashboard);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                body: formData
            });

            let data;
            try {
                data = await response.json();
            } catch (_) {
                throw new Error(`Server returned an unexpected response (HTTP ${response.status}).`);
            }

            if (!response.ok) {
                throw new Error(data.message || `Request failed with status ${response.status}`);
            }

            if (data.status === 'success') {
                stopLoadingState();
                landingView.classList.add('hidden');
                dashboard.classList.remove('hidden');
                navLanding.classList.add('hidden');
                navDashboard.classList.remove('hidden');

                // Reset active nav link to Summary
                navDashboard.querySelectorAll('.nav-link').forEach((link, idx) => {
                    link.classList.toggle('active', idx === 0);
                });

                renderDashboard(data, file.name);
                showStatusBanner(
                    'success',
                    `Analysis complete for ${file.name} — ${Number(data.rows || 0).toLocaleString()} clean rows across ${data.columns || 0} features.`
                );
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                throw new Error(data.message || 'Analysis failed. Please check the file format and contents.');
            }
        } catch (error) {
            stopLoadingState();
            const message = error && error.message ? error.message : 'An unexpected error occurred during analysis.';
            if (inDashboard) {
                showStatusBanner('error', `Error analyzing ${file.name}: ${message}`);
            } else {
                errorText.textContent = message;
                errorBox.classList.remove('hidden');
            }
        }
    }

    // ---- Render Live Dashboard ----
    function renderDashboard(data, fileName) {
        const healthReport = data.health_report || {};
        const healthScore = typeof healthReport.score === 'number' ? healthReport.score : 0;
        const missingFixed = healthReport.missing_values_fixed || {};
        const outliersFlagged = healthReport.outliers_flagged || {};
        const colTypes = data.column_types || {};
        const anomalies = Array.isArray(data.anomalies) ? data.anomalies : [];
        const segments = Array.isArray(data.segments) ? data.segments : [];

        const missingTotal = Object.values(missingFixed).reduce((a, b) => a + b, 0);
        const dupes = healthReport.duplicates_found || 0;
        const nullRowsRemoved = healthReport.null_rows_removed || 0;
        const rowsBefore = healthReport.rows_before || data.rows || 0;
        const rowsAfter = healthReport.rows_after ?? data.rows ?? 0;
        const totalIssues = dupes + missingTotal;

        const numColsCount = Object.values(colTypes).filter((t) => t === 'numeric').length;
        const catColsCount = Object.values(colTypes).filter((t) => t === 'categorical').length;
        const otherColsCount = Math.max(0, (data.columns || 0) - numColsCount - catColsCount);

        // 0. Report Topbar
        const titleEl = document.getElementById('report-filename');
        const subtitleEl = document.getElementById('report-subtitle');
        const timestampEl = document.getElementById('report-timestamp');
        const summaryMetaEl = document.getElementById('summary-meta');

        if (titleEl) titleEl.textContent = fileName || 'Uploaded Dataset';
        if (subtitleEl) {
            subtitleEl.textContent = data.message || `Automated quality, visual, ML, and plain-English report for ${fileName}`;
        }
        if (timestampEl) {
            const now = new Date();
            timestampEl.textContent = `Analyzed ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }
        if (summaryMetaEl) {
            summaryMetaEl.textContent = `${segments.length} segments \u00B7 ${anomalies.length} anomalies flagged`;
        }

        // 1. Key Metrics Row
        const metricsRow = document.getElementById('metrics-row');
        const scoreAccent = healthScore >= 90 ? 'emerald' : healthScore >= 70 ? 'amber' : 'rose';
        const scoreStatusText = healthScore >= 90
            ? 'Excellent data readiness'
            : healthScore >= 70
                ? 'Good quality after cleanup'
                : 'Notable cleanup required';

        const retentionPct = rowsBefore > 0 ? ((rowsAfter / rowsBefore) * 100).toFixed(1) : '100.0';
        const rowsFoot = rowsBefore !== rowsAfter
            ? `${retentionPct}% of ${rowsBefore.toLocaleString()} original rows`
            : '100% of uploaded rows retained';

        const colParts = [];
        if (numColsCount > 0) colParts.push(`${numColsCount} numeric`);
        if (catColsCount > 0) colParts.push(`${catColsCount} categorical`);
        if (otherColsCount > 0) colParts.push(`${otherColsCount} other`);
        const colsFoot = colParts.length > 0 ? colParts.join(' \u00B7 ') : 'Auto-typed columns';

        const issuesFoot = totalIssues === 0
            ? 'No duplicates or missing values'
            : `${dupes} duplicate${dupes === 1 ? '' : 's'} \u00B7 ${missingTotal} null cell${missingTotal === 1 ? '' : 's'}`;

        metricsRow.innerHTML = `
            <div class="metric-card accent-${scoreAccent}" style="animation-delay: 0.04s">
                <div class="metric-top">
                    <span class="metric-label">Health Score</span>
                    <span class="metric-icon ${scoreAccent}"><i class="fas fa-heart-pulse"></i></span>
                </div>
                <div class="metric-value">${healthScore}<span class="metric-unit">/100</span></div>
                <div class="metric-foot">${scoreStatusText}</div>
            </div>
            <div class="metric-card accent-teal" style="animation-delay: 0.08s">
                <div class="metric-top">
                    <span class="metric-label">Rows Analyzed</span>
                    <span class="metric-icon teal"><i class="fas fa-table-list"></i></span>
                </div>
                <div class="metric-value">${Number(data.rows || 0).toLocaleString()}</div>
                <div class="metric-foot">${rowsFoot}</div>
            </div>
            <div class="metric-card accent-blue" style="animation-delay: 0.12s">
                <div class="metric-top">
                    <span class="metric-label">Features</span>
                    <span class="metric-icon blue"><i class="fas fa-columns"></i></span>
                </div>
                <div class="metric-value">${Number(data.columns || 0).toLocaleString()}</div>
                <div class="metric-foot">${colsFoot}</div>
            </div>
            <div class="metric-card accent-amber" style="animation-delay: 0.16s">
                <div class="metric-top">
                    <span class="metric-label">Issues Fixed</span>
                    <span class="metric-icon amber"><i class="fas fa-screwdriver-wrench"></i></span>
                </div>
                <div class="metric-value">${totalIssues.toLocaleString()}</div>
                <div class="metric-foot">${issuesFoot}</div>
            </div>
        `;

        // 2. Data Quality Ring & Tier Badge
        const scoreEl = document.getElementById('health-score');
        const ringProgress = document.getElementById('score-ring-progress');
        const tierBadge = document.getElementById('quality-tier-badge');

        if (scoreEl) scoreEl.textContent = healthScore;

        const circumference = 2 * Math.PI * 50; // r = 50 => ~314.16
        const clampedScore = Math.max(0, Math.min(100, healthScore));
        const offset = circumference * (1 - clampedScore / 100);

        let strokeColor = 'var(--emerald-600)';
        let tierText = 'Excellent';
        let tierClass = 'excellent';

        if (healthScore < 70) {
            strokeColor = 'var(--rose-600)';
            tierText = 'Needs Review';
            tierClass = 'attention';
        } else if (healthScore < 90) {
            strokeColor = 'var(--amber-600)';
            tierText = 'Good';
            tierClass = 'good';
        }

        if (ringProgress) {
            ringProgress.style.stroke = strokeColor;
            ringProgress.style.strokeDasharray = `${circumference.toFixed(2)}`;
            ringProgress.style.strokeDashoffset = `${circumference.toFixed(2)}`;
            requestAnimationFrame(() => {
                ringProgress.style.strokeDashoffset = `${offset.toFixed(2)}`;
            });
        }

        if (tierBadge) {
            tierBadge.textContent = tierText;
            tierBadge.className = `tier-badge ${tierClass}`;
        }

        // 2b. Compact 2x2 Quality Stats
        const qualityMini = document.getElementById('quality-stats-mini');
        if (qualityMini) {
            qualityMini.innerHTML = `
                <div class="quality-mini-box">
                    <span class="quality-mini-label">Rows Before</span>
                    <span class="quality-mini-val">${rowsBefore.toLocaleString()}</span>
                </div>
                <div class="quality-mini-box">
                    <span class="quality-mini-label">Clean Rows</span>
                    <span class="quality-mini-val">${rowsAfter.toLocaleString()}</span>
                </div>
                <div class="quality-mini-box">
                    <span class="quality-mini-label">Duplicates</span>
                    <span class="quality-mini-val">${dupes.toLocaleString()}</span>
                </div>
                <div class="quality-mini-box">
                    <span class="quality-mini-label">Null Rows Dropped</span>
                    <span class="quality-mini-val">${nullRowsRemoved.toLocaleString()}</span>
                </div>
            `;
        }

        // 3. Health Issues List
        const issuesList = document.getElementById('health-issues');
        const issueRows = [];

        if (dupes > 0) {
            issueRows.push(`
                <li class="issue-row ok">
                    <i class="fas fa-circle-check"></i>
                    <span>Removed <strong>${dupes.toLocaleString()}</strong> duplicate row${dupes === 1 ? '' : 's'}</span>
                </li>
            `);
        }

        if (nullRowsRemoved > 0) {
            issueRows.push(`
                <li class="issue-row ok">
                    <i class="fas fa-circle-check"></i>
                    <span>Removed <strong>${nullRowsRemoved.toLocaleString()}</strong> row${nullRowsRemoved === 1 ? '' : 's'} containing null values</span>
                </li>
            `);
            issueRows.push(`
                <li class="issue-row info">
                    <i class="fas fa-down-left-and-up-right-to-center"></i>
                    <span>Dataset reduced from <strong>${rowsBefore.toLocaleString()}</strong> to <strong>${rowsAfter.toLocaleString()}</strong> rows</span>
                </li>
            `);
        }

        for (const [col, count] of Object.entries(missingFixed)) {
            issueRows.push(`
                <li class="issue-row warn">
                    <i class="fas fa-triangle-exclamation"></i>
                    <span>Column <strong>${escapeHtml(col)}</strong> had ${Number(count).toLocaleString()} missing value${count === 1 ? '' : 's'}</span>
                </li>
            `);
        }

        for (const [col, count] of Object.entries(outliersFlagged)) {
            issueRows.push(`
                <li class="issue-row warn">
                    <i class="fas fa-chart-line"></i>
                    <span><strong>${Number(count).toLocaleString()}</strong> statistical outlier${count === 1 ? '' : 's'} flagged in <strong>${escapeHtml(col)}</strong></span>
                </li>
            `);
        }

        if (issueRows.length === 0) {
            issuesList.innerHTML = `
                <li class="issue-row clean">
                    <i class="fas fa-circle-check"></i>
                    <span>Dataset was clean — no duplicates, missing values, or IQR outliers found.</span>
                </li>
            `;
        } else {
            issuesList.innerHTML = issueRows.join('');
        }

        // 3b. Detected Column Schema Tags
        const schemaSection = document.getElementById('schema-section');
        const schemaTags = document.getElementById('schema-tags');
        const schemaEntries = Object.entries(colTypes);
        if (schemaSection && schemaTags && schemaEntries.length > 0) {
            schemaSection.classList.remove('hidden');
            schemaTags.innerHTML = schemaEntries.map(([col, ctype]) => `
                <span class="schema-tag" title="${escapeHtml(col)} (${escapeHtml(ctype)})">
                    <span class="schema-type-dot ${escapeHtml(ctype)}"></span>
                    ${escapeHtml(col)}
                </span>
            `).join('');
        } else if (schemaSection) {
            schemaSection.classList.add('hidden');
        }

        // 4. Charts, Insights, Segments & Anomalies
        if (typeof window.renderCharts === 'function') {
            window.renderCharts(data.basic_stats, data.categorical_stats);
        }
        if (typeof window.renderInsights === 'function') {
            window.renderInsights(data.insights, data.anomalies, data.segments);
        }
    }
});
