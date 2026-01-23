/**
 * Zone Renderer Module
 * Handles drawing zones, selection handles, and drawing previews
 */
class ZoneRenderer {
    constructor(canvasCore, zoneManager) {
        this.core = canvasCore;
        this.manager = zoneManager;
    }

    // Note: The render() method was removed as it was never used.
    // The application calls drawZones() and drawSelection() directly for more control.

    drawZones() {
        const ctx = this.core.ctx;
        const zones = this.manager.getZones();

        for (const zone of zones) {
            if (!zone.visible) continue;

            ctx.save();
            ctx.translate(this.core.panX, this.core.panY);
            ctx.scale(this.core.zoom, this.core.zoom);

            let fillStyle;
            if (zone.fillPattern && zone.fillPattern !== 'solid') {
                fillStyle = this.createZonePattern(ctx, zone.fillPattern, zone.color, zone.opacity);
            }
            if (!fillStyle) {
                fillStyle = Utils.hexToRgba(zone.color, zone.opacity);
            }

            const strokeColor = zone.color;
            const isSelected = zone.id === this.manager.selectedZoneId;
            const isHovered = zone.id === this.manager.hoveredZoneId;

            ctx.fillStyle = fillStyle;
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = (isSelected ? 3 : isHovered ? 2 : 1.5) / this.core.zoom;

            // Set line dash based on style
            if (zone.style === 'dashed') {
                ctx.setLineDash([15 / this.core.zoom, 10 / this.core.zoom]);
            } else if (zone.style === 'dotted') {
                ctx.setLineDash([5 / this.core.zoom, 5 / this.core.zoom]);
            } else {
                ctx.setLineDash([]);
            }

            if (zone.shape === 'circle') {
                ctx.beginPath();
                ctx.arc(zone.cx, zone.cy, zone.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            } else if (zone.shape === 'rectangle') {
                // Rectangles have x, y, width, height properties
                ctx.beginPath();
                ctx.rect(zone.x, zone.y, zone.width, zone.height);
                ctx.fill();
                ctx.stroke();
            } else if (zone.shape === 'line') {
                // Lines are rendered as thick strokes
                ctx.lineWidth = (isSelected ? 6 : isHovered ? 5 : 4) / this.core.zoom;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(zone.x1, zone.y1);
                ctx.lineTo(zone.x2, zone.y2);
                ctx.stroke();

                // Draw endpoint circles (Solid)
                ctx.setLineDash([]);
                ctx.fillStyle = strokeColor;
                ctx.beginPath();
                ctx.arc(zone.x1, zone.y1, 4 / this.core.zoom, 0, Math.PI * 2);
                ctx.arc(zone.x2, zone.y2, 4 / this.core.zoom, 0, Math.PI * 2);
                ctx.fill();
            } else if (zone.points && zone.points.length > 0) {
                ctx.beginPath();
                ctx.moveTo(zone.points[0].x, zone.points[0].y);
                for (let i = 1; i < zone.points.length; i++) {
                    ctx.lineTo(zone.points[i].x, zone.points[i].y);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            }

            // Reset dash for labels
            ctx.setLineDash([]);

            // Draw zone label
            if (this.core.zoom > 0.3) {
                this.drawZoneLabel(zone);
            }

            ctx.restore();
        }
    }

    /**
     * Create a pattern for zone filling
     */
    createZonePattern(ctx, type, color, opacity) {
        if (!type || type === 'solid') return null;

        const size = 20;
        const pCanvas = document.createElement('canvas');
        pCanvas.width = size;
        pCanvas.height = size;
        const pCtx = pCanvas.getContext('2d');

        const rgba = Utils.hexToRgba(color, opacity);
        pCtx.strokeStyle = rgba;
        pCtx.fillStyle = rgba;
        pCtx.lineWidth = 2;
        pCtx.lineCap = 'butt';

        pCtx.beginPath();
        switch (type) {
            case 'diagonal_right': // /
                for (let i = -2; i < 3; i++) {
                    let offset = i * 10;
                    pCtx.moveTo(offset, size);
                    pCtx.lineTo(size + offset, 0);
                }
                pCtx.stroke();
                break;
            case 'diagonal_left': // \
                for (let i = -2; i < 3; i++) {
                    let offset = i * 10;
                    pCtx.moveTo(offset, 0);
                    pCtx.lineTo(size + offset, size);
                }
                pCtx.stroke();
                break;
            case 'vertical':
                pCtx.moveTo(size / 2, 0);
                pCtx.lineTo(size / 2, size);
                pCtx.stroke();
                break;
            case 'horizontal':
                pCtx.moveTo(0, size / 2);
                pCtx.lineTo(size, size / 2);
                pCtx.stroke();
                break;
            case 'grid':
                pCtx.moveTo(size / 2, 0); pCtx.lineTo(size / 2, size);
                pCtx.moveTo(0, size / 2); pCtx.lineTo(size, size / 2);
                pCtx.stroke();
                break;
            case 'dots':
                pCtx.arc(size / 2, size / 2, 2, 0, Math.PI * 2);
                pCtx.fill();
                break;
            case 'crosshatch':
                for (let i = -2; i < 3; i++) {
                    let offset = i * 10;
                    pCtx.moveTo(offset, size);
                    pCtx.lineTo(size + offset, 0);
                    pCtx.moveTo(offset, 0);
                    pCtx.lineTo(size + offset, size);
                }
                pCtx.stroke();
                break;
        }

        return ctx.createPattern(pCanvas, 'repeat');
    }

    drawZoneLabel(zone) {
        // Check if label should be shown
        if (zone.showLabel === false) return;

        const ctx = this.core.ctx;
        let centerX, centerY;

        if (zone.shape === 'circle') {
            centerX = zone.cx;
            centerY = zone.cy;
        } else if (zone.shape === 'rectangle') {
            centerX = zone.x + zone.width / 2;
            centerY = zone.y + zone.height / 2;
        } else if (zone.shape === 'line') {
            centerX = (zone.x1 + zone.x2) / 2;
            centerY = (zone.y1 + zone.y2) / 2;
        } else if (zone.points) {
            const bounds = Utils.getPolygonBounds(zone.points);
            centerX = bounds.x + bounds.width / 2;
            centerY = bounds.y + bounds.height / 2;
        } else {
            return;
        }

        // Calculate font size based on labelSize setting
        let baseFontSize;
        switch (zone.labelSize) {
            case 'small': baseFontSize = 10; break;
            case 'large': baseFontSize = 18; break;
            default: baseFontSize = 14; break; // medium
        }
        const fontSize = Math.max(baseFontSize / this.core.zoom, baseFontSize * 0.7);
        ctx.font = `600 ${fontSize}px Rajdhani, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Background/Backdrop
        const textMetrics = ctx.measureText(zone.name);
        const padding = 4 / this.core.zoom;
        const bgWidth = textMetrics.width + padding * 2;
        const bgHeight = fontSize + padding * 2;

        // Use zone's backdrop settings
        const bgOpacity = zone.labelBgOpacity !== undefined ? zone.labelBgOpacity : 0.7;
        const bgColor = zone.labelBgColor || '#000000';

        if (bgOpacity > 0) {
            ctx.fillStyle = Utils.hexToRgba(bgColor, bgOpacity);
            // Add rounded corners for a more polished look
            const radius = 3 / this.core.zoom;
            this.roundRect(ctx, centerX - bgWidth / 2, centerY - bgHeight / 2, bgWidth, bgHeight, radius);
            ctx.fill();
        }

        // Text Shadow
        if (zone.labelShadow) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            ctx.shadowBlur = 4 / this.core.zoom;
            ctx.shadowOffsetX = 1 / this.core.zoom;
            ctx.shadowOffsetY = 1 / this.core.zoom;
        }

        // Text
        ctx.fillStyle = zone.labelColor || '#ffffff';
        ctx.fillText(zone.name, centerX, centerY);

        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
    }

    /**
     * Draw a rounded rectangle
     */
    roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    drawSelection() {
        const selectedZoneId = this.manager.selectedZoneId;
        if (!selectedZoneId) return;

        const zone = this.manager.getZone(selectedZoneId);
        if (!zone) return;

        const ctx = this.core.ctx;
        ctx.save();
        ctx.translate(this.core.panX, this.core.panY);
        ctx.scale(this.core.zoom, this.core.zoom);

        // Selection handles are always solid
        ctx.setLineDash([]);

        const handleSize = 8 / this.core.zoom;
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1 / this.core.zoom;

        if (zone.shape === 'circle') {
            // Draw handles at cardinal points
            const handles = [
                { x: zone.cx + zone.radius, y: zone.cy },
                { x: zone.cx - zone.radius, y: zone.cy },
                { x: zone.cx, y: zone.cy + zone.radius },
                { x: zone.cx, y: zone.cy - zone.radius }
            ];

            for (const handle of handles) {
                ctx.beginPath();
                ctx.rect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize);
                ctx.fill();
                ctx.stroke();
            }
        } else if (zone.shape === 'rectangle') {
            // Draw handles at corners
            const handles = [
                { x: zone.x, y: zone.y },
                { x: zone.x + zone.width, y: zone.y },
                { x: zone.x + zone.width, y: zone.y + zone.height },
                { x: zone.x, y: zone.y + zone.height }
            ];

            for (const handle of handles) {
                ctx.beginPath();
                ctx.rect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize);
                ctx.fill();
                ctx.stroke();
            }
        } else if (zone.points) {
            // Draw handles at vertices
            for (const point of zone.points) {
                ctx.beginPath();
                ctx.rect(point.x - handleSize / 2, point.y - handleSize / 2, handleSize, handleSize);
                ctx.fill();
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    /**
     * Draw the current shape being drawn by a tool
     */
    drawCurrentShape(tool, drawingPoints, tempShape, lastMousePos) {
        if (!tool) return;

        const ctx = this.core.ctx;
        ctx.save();
        ctx.translate(this.core.panX, this.core.panY);
        ctx.scale(this.core.zoom, this.core.zoom);

        ctx.fillStyle = 'rgba(0, 255, 136, 0.3)';
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 2 / this.core.zoom;
        ctx.setLineDash([5 / this.core.zoom, 5 / this.core.zoom]);

        if (tempShape) {
            if (tempShape.type === 'rectangle') {
                ctx.beginPath();
                ctx.rect(tempShape.x, tempShape.y, tempShape.width, tempShape.height);
                ctx.fill();
                ctx.stroke();
            } else if (tempShape.type === 'circle') {
                ctx.beginPath();
                ctx.arc(tempShape.cx, tempShape.cy, tempShape.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            } else if (tempShape.type === 'line') {
                ctx.lineWidth = 3 / this.core.zoom;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(tempShape.x1, tempShape.y1);
                ctx.lineTo(tempShape.x2, tempShape.y2);
                ctx.stroke();

                // Draw endpoint dots
                ctx.setLineDash([]);
                ctx.fillStyle = '#00ff88';
                ctx.beginPath();
                ctx.arc(tempShape.x1, tempShape.y1, 4 / this.core.zoom, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(tempShape.x2, tempShape.y2, 4 / this.core.zoom, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Draw pen path in progress
        if (tool === 'pen' && drawingPoints.length > 0) {
            ctx.beginPath();
            ctx.moveTo(drawingPoints[0].x, drawingPoints[0].y);
            for (let i = 1; i < drawingPoints.length; i++) {
                ctx.lineTo(drawingPoints[i].x, drawingPoints[i].y);
            }
            // Line to current mouse position
            if (lastMousePos) {
                ctx.lineTo(lastMousePos.x, lastMousePos.y);
            }
            ctx.stroke();

            // Draw anchor points
            ctx.fillStyle = '#00ff88';
            ctx.setLineDash([]);
            for (let i = 0; i < drawingPoints.length; i++) {
                const point = drawingPoints[i];
                ctx.beginPath();

                // Highlight start point if hovering to close loop
                if (i === 0 && tool === 'pen' && tempShape && tempShape.closeLoopHover) {
                    ctx.fillStyle = '#ffff00';
                    ctx.arc(point.x, point.y, 8 / this.core.zoom, 0, Math.PI * 2);
                } else {
                    ctx.fillStyle = '#00ff88';
                    ctx.arc(point.x, point.y, 5 / this.core.zoom, 0, Math.PI * 2);
                }

                ctx.fill();
                // Add a border to make points more visible
                ctx.strokeStyle = '#0a0c0f';
                ctx.lineWidth = 1.5 / this.core.zoom;
                ctx.stroke();
            }
        }

        // Draw freehand in progress
        if (tool === 'freehand' && drawingPoints.length > 0) {
            ctx.setLineDash([]); // Solid line for freehand
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';

            ctx.beginPath();
            ctx.moveTo(drawingPoints[0].x, drawingPoints[0].y);
            for (let i = 1; i < drawingPoints.length; i++) {
                ctx.lineTo(drawingPoints[i].x, drawingPoints[i].y);
            }

            // Close the path to show it will form a shape
            if (drawingPoints.length > 2) {
                ctx.lineTo(drawingPoints[0].x, drawingPoints[0].y);
                ctx.fill();
            }
            ctx.stroke();
        }

        ctx.restore();
    }

    /**
     * Export zones as transparent PNG overlay
     */
    exportAsImage() {
        if (!this.core.mapImage) return null;

        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = this.core.mapWidth;
        exportCanvas.height = this.core.mapHeight;
        const ctx = exportCanvas.getContext('2d');

        // Transparent background
        ctx.clearRect(0, 0, this.core.mapWidth, this.core.mapHeight);

        // Draw zones
        const zones = this.manager.getZones();
        for (const zone of zones) {
            if (!zone.visible) continue;

            let fillStyle;
            if (zone.fillPattern && zone.fillPattern !== 'solid') {
                fillStyle = this.createZonePattern(ctx, zone.fillPattern, zone.color, zone.opacity);
            }
            if (!fillStyle) {
                fillStyle = Utils.hexToRgba(zone.color, zone.opacity);
            }
            ctx.fillStyle = fillStyle;
            ctx.strokeStyle = zone.color;
            ctx.lineWidth = 2; // Fixed line width for export

            if (zone.style === 'dashed') {
                ctx.setLineDash([10, 5]);
            } else if (zone.style === 'dotted') {
                ctx.setLineDash([3, 3]);
            } else {
                ctx.setLineDash([]);
            }

            if (zone.shape === 'circle') {
                ctx.beginPath();
                ctx.arc(zone.cx, zone.cy, zone.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            } else if (zone.shape === 'rectangle') {
                ctx.beginPath();
                ctx.rect(zone.x, zone.y, zone.width, zone.height);
                ctx.fill();
                ctx.stroke();
            } else if (zone.shape === 'line') {
                ctx.lineWidth = 4;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(zone.x1, zone.y1);
                ctx.lineTo(zone.x2, zone.y2);
                ctx.stroke();
                // Endpoints
                ctx.setLineDash([]);
                ctx.fillStyle = zone.color;
                ctx.beginPath();
                ctx.arc(zone.x1, zone.y1, 4, 0, Math.PI * 2);
                ctx.arc(zone.x2, zone.y2, 4, 0, Math.PI * 2);
                ctx.fill();
            } else if (zone.points && zone.points.length > 0) {
                ctx.beginPath();
                ctx.moveTo(zone.points[0].x, zone.points[0].y);
                for (let i = 1; i < zone.points.length; i++) {
                    ctx.lineTo(zone.points[i].x, zone.points[i].y);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            }
        }

        return exportCanvas;
    }
}

// Export for use in other modules
window.ZoneRenderer = ZoneRenderer;
