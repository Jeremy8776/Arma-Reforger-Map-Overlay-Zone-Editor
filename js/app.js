/**
 * Arma Reforger Map Overlay Zone Editor
 * Main Application Logic
 */

class ZoneEditorApp {
    constructor() {
        // DOM Elements
        this.elements = {
            // Canvas
            canvasContainer: document.getElementById('canvasContainer'),
            canvas: document.getElementById('mapCanvas'),
            uploadPrompt: document.getElementById('uploadPrompt'),

            // File upload
            btnUpload: document.getElementById('btnUpload'),
            fileInput: document.getElementById('fileInput'),

            // Header
            coordX: document.getElementById('coordX'),
            coordY: document.getElementById('coordY'),
            mapInfo: document.getElementById('mapInfo'),
            zoomIndicator: document.getElementById('zoomIndicator'),

            // Actions
            btnUndo: document.getElementById('btnUndo'),
            btnRedo: document.getElementById('btnRedo'),

            btnSaveProject: document.getElementById('btnSaveProject'),
            btnLoadProject: document.getElementById('btnLoadProject'),
            projectInput: document.getElementById('projectInput'),
            btnExport: document.getElementById('btnExport'),
            btnZoomIn: document.getElementById('btnZoomIn'),
            btnZoomOut: document.getElementById('btnZoomOut'),
            btnFitView: document.getElementById('btnFitView'),

            // Zone panel
            zoneCount: document.getElementById('zoneCount'),
            zoneList: document.getElementById('zoneList'),
            zonePropertiesSection: document.getElementById('zonePropertiesSection'),

            // Zone properties
            zoneName: document.getElementById('zoneName'),
            zoneType: document.getElementById('zoneType'),
            zoneStyle: document.getElementById('zoneStyle'),
            zoneColor: document.getElementById('zoneColor'),
            zoneOpacity: document.getElementById('zoneOpacity'),
            opacityValue: document.getElementById('opacityValue'),
            zoneCoords: document.getElementById('zoneCoords'),
            btnDeleteZone: document.getElementById('btnDeleteZone'),

            // Export modal
            exportModal: document.getElementById('exportModal'),
            btnCloseExport: document.getElementById('btnCloseExport'),
            btnCancelExport: document.getElementById('btnCancelExport'),
            btnConfirmExport: document.getElementById('btnConfirmExport'),
            mapScale: document.getElementById('mapScale'),
            originX: document.getElementById('originX'),
            originY: document.getElementById('originY'),
            // Enfusion texture settings
            textureSuffix: document.getElementById('textureSuffix'),
            resizePow2: document.getElementById('resizePow2'),
            baseName: document.getElementById('baseName'),
            btnToggleSnap: document.getElementById('btnToggleSnap')
        };

        // Initialize Core Modules
        this.core = new CanvasCore(this.elements.canvas, this.elements.canvasContainer);

        // Initialize Managers
        this.zoneManager = new ZoneManager(() => this.requestRender());

        // Initialize Tools & Events
        this.toolManager = new ToolManager(this.core, this.zoneManager);
        this.eventHandler = new EventHandler(this.core, this.toolManager, this.zoneManager);

        // Initialize Renderer
        this.renderer = new ZoneRenderer(this.core, this.zoneManager);

        // Initialize Export Handler
        this.exportHandler = new ExportHandler(this.core, this.zoneManager);

        // State
        this.history = [];
        this.historyIndex = -1;
        this.maxHistory = 50;

        this.zoomTimeout = null;

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupCallbacks();
        this.setupDragAndDrop();
        this.updateUI();
    }

    setupCallbacks() {
        // Connect shared render loop
        this.core.onRender = () => this.render();

        // Zone events
        this.zoneManager.onZoneCreated = (zone) => {
            this.saveHistory();
            this.updateZoneList();
            this.updateUI();
        };

        this.zoneManager.onZoneSelected = (zone) => {
            this.showZoneProperties(zone);
            this.updateZoneListSelection();
        };

        this.zoneManager.onZoneUpdated = (zone) => {
            this.updateZoneList();
        };

        this.zoneManager.onZoneDeleted = (id) => {
            this.updateZoneList();
            this.updateUI();
        };

        // Core events
        this.core.onCoordsChanged = (x, y) => {
            this.elements.coordX.textContent = Utils.formatCoord(x);
            this.elements.coordY.textContent = Utils.formatCoord(y);
        };

        this.core.onZoomChanged = (zoomPercent) => {
            this.elements.zoomIndicator.textContent = zoomPercent + '%';
            this.elements.zoomIndicator.classList.add('visible');

            clearTimeout(this.zoomTimeout);
            this.zoomTimeout = setTimeout(() => {
                this.elements.zoomIndicator.classList.remove('visible');
            }, 1500);
        };
    }

    requestRender() {
        this.core.requestRender();
    }

    render() {
        if (this.core.renderBase()) { // Clears canvas and draws map/grid
            this.renderer.drawZones();
            this.renderer.drawSelection();

            // Draw tool preview
            const toolState = this.toolManager.getCurrentDrawState();
            this.renderer.drawCurrentShape(
                toolState.toolName,
                toolState.points,
                toolState.tempShape || { closeLoopHover: toolState.closeLoopHover },
                this.core.snapToGrid(this.eventHandler.lastMousePos || { x: 0, y: 0 })
            );
        }
    }

    setupEventListeners() {
        // File upload
        this.elements.btnUpload.addEventListener('click', () => this.elements.fileInput.click());
        this.elements.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

        // Tool buttons
        document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tool-btn[data-tool]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.toolManager.setTool(btn.dataset.tool);
            });
        });

        // View controls
        this.elements.btnZoomIn.addEventListener('click', () => this.core.setZoom(0.2));
        this.elements.btnZoomOut.addEventListener('click', () => this.core.setZoom(-0.2));
        this.elements.btnFitView.addEventListener('click', () => {
            this.core.fitToView();
        });

        // Snap toggle
        this.elements.btnToggleSnap.addEventListener('click', () => {
            const enabled = this.core.toggleSnap();
            this.elements.btnToggleSnap.classList.toggle('active', enabled);
        });

        // Undo/Redo
        this.elements.btnUndo.addEventListener('click', () => this.undo());
        this.elements.btnRedo.addEventListener('click', () => this.redo());

        // Project Management
        this.elements.btnSaveProject.addEventListener('click', () => this.saveProject());
        this.elements.btnLoadProject.addEventListener('click', () => this.elements.projectInput.click());
        this.elements.projectInput.addEventListener('change', (e) => this.handleProjectLoad(e));

        // Export
        this.elements.btnExport.addEventListener('click', () => this.showExportModal());
        this.elements.btnCloseExport.addEventListener('click', () => this.hideExportModal());
        this.elements.btnCancelExport.addEventListener('click', () => this.hideExportModal());
        this.elements.btnConfirmExport.addEventListener('click', () => this.handleExport());

        // Close modal on backdrop click
        this.elements.exportModal.addEventListener('click', (e) => {
            if (e.target === this.elements.exportModal) {
                this.hideExportModal();
            }
        });

        // Zone properties
        this.elements.zoneName.addEventListener('input', () => this.updateSelectedZone());
        this.elements.zoneType.addEventListener('change', () => this.updateSelectedZone());
        this.elements.zoneStyle.addEventListener('change', () => this.updateSelectedZone());
        this.elements.zoneColor.addEventListener('input', () => this.updateSelectedZone());
        this.elements.zoneOpacity.addEventListener('input', () => {
            this.elements.opacityValue.textContent = this.elements.zoneOpacity.value + '%';
            this.updateSelectedZone();
        });
        this.elements.btnDeleteZone.addEventListener('click', () => this.deleteSelectedZone());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z') {
                    e.preventDefault();
                    if (e.shiftKey) {
                        this.redo();
                    } else {
                        this.undo();
                    }
                } else if (e.key === 'y') {
                    e.preventDefault();
                    this.redo();
                } else if (e.key === 'e') {
                    e.preventDefault();
                    this.showExportModal();
                }
            }
        });
    }

    setupDragAndDrop() {
        const container = this.elements.canvasContainer;
        const prompt = this.elements.uploadPrompt;

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(event => {
            container.addEventListener(event, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        container.addEventListener('dragenter', () => prompt.classList.add('drag-over'));
        container.addEventListener('dragleave', (e) => {
            if (!container.contains(e.relatedTarget)) {
                prompt.classList.remove('drag-over');
            }
        });
        container.addEventListener('drop', (e) => {
            prompt.classList.remove('drag-over');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.loadMapFile(files[0]);
            }
        });
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.loadMapFile(file);
        }
    }

    async loadMapFile(file) {
        const ext = file.name.toLowerCase().split('.').pop();

        try {
            if (ext === 'edds' || ext === 'dds') {
                // Parse DDS/EDDS file
                const ddsInfo = await Utils.parseDDSFile(file);

                // Create canvas from DDS data
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = ddsInfo.width;
                tempCanvas.height = ddsInfo.height;
                const ctx = tempCanvas.getContext('2d');

                const imageData = Utils.ddsToImageData(ddsInfo);
                ctx.putImageData(imageData, 0, 0);

                // Convert to image
                const img = new Image();
                img.onload = () => {
                    this.onMapLoaded(img, file.name);
                };
                img.src = tempCanvas.toDataURL();
            } else {
                // Load regular image
                const img = await Utils.loadImage(file);
                this.onMapLoaded(img, file.name);
            }
        } catch (error) {
            console.error('Error loading map:', error);
            alert('Error loading map file: ' + error.message);
        }
    }

    onMapLoaded(image, filename) {
        this.core.loadMap(image);
        this.elements.uploadPrompt.style.display = 'none';
        this.elements.mapInfo.textContent = `${filename} (${image.width}×${image.height})`;
        this.updateUI();
    }

    // ========================================
    // ZONE LIST
    // ========================================

    updateZoneList() {
        const zones = this.zoneManager.getZones();
        this.elements.zoneCount.textContent = zones.length;

        if (zones.length === 0) {
            this.elements.zoneList.innerHTML = `
                <div class="empty-state">
                    <p>No zones created yet</p>
                    <p class="hint">Use the drawing tools to create zones</p>
                </div>
            `;
            return;
        }

        this.elements.zoneList.innerHTML = zones.map(zone => `
            <div class="zone-item ${zone.id === this.zoneManager.selectedZoneId ? 'selected' : ''}" 
                 data-zone-id="${zone.id}">
                <div class="zone-color" style="background-color: ${zone.color}"></div>
                <div class="zone-item-info">
                    <div class="zone-item-name">${this.escapeHtml(zone.name)}</div>
                    <div class="zone-item-type">${Utils.getZoneTypeName(zone.type)}</div>
                </div>
                <button class="zone-visibility" data-zone-id="${zone.id}" title="${zone.visible ? 'Hide' : 'Show'}">
                    ${zone.visible ? this.getEyeIcon() : this.getEyeOffIcon()}
                </button>
            </div>
        `).join('');

        // Add click handlers
        this.elements.zoneList.querySelectorAll('.zone-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.zone-visibility')) {
                    this.zoneManager.selectZone(item.dataset.zoneId);
                }
            });
        });

        this.elements.zoneList.querySelectorAll('.zone-visibility').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const zone = this.zoneManager.getZone(btn.dataset.zoneId);
                if (zone) {
                    this.zoneManager.updateZone(zone.id, { visible: !zone.visible });
                    this.updateZoneList();
                }
            });
        });

        // Initialize new icons
        if (window.lucide) {
            lucide.createIcons();
        }
    }

    updateZoneListSelection() {
        this.elements.zoneList.querySelectorAll('.zone-item').forEach(item => {
            item.classList.toggle('selected', item.dataset.zoneId === this.zoneManager.selectedZoneId);
        });
    }

    // ========================================
    // ZONE PROPERTIES
    // ========================================

    showZoneProperties(zone) {
        if (!zone) {
            this.elements.zonePropertiesSection.style.display = 'none';
            return;
        }

        this.elements.zonePropertiesSection.style.display = 'block';
        this.elements.zoneName.value = zone.name;
        this.elements.zoneType.value = zone.type;
        this.elements.zoneStyle.value = zone.style || 'solid';
        this.elements.zoneColor.value = zone.color;
        this.elements.zoneOpacity.value = zone.opacity * 100;
        this.elements.opacityValue.textContent = Math.round(zone.opacity * 100) + '%';

        // Show coordinates
        let coordsHtml = '';
        if (zone.shape === 'circle') {
            coordsHtml = `Center: (${zone.cx.toFixed(1)}, ${zone.cy.toFixed(1)})<br>Radius: ${zone.radius.toFixed(1)}`;
        } else if (zone.shape === 'line') {
            coordsHtml = `Start: (${zone.x1.toFixed(1)}, ${zone.y1.toFixed(1)})<br>End: (${zone.x2.toFixed(1)}, ${zone.y2.toFixed(1)})`;
        } else if (zone.points) {
            coordsHtml = zone.points.map((p, i) =>
                `P${i + 1}: (${p.x.toFixed(1)}, ${p.y.toFixed(1)})`
            ).join('<br>');
        }
        this.elements.zoneCoords.innerHTML = coordsHtml;
    }

    updateSelectedZone() {
        if (!this.zoneManager.selectedZoneId) return;

        this.zoneManager.updateZone(this.zoneManager.selectedZoneId, {
            name: this.elements.zoneName.value,
            type: this.elements.zoneType.value,
            style: this.elements.zoneStyle.value || 'solid',
            color: this.elements.zoneColor.value,
            opacity: parseInt(this.elements.zoneOpacity.value) / 100
        });

        this.updateZoneList();
    }

    deleteSelectedZone() {
        if (!this.zoneManager.selectedZoneId) return;
        this.saveHistory();
        this.zoneManager.deleteZone(this.zoneManager.selectedZoneId);
        this.elements.zonePropertiesSection.style.display = 'none';
        this.updateZoneList();
        this.updateUI();
    }

    // ========================================
    // HISTORY (UNDO/REDO)
    // ========================================

    saveHistory() {
        // Remove any redo states
        this.history = this.history.slice(0, this.historyIndex + 1);

        // Save current state
        const state = Utils.deepClone(this.zoneManager.getZones());
        this.history.push(state);

        // Limit history size
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        } else {
            this.historyIndex++;
        }

        this.updateUI();
    }

    saveProject() {
        const zones = this.zoneManager.getZones();
        if (zones.length === 0) {
            alert('No zones to save.');
            return;
        }

        const projectData = {
            version: "1.0",
            created: new Date().toISOString(),
            zones: zones
        };

        const json = JSON.stringify(projectData, null, 2);
        Utils.downloadFile(json, 'map_project.json', 'application/json');
    }

    handleProjectLoad(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const projectData = JSON.parse(event.target.result);
                if (projectData.zones && Array.isArray(projectData.zones)) {
                    // Ask for confirmation if current zones exist
                    if (this.zoneManager.getZones().length > 0) {
                        if (!confirm('Loading a project will replace all current zones. Continue?')) {
                            return;
                        }
                    }
                    this.zoneManager.zones = projectData.zones;
                    this.zoneManager.saveToStorage();
                    this.zoneManager.selectZone(null);
                    this.saveHistory();
                    this.updateZoneList();
                    this.core.requestRender();
                    this.updateUI();
                } else {
                    alert('Invalid project file format.');
                }
            } catch (err) {
                console.error('Error loading project:', err);
                alert('Error parsing project file.');
            }
        };
        reader.readAsText(file);
        // Reset input value so same file can be selected again
        e.target.value = '';
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            const state = Utils.deepClone(this.history[this.historyIndex]);
            // Restore state to manager
            this.zoneManager.zones = state;
            this.zoneManager.selectedZoneId = null;
            this.core.requestRender();
            this.updateZoneList();
            this.showZoneProperties(null);
            this.updateUI();
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            const state = Utils.deepClone(this.history[this.historyIndex]);
            this.zoneManager.zones = state;
            this.zoneManager.selectedZoneId = null;
            this.core.requestRender();
            this.updateZoneList();
            this.showZoneProperties(null);
            this.updateUI();
        }
    }

    // ========================================
    // EXPORT
    // ========================================

    showExportModal() {
        this.elements.exportModal.classList.add('visible');
    }

    hideExportModal() {
        this.elements.exportModal.classList.remove('visible');
    }

    handleExport() {
        const format = document.querySelector('input[name="exportFormat"]:checked').value;
        const settings = {
            // Coordinate settings
            mapScale: parseFloat(this.elements.mapScale.value) || 1,
            originX: parseFloat(this.elements.originX.value) || 0,
            originY: parseFloat(this.elements.originY.value) || 0,
            // Enfusion texture settings (for image export)
            textureSuffix: this.elements.textureSuffix.value || '_A',
            resizeToPow2: this.elements.resizePow2.checked,
            baseName: this.elements.baseName.value || 'zone_overlay'
        };

        this.exportHandler.export(format, settings);
        this.hideExportModal();
    }

    // ========================================
    // UI HELPERS
    // ========================================

    updateUI() {
        const zones = this.zoneManager.getZones();

        // Update button states
        this.elements.btnUndo.disabled = this.historyIndex <= 0;
        this.elements.btnRedo.disabled = this.historyIndex >= this.history.length - 1;
        this.elements.btnExport.disabled = zones.length === 0;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    getEyeIcon() {
        return `<i data-lucide="eye"></i>`;
    }

    getEyeOffIcon() {
        return `<i data-lucide="eye-off"></i>`;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ZoneEditorApp();
});
