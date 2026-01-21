/**
 * Select Tool Module
 * Handles selection, dragging zones, and resizing via handles
 */
class SelectTool {
    constructor(canvasCore, zoneManager) {
        this.core = canvasCore;
        this.manager = zoneManager;

        this.isDragging = false;
        this.isDraggingHandle = false;
        this.draggedHandleIndex = -1;
        this.dragStart = null;
        this.dragOffset = { x: 0, y: 0 };
    }

    onDown(mapPos) {
        // First, check if clicking on a handle of the selected zone
        if (this.manager.selectedZoneId) {
            const handleIndex = this.findHandleAtPoint(mapPos);
            if (handleIndex !== -1) {
                this.isDraggingHandle = true;
                this.draggedHandleIndex = handleIndex;
                this.dragStart = mapPos;
                return;
            }
        }

        // Check if clicking on a zone
        const zone = this.manager.findZoneAtPoint(mapPos, this.core.zoom);
        if (zone) {
            // If clicking on already selected zone, start dragging
            if (zone.id === this.manager.selectedZoneId) {
                this.isDragging = true;
                this.dragStart = mapPos;

                // Calculate offset from zone center/position
                if (zone.shape === 'circle') {
                    this.dragOffset = {
                        x: mapPos.x - zone.cx,
                        y: mapPos.y - zone.cy
                    };
                } else if (zone.points) {
                    const bounds = Utils.getPolygonBounds(zone.points);
                    this.dragOffset = {
                        x: mapPos.x - bounds.x,
                        y: mapPos.y - bounds.y
                    };
                }
            } else {
                // Select the zone
                this.manager.selectZone(zone.id);
            }
        } else {
            this.manager.selectZone(null);
        }
        this.core.requestRender();
    }

    onMove(mapPos) {
        if (this.isDraggingHandle && this.manager.selectedZoneId) {
            this.dragHandle(mapPos);
            this.core.requestRender();
        } else if (this.isDragging && this.manager.selectedZoneId) {
            this.dragZone(mapPos);
            this.core.requestRender();
        } else {
            // Handle hover and cursor updates
            const hoveredZone = this.manager.findZoneAtPoint(mapPos, this.core.zoom);
            if (hoveredZone && hoveredZone.id !== this.manager.hoveredZoneId) {
                this.manager.setHoveredZone(hoveredZone.id);
            } else if (!hoveredZone && this.manager.hoveredZoneId) {
                this.manager.setHoveredZone(null);
            }

            this.updateCursor(mapPos);
        }
    }

    onUp(mapPos) {
        if (this.isDragging || this.isDraggingHandle) {
            // Trigger update callback
            const zone = this.manager.getSelectedZone();
            if (zone && this.manager.onZoneUpdated) {
                this.manager.onZoneUpdated(zone);
            }
        }

        this.isDragging = false;
        this.isDraggingHandle = false;
        this.draggedHandleIndex = -1;
        this.dragStart = null;
    }

    cancel() {
        this.isDragging = false;
        this.isDraggingHandle = false;
        this.dragStart = null;
    }

    /**
     * Find if a handle is at the given point
     */
    findHandleAtPoint(point) {
        const zone = this.manager.getSelectedZone();
        if (!zone) return -1;

        const handleSize = 12 / this.core.zoom; // Slightly larger hit area

        if (zone.shape === 'circle') {
            const handles = [
                { x: zone.cx + zone.radius, y: zone.cy },
                { x: zone.cx - zone.radius, y: zone.cy },
                { x: zone.cx, y: zone.cy + zone.radius },
                { x: zone.cx, y: zone.cy - zone.radius }
            ];
            for (let i = 0; i < handles.length; i++) {
                if (Math.abs(point.x - handles[i].x) < handleSize &&
                    Math.abs(point.y - handles[i].y) < handleSize) {
                    return i;
                }
            }
        } else if (zone.points) {
            for (let i = 0; i < zone.points.length; i++) {
                if (Math.abs(point.x - zone.points[i].x) < handleSize &&
                    Math.abs(point.y - zone.points[i].y) < handleSize) {
                    return i;
                }
            }
        }

        return -1;
    }

    dragHandle(mapPos) {
        const zone = this.manager.getSelectedZone();
        if (!zone) return;

        if (zone.shape === 'circle') {
            zone.radius = Utils.distance({ x: zone.cx, y: zone.cy }, mapPos);
        } else if (zone.points && this.draggedHandleIndex >= 0) {
            zone.points[this.draggedHandleIndex] = { x: mapPos.x, y: mapPos.y };
        }
    }

    dragZone(mapPos) {
        const zone = this.manager.getSelectedZone();
        if (!zone || !this.dragStart) return;

        const dx = mapPos.x - this.dragStart.x;
        const dy = mapPos.y - this.dragStart.y;

        if (zone.shape === 'circle') {
            zone.cx += dx;
            zone.cy += dy;
        } else if (zone.points) {
            for (const point of zone.points) {
                point.x += dx;
                point.y += dy;
            }
        }

        this.dragStart = mapPos;
    }

    updateCursor(mapPos) {
        const container = this.core.container;

        // Handle
        if (this.manager.selectedZoneId) {
            if (this.findHandleAtPoint(mapPos) !== -1) {
                container.style.cursor = 'nwse-resize';
                return;
            }
        }

        // Zone
        const zone = this.manager.findZoneAtPoint(mapPos, this.core.zoom);
        if (zone) {
            container.style.cursor = zone.id === this.manager.selectedZoneId ? 'move' : 'pointer';
        } else {
            container.style.cursor = 'default';
        }
    }
}
