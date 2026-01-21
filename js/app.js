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

        // Initialize Managers
        this.zoneManager = new ZoneManager(() => this.requestRender());

        // Initialize Tools & Events
        this.toolManager = new ToolManager(this.core, this.zoneManager);
        this.eventHandler = new EventHandler(this.core, this.toolManager, this.zoneManager);

        // Initialize Renderer
        this.renderer = new ZoneRenderer(this.core, this.zoneManager);

        // Initialize Export Handler
        this.exportHandler = new ExportHandler(this.core, this.zoneManager, this.renderer);

        // State
        this.history = [];
        this.historyIndex = -1;
        this.maxHistory = 50;
        this.selectedZoneIds = []; // For multi-select

        this.zoomTimeout = null;

        this.init();
    }

    init() {
        // Initialize Context Menu
        this.contextMenu = new ContextMenu(this);

        this.setupEventListeners();
        this.setupCallbacks();
        this.setupDragAndDrop();
        this.setupCalibration();
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

        // Select tool - save history after dragging
        if (this.toolManager.tools.select) {
            this.toolManager.tools.select.onDragComplete = () => {
                this.saveHistory();
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

        // Label styling events
        this.elements.showLabel.addEventListener('change', () => {
            this.updateLabelOptionsVisibility();
            this.updateSelectedZone();
        });
        this.elements.labelColor.addEventListener('input', () => this.updateSelectedZone());
        this.elements.labelBgColor.addEventListener('input', () => this.updateSelectedZone());
        this.elements.labelBgOpacity.addEventListener('input', () => {
            this.elements.labelBgOpacityValue.textContent = this.elements.labelBgOpacity.value + '%';
            this.updateSelectedZone();
        });
        this.elements.labelSize.addEventListener('change', () => this.updateSelectedZone());
        this.elements.labelShadow.addEventListener('change', () => this.updateSelectedZone());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Check if typing in input
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
            // Left click - select (with shift for multi-select)
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.zone-visibility')) {
                    if (e.shiftKey && this.zoneManager.selectedZoneId) {
                        // Shift+click: toggle multi-select
                        const zoneId = item.dataset.zoneId;
                        const index = this.selectedZoneIds.indexOf(zoneId);
                        if (index === -1) {
                            this.selectedZoneIds.push(zoneId);
                        } else {
                            this.selectedZoneIds.splice(index, 1);
                        }
                        this.updateZoneListSelection();
                    } else {
                        // Normal click: single select
                        this.selectedZoneIds = [];
                        this.zoneManager.selectZone(item.dataset.zoneId);
                    }
                }
            });

            // Right click - context menu
            item.addEventListener('contextmenu', (e) => {
                this.contextMenu.showForZoneItem(e, item.dataset.zoneId);
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
            const zoneId = item.dataset.zoneId;
            const isSelected = zoneId === this.zoneManager.selectedZoneId;
            const isMultiSelected = this.selectedZoneIds.includes(zoneId);

            item.classList.toggle('selected', isSelected);
            item.classList.toggle('multi-selected', isMultiSelected && !isSelected);
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

        // Label styling
        this.elements.showLabel.checked = zone.showLabel !== false; // Default to true
        this.elements.labelColor.value = zone.labelColor || '#ffffff';
        this.elements.labelBgColor.value = zone.labelBgColor || '#000000';
        this.elements.labelBgOpacity.value = (zone.labelBgOpacity !== undefined ? zone.labelBgOpacity * 100 : 70);
        this.elements.labelBgOpacityValue.textContent = this.elements.labelBgOpacity.value + '%';
        this.elements.labelSize.value = zone.labelSize || 'medium';
        this.elements.labelShadow.checked = zone.labelShadow || false;

        this.updateLabelOptionsVisibility();

        // Show coordinates
        let coordsHtml = '';
        if (zone.shape === 'circle') {
            coordsHtml = `Center: (${zone.cx.toFixed(1)}, ${zone.cy.toFixed(1)})<br>Radius: ${zone.radius.toFixed(1)}`;
        } else if (zone.shape === 'rectangle') {
            coordsHtml = `Position: (${zone.x.toFixed(1)}, ${zone.y.toFixed(1)})<br>Size: ${zone.width.toFixed(1)} × ${zone.height.toFixed(1)}`;
        } else if (zone.shape === 'line') {
            coordsHtml = `Start: (${zone.x1.toFixed(1)}, ${zone.y1.toFixed(1)})<br>End: (${zone.x2.toFixed(1)}, ${zone.y2.toFixed(1)})`;
        } else if (zone.points) {
            coordsHtml = zone.points.map((p, i) =>
                `P${i + 1}: (${p.x.toFixed(1)}, ${p.y.toFixed(1)})`
            ).join('<br>');
        }
        this.elements.zoneCoords.innerHTML = coordsHtml;
    }

    updateLabelOptionsVisibility() {
        const showLabel = this.elements.showLabel.checked;
        document.querySelectorAll('.label-options').forEach(el => {
            el.style.opacity = showLabel ? '1' : '0.4';
            el.style.pointerEvents = showLabel ? 'auto' : 'none';
        });
    }

    updateSelectedZone() {
        if (!this.zoneManager.selectedZoneId) return;

        this.zoneManager.updateZone(this.zoneManager.selectedZoneId, {
            name: this.elements.zoneName.value,
            type: this.elements.zoneType.value,
            style: this.elements.zoneStyle.value || 'solid',
            color: this.elements.zoneColor.value,
            opacity: parseInt(this.elements.zoneOpacity.value) / 100,
            // Label styling
            showLabel: this.elements.showLabel.checked,
            labelColor: this.elements.labelColor.value,
            labelBgColor: this.elements.labelBgColor.value,
            labelBgOpacity: parseInt(this.elements.labelBgOpacity.value) / 100,
            labelSize: this.elements.labelSize.value,
            labelShadow: this.elements.labelShadow.checked
        });

        // The updateZone call above might have changed data (e.g. auto color)
        // We need to refresh the UI inputs if the underlying data changed differently than our inputs
        // This is handled by onZoneUpdated -> updateZoneList, but we also need to update Properties Panel inputs
        // because updateZoneList only updates the list items.

        const zone = this.zoneManager.getSelectedZone();
        if (zone) {
            this.showZoneProperties(zone);
        }

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
    // CALIBRATION TOOL
    // ========================================

    setupCalibration() {
        // Elements
        this.calElements = {
            modal: document.getElementById('calibrationModal'),
            icon: document.getElementById('btnOpenCalibration'),
            btnClose: document.getElementById('btnCloseCalibration'),
            btnCancel: document.getElementById('btnCancelCalibration'),
            btnApply: document.getElementById('btnApplyCalibration'),

            step1: document.getElementById('calStep1'),
            step2: document.getElementById('calStep2'),
            btnPick1: document.getElementById('btnPickPoint1'),
            btnPick2: document.getElementById('btnPickPoint2'),

            pt1Params: document.getElementById('pt1Params'),
            pt2Params: document.getElementById('pt2Params'),

            inputs: {
                p1x: document.getElementById('pt1WorldX'),
                p1y: document.getElementById('pt1WorldY'),
                p2x: document.getElementById('pt2WorldX'),
                p2y: document.getElementById('pt2WorldY')
            }
        };

        this.calibrationState = {
            active: false,
            pickingStep: 0, // 1 or 2
            p1: null, // {x, y} map coords
            p2: null
        };

        // Event Listeners
        this.calElements.icon.addEventListener('click', () => {
            this.hideExportModal();
            this.showCalibrationModal();
        });

        this.calElements.btnClose.addEventListener('click', () => this.hideCalibrationModal());
        this.calElements.btnCancel.addEventListener('click', () => this.hideCalibrationModal());

        this.calElements.btnPick1.addEventListener('click', () => this.startPicking(1));
        this.calElements.btnPick2.addEventListener('click', () => this.startPicking(2));

        this.calElements.btnApply.addEventListener('click', () => this.applyCalibration());

        // Input validation to enable Apply button
        Object.values(this.calElements.inputs).forEach(input => {
            input.addEventListener('input', () => this.checkCalibrationReady());
        });

        // Global click handler for picking (delegated from canvas)
        // We'll hook into the generic core onClick or handle it in specific handler
        // For simplicity, we'll use a temporary event listener on the canvas container
    }

    showCalibrationModal() {
        this.calElements.modal.classList.add('visible');
        this.resetCalibrationUI();
    }

    hideCalibrationModal() {
        this.calElements.modal.classList.remove('visible');
        this.calibrationState.active = false;
        this.calibrationState.pickingStep = 0;
        document.body.style.cursor = 'default';
        this.showExportModal(); // Return to export modal
    }

    resetCalibrationUI() {
        this.calibrationState.p1 = null;
        this.calibrationState.p2 = null;
        this.calElements.pt1Params.textContent = '-';
        this.calElements.pt2Params.textContent = '-';
        this.calElements.inputs.p1x.value = '';
        this.calElements.inputs.p1y.value = '';
        this.calElements.inputs.p2x.value = '';
        this.calElements.inputs.p2y.value = '';
        this.checkCalibrationReady();
    }

    startPicking(step) {
        this.calElements.modal.classList.remove('visible'); // Hide modal temporarily
        this.calibrationState.active = true;
        this.calibrationState.pickingStep = step;
        document.body.style.cursor = 'crosshair';

        // Add one-time click listener
        const pickHandler = (e) => {
            if (!this.calibrationState.active) return;

            e.preventDefault();
            e.stopPropagation();

            // Get coords from CanvasCore
            const rect = this.core.canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left - this.core.panX) / this.core.zoom;
            const y = (e.clientY - rect.top - this.core.panY) / this.core.zoom;

            this.handlePickResult(x, y);

            // Cleanup
            this.core.canvas.removeEventListener('click', pickHandler);
            document.body.style.cursor = 'default';
        };

        this.core.canvas.addEventListener('click', pickHandler, { once: true });
    }

    handlePickResult(x, y) {
        const step = this.calibrationState.pickingStep;

        if (step === 1) {
            this.calibrationState.p1 = { x, y };
            this.calElements.pt1Params.textContent = `${Math.round(x)}, ${Math.round(y)}`;
        } else if (step === 2) {
            this.calibrationState.p2 = { x, y };
            this.calElements.pt2Params.textContent = `${Math.round(x)}, ${Math.round(y)}`;
        }

        this.calibrationState.active = false;
        this.calibrationState.pickingStep = 0;
        this.calElements.modal.classList.add('visible'); // Show modal again
        this.checkCalibrationReady();
    }

    checkCalibrationReady() {
        const p1Ready = this.calibrationState.p1 && this.calElements.inputs.p1x.value && this.calElements.inputs.p1y.value;
        const p2Ready = this.calibrationState.p2 && this.calElements.inputs.p2x.value && this.calElements.inputs.p2y.value;

        this.calElements.btnApply.disabled = !(p1Ready && p2Ready);
    }

    applyCalibration() {
        // Calculate Scale and Origin
        const mapP1 = this.calibrationState.p1;
        const mapP2 = this.calibrationState.p2;

        const worldP1 = {
            x: parseFloat(this.calElements.inputs.p1x.value),
            y: parseFloat(this.calElements.inputs.p1y.value)
        };
        const worldP2 = {
            x: parseFloat(this.calElements.inputs.p2x.value),
            y: parseFloat(this.calElements.inputs.p2y.value)
        };

        // Distance in Map Pixels
        const distMap = Utils.distance(mapP1, mapP2);

        // Distance in World Units
        const distWorld = Utils.distance(worldP1, worldP2);

        if (distMap < 1 || distWorld < 0.1) {
            alert("Points are too close together to calibrate accurately.");
            return;
        }

        // Scale = World Units per Pixel
        const scale = distWorld / distMap;

        // Origin Calculation
        // Normal: WorldY = OriginY + (MapY * Scale)  => OriginY = WorldY - (MapY * Scale)
        // Invert: WorldY = OriginY - (MapY * Scale)  => OriginY = WorldY + (MapY * Scale)

        const invertY = this.elements.invertY.checked;

        const originX1 = worldP1.x - (mapP1.x * scale);
        const originX2 = worldP2.x - (mapP2.x * scale);

        let originY1, originY2;

        if (invertY) {
            originY1 = worldP1.y + (mapP1.y * scale);
            originY2 = worldP2.y + (mapP2.y * scale);
        } else {
            originY1 = worldP1.y - (mapP1.y * scale);
            originY2 = worldP2.y - (mapP2.y * scale);
        }

        const originX = (originX1 + originX2) / 2;
        const originY = (originY1 + originY2) / 2;

        // Apply to Export Modal Inputs
        this.elements.mapScale.value = scale.toFixed(4);
        this.elements.originX.value = originX.toFixed(2);
        this.elements.originY.value = originY.toFixed(2);

        this.hideCalibrationModal();
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
            invertY: this.elements.invertY.checked,
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
