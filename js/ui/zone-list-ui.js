/**
 * Zone List UI Module
 * Handles the zone list panel rendering and interactions
 */
class ZoneListUI {
    constructor(app) {
        this.app = app;
        this.elements = null;
    }

    /**
     * Initialize the zone list UI
     * @param {Object} elements - DOM elements for zone list
     */
    init(elements) {
        this.elements = {
            zoneCount: elements.zoneCount,
            zoneList: elements.zoneList
        };
    }

    /**
     * Update the zone list display
     */
    updateZoneList() {
        const zones = this.app.zoneManager.getZones();
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
            <div class="zone-item ${zone.id === this.app.zoneManager.selectedZoneId ? 'selected' : ''}" 
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

        this.attachEventListeners();

        // Initialize new icons
        if (window.lucide) {
            lucide.createIcons();
        }
    }

    /**
     * Attach event listeners to zone list items
     */
    attachEventListeners() {
        // Click handlers for zone items
        this.elements.zoneList.querySelectorAll('.zone-item').forEach(item => {
            // Left click - select
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.zone-visibility')) {
                    if (e.shiftKey && this.app.zoneManager.selectedZoneId) {
                        // Shift+click: toggle multi-select
                        const zoneId = item.dataset.zoneId;
                        const index = this.app.selectedZoneIds.indexOf(zoneId);
                        if (index === -1) {
                            this.app.selectedZoneIds.push(zoneId);
                        } else {
                            this.app.selectedZoneIds.splice(index, 1);
                        }
                        this.updateZoneListSelection();
                    } else {
                        // Normal click: single select
                        this.app.selectedZoneIds = [];
                        this.app.zoneManager.selectZone(item.dataset.zoneId);
                    }
                }
            });

            // Right click - context menu
            item.addEventListener('contextmenu', (e) => {
                this.app.contextMenu.showForZoneItem(e, item.dataset.zoneId);
            });
        });

        // Visibility toggle buttons
        this.elements.zoneList.querySelectorAll('.zone-visibility').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const zone = this.app.zoneManager.getZone(btn.dataset.zoneId);
                if (zone) {
                    this.app.zoneManager.updateZone(zone.id, { visible: !zone.visible });
                    this.updateZoneList();
                }
            });
        });
    }

    /**
     * Update zone list selection highlighting
     */
    updateZoneListSelection() {
        this.elements.zoneList.querySelectorAll('.zone-item').forEach(item => {
            const zoneId = item.dataset.zoneId;
            const isSelected = zoneId === this.app.zoneManager.selectedZoneId;
            const isMultiSelected = this.app.selectedZoneIds.includes(zoneId);

            item.classList.toggle('selected', isSelected);
            item.classList.toggle('multi-selected', isMultiSelected && !isSelected);
        });
    }

    /**
     * Escape HTML entities
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Get SVG icon for visible eye
     * @returns {string} Eye icon HTML
     */
    getEyeIcon() {
        return `<i data-lucide="eye"></i>`;
    }

    /**
     * Get SVG icon for hidden eye
     * @returns {string} Eye-off icon HTML
     */
    getEyeOffIcon() {
        return `<i data-lucide="eye-off"></i>`;
    }
}

// Export for use in other modules
window.ZoneListUI = ZoneListUI;
