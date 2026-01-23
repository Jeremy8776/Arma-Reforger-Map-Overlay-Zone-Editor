/**
 * Zone Properties UI Module
 * Handles the zone properties panel rendering and interactions
 */
class ZonePropertiesUI {
    constructor(app) {
        this.app = app;
        this.elements = null;
    }

    /**
     * Initialize the zone properties UI
     * @param {Object} elements - DOM elements for zone properties
     */
    init(elements) {
        this.elements = {
            section: elements.zonePropertiesSection,
            zoneName: elements.zoneName,
            zoneType: elements.zoneType,
            zoneStyle: elements.zoneStyle,
            zoneColor: elements.zoneColor,
            zoneOpacity: elements.zoneOpacity,
            opacityValue: elements.opacityValue,
            zoneCoords: elements.zoneCoords,
            btnDeleteZone: elements.btnDeleteZone,
            // Label styling
            showLabel: elements.showLabel,
            labelColor: elements.labelColor,
            labelBgColor: elements.labelBgColor,
            labelBgOpacity: elements.labelBgOpacity,
            labelBgOpacityValue: elements.labelBgOpacityValue,
            labelSize: elements.labelSize,
            labelShadow: elements.labelShadow
        };

        this.setupEventListeners();
    }

    /**
     * Setup event listeners for zone properties inputs
     */
    setupEventListeners() {
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
    }

    /**
     * Show zone properties for a selected zone
     * @param {Object|null} zone - Zone object or null to hide
     */
    showZoneProperties(zone) {
        if (!zone) {
            this.elements.section.style.display = 'none';
            return;
        }

        this.elements.section.style.display = 'block';
        this.elements.zoneName.value = zone.name;
        this.elements.zoneType.value = zone.type;
        this.elements.zoneStyle.value = zone.style || 'solid';
        this.elements.zoneColor.value = zone.color;
        this.elements.zoneOpacity.value = zone.opacity * 100;
        this.elements.opacityValue.textContent = Math.round(zone.opacity * 100) + '%';

        // Label styling
        this.elements.showLabel.checked = zone.showLabel !== false;
        this.elements.labelColor.value = zone.labelColor || '#ffffff';
        this.elements.labelBgColor.value = zone.labelBgColor || '#000000';
        this.elements.labelBgOpacity.value = (zone.labelBgOpacity !== undefined ? zone.labelBgOpacity * 100 : 70);
        this.elements.labelBgOpacityValue.textContent = this.elements.labelBgOpacity.value + '%';
        this.elements.labelSize.value = zone.labelSize || 'medium';
        this.elements.labelShadow.checked = zone.labelShadow || false;

        this.updateLabelOptionsVisibility();

        // Show coordinates
        this.elements.zoneCoords.innerHTML = this.formatZoneCoords(zone);
    }

    /**
     * Format zone coordinates for display
     * @param {Object} zone - Zone object
     * @returns {string} HTML string of coordinates
     */
    formatZoneCoords(zone) {
        if (zone.shape === 'circle') {
            const cx = zone.cx ?? 0;
            const cy = zone.cy ?? 0;
            const radius = zone.radius ?? 0;
            return `Center: (${cx.toFixed(1)}, ${cy.toFixed(1)})<br>Radius: ${radius.toFixed(1)}`;
        } else if (zone.shape === 'rectangle') {
            const x = zone.x ?? 0;
            const y = zone.y ?? 0;
            const width = zone.width ?? 0;
            const height = zone.height ?? 0;
            return `Position: (${x.toFixed(1)}, ${y.toFixed(1)})<br>Size: ${width.toFixed(1)} × ${height.toFixed(1)}`;
        } else if (zone.shape === 'line') {
            const x1 = zone.x1 ?? 0;
            const y1 = zone.y1 ?? 0;
            const x2 = zone.x2 ?? 0;
            const y2 = zone.y2 ?? 0;
            return `Start: (${x1.toFixed(1)}, ${y1.toFixed(1)})<br>End: (${x2.toFixed(1)}, ${y2.toFixed(1)})`;
        } else if (zone.points) {
            return zone.points.map((p, i) =>
                `P${i + 1}: (${p.x.toFixed(1)}, ${p.y.toFixed(1)})`
            ).join('<br>');
        }
        return '';
    }

    /**
     * Update label options visibility based on showLabel checkbox
     */
    updateLabelOptionsVisibility() {
        const showLabel = this.elements.showLabel.checked;
        document.querySelectorAll('.label-options').forEach(el => {
            el.style.opacity = showLabel ? '1' : '0.4';
            el.style.pointerEvents = showLabel ? 'auto' : 'none';
        });
    }

    /**
     * Update the selected zone with current property values
     */
    updateSelectedZone() {
        if (!this.app.zoneManager.selectedZoneId) return;

        this.app.zoneManager.updateZone(this.app.zoneManager.selectedZoneId, {
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

        // Refresh the properties with updated data
        const zone = this.app.zoneManager.getSelectedZone();
        if (zone) {
            this.showZoneProperties(zone);
        }

        this.app.zoneListUI.updateZoneList();
    }

    /**
     * Delete the currently selected zone
     */
    deleteSelectedZone() {
        if (!this.app.zoneManager.selectedZoneId) return;
        this.app.historyManager.saveHistory();
        this.app.zoneManager.deleteZone(this.app.zoneManager.selectedZoneId);
        this.elements.section.style.display = 'none';
        this.app.zoneListUI.updateZoneList();
        this.app.updateUI();
    }
}

// Export for use in other modules
window.ZonePropertiesUI = ZonePropertiesUI;
