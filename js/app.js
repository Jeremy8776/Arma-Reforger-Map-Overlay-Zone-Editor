/**
 * Arma Reforger Map Overlay Zone Editor
 * Main Application Logic - Orchestrator
 * 
 * This is the main entry point that coordinates all modules.
 * Heavy functionality has been extracted to:
 * - TabManager (js/ui/tab-manager.js)
 * - ZoneListUI (js/ui/zone-list-ui.js)
 * - ZonePropertiesUI (js/ui/zone-properties-ui.js)
 * - HistoryManager (js/services/history-manager.js)
 * - ProjectManager (js/services/project-manager.js)
 * - CalibrationService (js/services/calibration-service.js)
 * - FileHandler (js/services/file-handler.js)
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
            localMapList: document.getElementById('localMapList'),

            // Tabs
            tabBar: document.getElementById('tabBar'),

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
            zoneFillPattern: document.getElementById('zoneFillPattern'),
            zoneColor: document.getElementById('zoneColor'),
            zoneOpacity: document.getElementById('zoneOpacity'),
            opacityValue: document.getElementById('opacityValue'),
            zoneCoords: document.getElementById('zoneCoords'),
            btnDeleteZone: document.getElementById('btnDeleteZone'),

            // Label styling
            showLabel: document.getElementById('showLabel'),
            labelColor: document.getElementById('labelColor'),
            labelBgColor: document.getElementById('labelBgColor'),
            labelBgOpacity: document.getElementById('labelBgOpacity'),
            labelBgOpacityValue: document.getElementById('labelBgOpacityValue'),
            labelSize: document.getElementById('labelSize'),
            labelShadow: document.getElementById('labelShadow'),

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
            btnToggleSnap: document.getElementById('btnToggleSnap'),
            invertY: document.getElementById('invertY')
        };

        // Initialize Core Modules
        this.core = new CanvasCore(this.elements.canvas, this.elements.canvasContainer);

        // Initialize Zone Manager
        this.zoneManager = new ZoneManager(() => this.requestRender());

        // Initialize History Manager
        this.historyManager = new HistoryManager(
            () => this.zoneManager.getZones(),
            (zones) => {
                this.zoneManager.zones = zones;
                this.zoneManager.selectedZoneId = null;
                this.core.requestRender();
                this.zoneListUI.updateZoneList();
                this.zonePropertiesUI.showZoneProperties(null);
            }
        );
        this.historyManager.onHistoryChanged = () => this.updateUI();

        // Initialize Tools & Events
        this.toolManager = new ToolManager(this.core, this.zoneManager);
        this.eventHandler = new EventHandler(this.core, this.toolManager, this.zoneManager);

        // Initialize Renderer
        this.renderer = new ZoneRenderer(this.core, this.zoneManager);

        // Initialize Export Handler
        this.exportHandler = new ExportHandler(this.core, this.zoneManager, this.renderer);

        // Initialize UI Modules
        this.tabManager = new TabManager(this);
        this.zoneListUI = new ZoneListUI(this);
        this.zonePropertiesUI = new ZonePropertiesUI(this);

        // Initialize Service Modules
        this.projectManager = new ProjectManager(this);
        this.fileHandler = new FileHandler(this);
        this.calibrationService = new CalibrationService(this);

        // State
        this.selectedZoneIds = []; // For multi-select
        this.zoomTimeout = null;

        this.init();
    }

    init() {
        // Initialize Context Menu
        this.contextMenu = new ContextMenu(this);

        // Initialize UI modules
        this.tabManager.init(this.elements.tabBar);
        this.zoneListUI.init({
            zoneCount: this.elements.zoneCount,
            zoneList: this.elements.zoneList
        });
        this.zonePropertiesUI.init(this.elements);

        // Initialize Calibration
        this.calibrationService.init({
            calibrationModal: document.getElementById('calibrationModal'),
            btnOpenCalibration: document.getElementById('btnOpenCalibration'),
            btnCloseCalibration: document.getElementById('btnCloseCalibration'),
            btnCancelCalibration: document.getElementById('btnCancelCalibration'),
            btnApplyCalibration: document.getElementById('btnApplyCalibration'),
            calStep1: document.getElementById('calStep1'),
            calStep2: document.getElementById('calStep2'),
            btnPickPoint1: document.getElementById('btnPickPoint1'),
            btnPickPoint2: document.getElementById('btnPickPoint2'),
            pt1Params: document.getElementById('pt1Params'),
            pt2Params: document.getElementById('pt2Params'),
            pt1WorldX: document.getElementById('pt1WorldX'),
            pt1WorldY: document.getElementById('pt1WorldY'),
            pt2WorldX: document.getElementById('pt2WorldX'),
            pt2WorldY: document.getElementById('pt2WorldY')
        });

        this.setupEventListeners();
        this.setupCallbacks();
        this.fileHandler.setupDragAndDrop(this.elements.canvasContainer, this.elements.uploadPrompt);
        this.loadLocalMaps();
        this.updateUI();

        // Check for map parameter in URL
        const urlParams = new URLSearchParams(window.location.search);
        const mapName = urlParams.get('map');
        if (mapName) {
            this.fileHandler.loadLocalMapImage(mapName);
        } else {
            const mapUrl = urlParams.get('mapurl');
            if (mapUrl) this.fileHandler.loadLocalMapImage(mapUrl, true);
        }
    }

    /**
     * Load local maps from Maps/maps.js
     */
    async loadLocalMaps() {
        if (!this.elements.localMapList) return;

        try {
            const maps = window.LOCAL_MAPS || [];
            const list = this.elements.localMapList;
            list.innerHTML = '';

            if (!maps || maps.length === 0) {
                list.innerHTML = '<div style="grid-column: span 2; text-align: center; font-size: 12px; color: var(--color-text-muted);">No maps found in Maps/maps.js</div>';
                return;
            }

            maps.forEach(mapData => {
                const fileName = typeof mapData === 'string' ? mapData : mapData.file;
                const displayName = typeof mapData === 'string' ? mapData : mapData.name;
                const fileUrl = `Maps/${fileName}`;

                const item = document.createElement('div');
                item.className = 'map-list-item';
                item.title = displayName;

                const thumb = document.createElement('img');
                thumb.className = 'map-thumbnail';
                thumb.src = fileUrl;
                thumb.loading = 'lazy';

                const infoRow = document.createElement('div');
                infoRow.className = 'map-info-row';

                const nameSpan = document.createElement('span');
                nameSpan.className = 'map-name';
                nameSpan.textContent = displayName;

                const actions = document.createElement('div');
                actions.className = 'map-actions';

                const btnNewTab = document.createElement('div');
                btnNewTab.className = 'action-icon';
                btnNewTab.title = 'Open in New Tab';
                btnNewTab.innerHTML = '<i data-lucide="external-link" style="width:14px; height:14px;"></i>';
                btnNewTab.onclick = (e) => {
                    e.stopPropagation();
                    const url = new URL(window.location.href);
                    url.searchParams.set('map', fileName);
                    window.open(url.toString(), '_blank');
                };

                actions.appendChild(btnNewTab);
                infoRow.appendChild(nameSpan);
                infoRow.appendChild(actions);
                item.appendChild(thumb);
                item.appendChild(infoRow);

                item.addEventListener('click', () => this.fileHandler.loadLocalMapImage(fileName));
                list.appendChild(item);
            });

            if (window.lucide) lucide.createIcons();

        } catch (err) {
            console.warn('Could not load local maps:', err);
            if (this.elements.localMapList)
                this.elements.localMapList.innerHTML = '<div style="grid-column: span 2; text-align: center; font-size: 12px; color: var(--color-text-muted);">Error loading maps</div>';
        }
    }

    /**
     * Called when a map image is loaded
     */
    onMapLoaded(image, filename) {
        this.tabManager.createTab(filename, image);
    }

    setupCallbacks() {
        // Connect shared render loop
        this.core.onRender = () => this.render();

        // Zone events
        this.zoneManager.onZoneCreated = (zone) => {
            this.historyManager.saveHistory();
            this.zoneListUI.updateZoneList();
            this.updateUI();
        };

        this.zoneManager.onZoneSelected = (zone) => {
            this.zonePropertiesUI.showZoneProperties(zone);
            this.zoneListUI.updateZoneListSelection();
        };

        this.zoneManager.onZoneUpdated = (zone) => {
            this.zoneListUI.updateZoneList();
        };

        this.zoneManager.onZoneDeleted = (id) => {
            this.zoneListUI.updateZoneList();
            this.updateUI();
        };

        // Select tool - save history after dragging
        if (this.toolManager.tools.select) {
            this.toolManager.tools.select.onDragComplete = () => {
                this.historyManager.saveHistory();
            };
        }

        // Canvas right-click context menu
        this.elements.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const pos = this.core.getMousePos(e);
            const mapPos = this.core.screenToMap(pos.x, pos.y);
            const zone = this.zoneManager.findZoneAtPoint(mapPos, this.core.zoom);

            if (zone) {
                this.zoneManager.selectZone(zone.id);
            }

            this.contextMenu.showForCanvas(e, zone);
        });

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
        if (this.core.renderBase()) {
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
        this.elements.fileInput.addEventListener('change', (e) => this.fileHandler.handleFileSelect(e));

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
        this.elements.btnFitView.addEventListener('click', () => this.core.fitToView());

        // Snap toggle
        this.elements.btnToggleSnap.addEventListener('click', () => {
            const enabled = this.core.toggleSnap();
            this.elements.btnToggleSnap.classList.toggle('active', enabled);
        });

        // Undo/Redo
        this.elements.btnUndo.addEventListener('click', () => this.historyManager.undo());
        this.elements.btnRedo.addEventListener('click', () => this.historyManager.redo());

        // Project Management
        this.elements.btnSaveProject.addEventListener('click', () => this.projectManager.saveProject());
        this.elements.btnLoadProject.addEventListener('click', () => this.elements.projectInput.click());
        this.elements.projectInput.addEventListener('change', (e) => this.projectManager.handleProjectLoad(e));

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

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcut(e));
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcut(e) {
        const activeElement = document.activeElement;
        const isTyping = activeElement && (
            activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.isContentEditable
        );

        if (isTyping) return;

        if (e.ctrlKey || e.metaKey) {
            // Let context menu handle copy/paste/duplicate
            if (this.contextMenu && this.contextMenu.handleKeyboard(e)) {
                return;
            }

            if (e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    this.historyManager.redo();
                } else {
                    this.historyManager.undo();
                }
            } else if (e.key === 'y') {
                e.preventDefault();
                this.historyManager.redo();
            } else if (e.key === 'e') {
                e.preventDefault();
                this.showExportModal();
            }
        }
    }

    // ========================================
    // UPLOAD SCREEN
    // ========================================

    showUploadScreen(keepTabs = false) {
        if (!keepTabs) {
            this.elements.tabBar.innerHTML = '';
        }

        this.elements.uploadPrompt.style.display = 'flex';
        this.elements.canvas.classList.remove('visible');
        this.elements.mapInfo.textContent = "No map loaded";
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
            mapScale: parseFloat(this.elements.mapScale.value) || 1,
            originX: parseFloat(this.elements.originX.value) || 0,
            originY: parseFloat(this.elements.originY.value) || 0,
            invertY: this.elements.invertY.checked,
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
        this.elements.btnUndo.disabled = !this.historyManager.canUndo();
        this.elements.btnRedo.disabled = !this.historyManager.canRedo();
        this.elements.btnExport.disabled = zones.length === 0;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ZoneEditorApp();
});
