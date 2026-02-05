/**
 * Map Extractor UI Component
 * Handles the modal interface for texture extraction
 */
class MapExtractorUI {
    constructor(app) {
        this.app = app;
        this.service = app.extractorService;
        this.modal = null;
        this.pendingSelections = [];
        this.lastExtractedFile = null;
    }

    async init() {
        this.createModal();
        this.setupEventListeners();

        // Auto-populate Output Dir with Downloads if empty
        if (!this.service.config.outputDir && window.electronAPI && window.electronAPI.getDownloadsPath) {
            try {
                const downloadsPath = await window.electronAPI.getDownloadsPath();
                const outField = document.getElementById('extractorOutputDir');
                if (outField && downloadsPath) {
                    // Use "Downloads/MapSave_Exports" for cleanliness.
                    const finalPath = downloadsPath + (downloadsPath.endsWith('\\') ? '' : '\\') + 'MapSave_Exports';

                    outField.value = finalPath;
                    this.service.config.outputDir = finalPath;
                    // We don't save to localStorage yet, only when they run it, 
                    // or we could save it now. Let's let them see it first.
                }
            } catch (err) {
                console.warn('Could not set default downloads path', err);
            }
        }
    }

    createModal() {
        const modalHtml = `
            <div class="modal-overlay" id="extractorModal">
                <div class="modal extractor-modal">
                    <div class="modal-header">
                        <h2><i data-lucide="package-search"></i> Arma Texture Extractor</h2>
                        <button class="modal-close" id="btnCloseExtractor">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p class="modal-description">
                            Search and extract map textures directly from Arma Reforger PAK files. extracted images will be saved to your output folder.
                        </p>

                        <div class="extractor-form">
                            <div class="property-group">
                                <label for="extractorSearch">Resource Name / Search Term</label>
                                <div class="search-input-wrapper">
                                    <input type="text" id="extractorSearch" placeholder="e.g. ArlandRasterized, Everon_Satellite, M4A1...">
                                    <button class="btn btn-primary" id="btnRunExtractor">
                                        <i data-lucide="zap"></i> Extract
                                    </button>
                                </div>
                            </div>

                            <div class="settings-expander">
                                <button class="btn-link" id="btnToggleExtractorSettings">
                                    <i data-lucide="settings"></i> Tool Configuration
                                </button>
                                <div class="extractor-settings" id="extractorSettings" style="display: none;">
                                    <div class="setting-row">
                                        <label>Scan Directory (PAK files)</label>
                                        <div class="input-group">
                                            <input type="text" id="extractorScanDir" placeholder="e.g. C:\\Program Files\\Arma Reforger\\addons\\data">
                                            <button class="btn-icon-only" data-browse="scan" title="Browse Folder">
                                                <i data-lucide="folder"></i>
                                            </button>
                                        </div>
                                    </div>
                                    <div class="setting-row">
                                        <label>Output Directory</label>
                                        <div class="input-group">
                                            <input type="text" id="extractorOutputDir" placeholder="e.g. C:\\Users\\Name\\Documents\\MapExports">
                                            <button class="btn-icon-only" data-browse="output" title="Browse Folder">
                                                <i data-lucide="folder"></i>
                                            </button>
                                        </div>
                                    </div>
                                    <div class="setting-row">
                                        <label>Tools Directory</label>
                                        <div class="input-group">
                                            <input type="text" id="extractorToolsDir" placeholder="Path to project tools folder (default: tools)">
                                            <button class="btn-icon-only" data-browse="tools" title="Browse Folder">
                                                <i data-lucide="folder"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="extractor-progress" id="extractorProgress" style="display: none;">
                                <div class="progress-header">
                                    <span id="progressStatus">Extracting...</span>
                                    <span id="progressPercent">0%</span>
                                </div>
                                <div class="progress-bar-container">
                                    <div class="progress-bar" id="extractorProgressBar" style="width: 0%"></div>
                                </div>
                                <div class="progress-log" id="extractorLog"></div>
                                <div class="selection-prompt" id="extractorSelectionPrompt" style="display: none;">
                                    <div class="selection-header">Multiple matches found. Select one:</div>
                                    <div class="selection-list" id="extractorSelectionList"></div>
                                </div>
                            </div>

                            <div class="extractor-result" id="extractorResult" style="display: none;">
                                <div class="result-message" id="resultMessage"></div>
                                <div class="result-actions">
                                    <button class="btn btn-primary btn-large" id="btnImportMap" style="display: none; width: 100%; margin-bottom: 10px;">
                                        <i data-lucide="download"></i> Import to Workspace
                                    </button>
                                </div>
                                <div class="command-box">
                                    <code id="resultCommand"></code>
                                    <button class="btn btn-secondary btn-small" id="btnCopyCommand">
                                        <i data-lucide="copy"></i> Copy Command
                                    </button>
                                </div>
                                <p class="result-hint">Paste this into your PowerShell terminal to run the extraction.</p>
                                <button class="btn btn-secondary btn-block" id="btnResetExtractor" style="margin-top: 15px; width: 100%;">
                                    <i data-lucide="rotate-ccw"></i> New Search
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        this.modal = document.getElementById('extractorModal');

        // Populate fields
        document.getElementById('extractorScanDir').value = this.service.config.scanDir;
        document.getElementById('extractorOutputDir').value = this.service.config.outputDir;
        document.getElementById('extractorToolsDir').value = this.service.config.toolsDir;

        if (window.lucide) lucide.createIcons();
    }

    setupEventListeners() {
        // Toggle Settings
        document.getElementById('btnToggleExtractorSettings').addEventListener('click', () => {
            const settings = document.getElementById('extractorSettings');
            const isHidden = settings.style.display === 'none';
            settings.style.display = isHidden ? 'block' : 'none';
        });

        // Run Button
        document.getElementById('btnRunExtractor').addEventListener('click', () => this.handleRun());
        document.getElementById('btnResetExtractor').addEventListener('click', () => this.resetUI());

        // Browse Buttons
        document.querySelectorAll('[data-browse]').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleBrowse(btn.dataset.browse));
        });

        // Close Buttons
        document.getElementById('btnCloseExtractor').addEventListener('click', () => this.hide());
        document.getElementById('btnCopyCommand').addEventListener('click', () => this.handleCopy());
        document.getElementById('btnImportMap').addEventListener('click', () => this.handleImport());

        // Backdrop click
        let isBackdropClick = false;
        this.modal.addEventListener('mousedown', (e) => {
            isBackdropClick = (e.target === this.modal);
        });
        this.modal.addEventListener('click', (e) => {
            if (isBackdropClick && e.target === this.modal) {
                this.hide();
            }
        });

        // Sidebar Button
        const btnOpen = document.getElementById('btnOpenExtractor');
        if (btnOpen) {
            btnOpen.addEventListener('click', () => this.show());
        }

        // Listen for real-time output
        if (window.electronAPI && window.electronAPI.onCommandOutput) {
            window.electronAPI.onCommandOutput((output) => {
                this.handleCommandOutput(output);
            });
        }
    }

    handleCommandOutput(output) {
        const log = document.getElementById('extractorLog');
        const status = document.getElementById('progressStatus');
        const bar = document.getElementById('extractorProgressBar');
        const percent = document.getElementById('progressPercent');

        if (!log) return;

        // Append to log
        const div = document.createElement('div');
        div.className = output.type === 'stderr' ? 'log-error' : 'log-info';
        div.textContent = output.data;
        log.appendChild(div);
        log.scrollTop = log.scrollHeight;

        // Capture output path if present (e.g. "Saved to: C:\...\file.png")
        // PowerShell script outputs: "SUCCESS! Exported to: ..." or "Saved to: ..."
        const saveMatch = output.data.match(/Saved to:\s*(.*)/i) ||
            output.data.match(/Exported to:\s*(.*)/i) ||
            output.data.match(/Exported:\s*(.*)/i);
        if (saveMatch) {
            this.lastExtractedFile = saveMatch[1].trim();
        }

        // --- Interactive Selection Parsing ---
        const lines = output.data.split('\n');
        let hasNewSelections = false;

        for (const line of lines) {
            // Match option line: "  [1] path/to/file  (in data.pak)" or plain "[1] file"
            const optionMatch = line.match(/^\s*\[(\d+)\]\s+(.+?)\s+\(in\s+(.+?)\)/) ||
                line.match(/^\s*\[(\d+)\]\s+(.+)/);

            if (optionMatch) {
                if (!this.pendingSelections) this.pendingSelections = [];

                const id = optionMatch[1];
                if (!this.pendingSelections.find(s => s.id === id)) {
                    this.pendingSelections.push({
                        id: id,
                        path: optionMatch[2].trim(),
                        pak: optionMatch[3] ? optionMatch[3].trim() : 'unknown'
                    });
                    hasNewSelections = true;
                }
            }

            if (line.includes('Select a number') || line.includes('Please select one')) {
                this.renderSelectionPrompt();
                hasNewSelections = false;
            }
        }

        if (hasNewSelections && this.pendingSelections.length > 0) {
            this.renderSelectionPrompt();
        }

        // --- Progress Parsing ---
        const progressMatch = output.data.match(/(\d+)\/(\d+)/);
        if (progressMatch) {
            const current = parseInt(progressMatch[1]);
            const total = parseInt(progressMatch[2]);
            const p = Math.round((current / total) * 100);

            status.textContent = `Extracting: ${current} of ${total} files...`;
            bar.style.width = `${p}%`;
            percent.textContent = `${p}%`;
        } else if (output.data.includes('Starting extraction')) {
            status.textContent = 'Starting process...';
        } else if (output.data.includes('Done') || output.data.includes('SUCCESS!')) {
            status.textContent = 'Finalizing...';
            bar.style.width = '100%';
            percent.textContent = '100%';
        }
    }

    renderSelectionPrompt() {
        const promptContainer = document.getElementById('extractorSelectionPrompt');
        const listContainer = document.getElementById('extractorSelectionList');

        if (!promptContainer || !listContainer) return;

        listContainer.innerHTML = '';

        this.pendingSelections.forEach(opt => {
            const btn = document.createElement('div');
            btn.className = 'selection-item';
            btn.innerHTML = `
                <div class="sel-id">${opt.id}</div>
                <div class="sel-info">
                    <div class="sel-path" title="${opt.path}">${opt.path}</div>
                    <div class="sel-pak">${opt.pak}</div>
                </div>
            `;
            btn.addEventListener('click', () => this.handleSelection(opt.id));
            listContainer.appendChild(btn);
        });

        promptContainer.style.display = 'block';
    }

    async handleSelection(id) {
        document.getElementById('extractorSelectionPrompt').style.display = 'none';
        this.pendingSelections = [];

        if (window.electronAPI && window.electronAPI.sendInput) {
            const log = document.getElementById('extractorLog');
            const div = document.createElement('div');
            div.className = 'log-info';
            div.style.color = '#00ff88';
            div.textContent = `> User selected: ${id}`;
            log.appendChild(div);

            await window.electronAPI.sendInput(id);
        }
    }

    async handleBrowse(type) {
        if (window.electronAPI && window.electronAPI.selectFolder) {
            try {
                const path = await window.electronAPI.selectFolder();
                if (path) {
                    this.updatePathField(type, path);
                }
            } catch (err) {
                console.error('Folder selection failed:', err);
            }
        } else {
            alert('Folder browsing is only available in the Desktop version.');
        }
    }

    getPathField(type) {
        switch (type) {
            case 'scan': return document.getElementById('extractorScanDir');
            case 'output': return document.getElementById('extractorOutputDir');
            case 'tools': return document.getElementById('extractorToolsDir');
        }
    }

    updatePathField(type, path) {
        const field = this.getPathField(type);
        if (field) field.value = path;
    }

    show() {
        this.resetUI();
        this.modal.classList.add('visible');
        document.getElementById('extractorSearch').focus();
    }

    hide() {
        this.modal.classList.remove('visible');
    }

    resetUI() {
        document.querySelector('.property-group').style.display = 'block';
        document.querySelector('.settings-expander').style.display = 'block';
        document.getElementById('extractorProgress').style.display = 'none';
        document.getElementById('extractorResult').style.display = 'none';
        document.getElementById('extractorSearch').value = '';
        document.getElementById('btnRunExtractor').disabled = false;
        document.getElementById('btnRunExtractor').innerHTML = '<i data-lucide="zap"></i> Extract';
        this.lastExtractedFile = null;
        if (window.lucide) lucide.createIcons();
    }

    async handleRun() {
        const searchTerm = document.getElementById('extractorSearch').value.trim();
        if (!searchTerm) {
            alert('Please enter a search term.');
            return;
        }

        const outDir = document.getElementById('extractorOutputDir').value.trim();
        if (!outDir) {
            alert('Please ensure an Output Directory is selected.');
            // Try to recover by running init again? 
            // Better to just let them know.
            document.querySelector('.settings-expander').style.display = 'block';
            document.getElementById('extractorSettings').style.display = 'block';
            document.getElementById('extractorOutputDir').focus();
            return;
        }

        this.service.saveConfig({
            scanDir: document.getElementById('extractorScanDir').value.trim(),
            outputDir: document.getElementById('extractorOutputDir').value.trim(),
            toolsDir: document.getElementById('extractorToolsDir').value.trim()
        });

        document.querySelector('.property-group').style.display = 'none';
        document.querySelector('.settings-expander').style.display = 'none';

        const progressArea = document.getElementById('extractorProgress');
        const logArea = document.getElementById('extractorLog');
        const bar = document.getElementById('extractorProgressBar');
        const percent = document.getElementById('progressPercent');

        progressArea.style.display = 'block';
        logArea.innerHTML = '';
        bar.style.width = '0%';
        percent.textContent = '0%';
        document.getElementById('extractorResult').style.display = 'none';
        document.getElementById('extractorSelectionPrompt').style.display = 'none';
        this.pendingSelections = [];
        this.lastExtractedFile = null;

        try {
            const result = await this.service.executeExtraction(searchTerm);

            const resultArea = document.getElementById('extractorResult');
            resultArea.style.display = 'block';
            resultArea.className = 'extractor-result ' + (result.status === 'manual' ? 'manual' : 'success');

            const importBtn = document.getElementById('btnImportMap');
            progressArea.style.display = 'none';

            if (result.status === 'manual') {
                document.getElementById('resultMessage').textContent = result.message;
                document.getElementById('resultCommand').textContent = result.command;
                document.querySelector('.result-hint').style.display = 'block';
                importBtn.style.display = 'none';
            } else {
                document.getElementById('resultMessage').innerHTML = '<strong>Success!</strong> Extraction completed.';
                document.getElementById('resultCommand').textContent = result.command;
                document.querySelector('.result-hint').style.display = 'none';

                if (this.lastExtractedFile) {
                    importBtn.style.display = 'flex';
                    // Show "Open Folder" button
                    let openBtn = document.getElementById('btnOpenOutputFolder');
                    if (!openBtn) {
                        const btnHtml = `
                            <button class="btn btn-secondary btn-large" id="btnOpenOutputFolder" style="width: 100%; margin-bottom: 10px;">
                                <i data-lucide="folder-open"></i> Open Output Folder
                            </button>
                         `;
                        importBtn.insertAdjacentHTML('afterend', btnHtml);
                        openBtn = document.getElementById('btnOpenOutputFolder');
                        openBtn.addEventListener('click', () => {
                            if (this.lastExtractedFile && window.electronAPI && window.electronAPI.openPath) {
                                // Extract directory from file path
                                // Windows path separator handling
                                const dir = this.lastExtractedFile.substring(0, this.lastExtractedFile.lastIndexOf('\\'));
                                window.electronAPI.openPath(dir || this.lastExtractedFile);
                            } else {
                                alert("Unable to open folder. Please RESTART the application to apply the latest system updates.");
                            }
                        });
                    }
                    if (window.lucide) lucide.createIcons();
                } else {
                    importBtn.style.display = 'none';
                    const openBtn = document.getElementById('btnOpenOutputFolder');
                    if (openBtn) openBtn.remove();
                }
            }
        } catch (err) {
            document.getElementById('resultMessage').innerHTML = `<strong>Error:</strong> ${err.message}`;
            document.getElementById('extractorResult').style.display = 'block';
            progressArea.style.display = 'none';
        }
    }

    async handleCopy() {
        const cmd = document.getElementById('resultCommand').textContent;
        try {
            if (window.electronAPI && window.electronAPI.writeClipboard) {
                await window.electronAPI.writeClipboard(cmd);
            } else {
                await navigator.clipboard.writeText(cmd);
            }

            const btn = document.getElementById('btnCopyCommand');
            const originalHtml = btn.innerHTML;
            btn.innerHTML = '<i data-lucide="check"></i> Copied!';
            if (window.lucide) lucide.createIcons();
            setTimeout(() => {
                btn.innerHTML = originalHtml;
                if (window.lucide) lucide.createIcons();
            }, 2000);
        } catch (err) {
            console.error('Copy failed', err);
            alert('Failed to copy to clipboard');
        }
    }

    handleImport() {
        if (this.lastExtractedFile) {
            this.app.fileHandler.loadLocalMapImage(this.lastExtractedFile, true);
            this.hide();
        }
    }
}

window.MapExtractorUI = MapExtractorUI;
