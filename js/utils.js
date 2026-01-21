/**
 * Arma Reforger Map Overlay Zone Editor
 * Utility Functions
 */

const Utils = {
    /**
     * Generate a unique ID for zones
     */
    generateId() {
        return 'zone_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    },

    /**
     * Parse DDS/EDDS file header and extract image data
     * EDDS is Enfusion's texture format (DDS with custom header)
     */
    async parseDDSFile(file) {
        const buffer = await file.arrayBuffer();
        const dataView = new DataView(buffer);
        
        // Check for EDDS magic number (Enfusion specific)
        const magic = dataView.getUint32(0, true);
        
        let offset = 0;
        
        // EDDS files may have additional header
        if (magic === 0x53444445) { // 'EDDS' in little-endian
            // Skip EDDS header (typically 8 bytes)
            offset = 8;
        }
        
        // Check for DDS magic ('DDS ')
        const ddsMagic = dataView.getUint32(offset, true);
        if (ddsMagic !== 0x20534444) {
            throw new Error('Invalid DDS file format');
        }
        
        // Read DDS header
        const headerSize = dataView.getUint32(offset + 4, true);
        const flags = dataView.getUint32(offset + 8, true);
        const height = dataView.getUint32(offset + 12, true);
        const width = dataView.getUint32(offset + 16, true);
        
        // Read pixel format
        const pfFlags = dataView.getUint32(offset + 80, true);
        const fourCC = dataView.getUint32(offset + 84, true);
        
        // For basic DDS files, try to extract RGB data
        // This is a simplified parser - full DDS support would need more formats
        const dataOffset = offset + 4 + headerSize;
        const imageData = new Uint8Array(buffer, dataOffset);
        
        return {
            width,
            height,
            data: imageData,
            format: this.getFourCCString(fourCC)
        };
    },

    /**
     * Convert FourCC code to string
     */
    getFourCCString(fourCC) {
        return String.fromCharCode(
            fourCC & 0xFF,
            (fourCC >> 8) & 0xFF,
            (fourCC >> 16) & 0xFF,
            (fourCC >> 24) & 0xFF
        );
    },

    /**
     * Convert DDS data to canvas-compatible ImageData
     * Supports basic uncompressed formats
     */
    ddsToImageData(ddsInfo) {
        const { width, height, data } = ddsInfo;
        const imageData = new ImageData(width, height);
        const pixels = imageData.data;
        
        // Assuming BGRA format (common in DDS)
        for (let i = 0, j = 0; i < data.length && j < pixels.length; i += 4, j += 4) {
            pixels[j] = data[i + 2];     // R (from B)
            pixels[j + 1] = data[i + 1]; // G
            pixels[j + 2] = data[i];     // B (from R)
            pixels[j + 3] = data[i + 3] || 255; // A
        }
        
        return imageData;
    },

    /**
     * Load an image file and return as HTMLImageElement
     */
    loadImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    /**
     * Convert hex color to RGBA
     */
    hexToRgba(hex, opacity = 1) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) return null;
        
        const r = parseInt(result[1], 16);
        const g = parseInt(result[2], 16);
        const b = parseInt(result[3], 16);
        
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    },

    /**
     * Convert RGBA to hex (without alpha)
     */
    rgbaToHex(rgba) {
        const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (!match) return '#000000';
        
        const toHex = (n) => parseInt(n).toString(16).padStart(2, '0');
        return `#${toHex(match[1])}${toHex(match[2])}${toHex(match[3])}`;
    },

    /**
     * Get zone type display name
     */
    getZoneTypeName(type) {
        const types = {
            'safe': 'Safe Zone',
            'restricted': 'Restricted',
            'pvp': 'PvP Zone',
            'spawn': 'Spawn Area',
            'objective': 'Objective',
            'custom': 'Custom'
        };
        return types[type] || type;
    },

    /**
     * Get default color for zone type
     */
    getZoneTypeColor(type) {
        const colors = {
            'safe': '#00ff88',
            'restricted': '#ff4757',
            'pvp': '#ff6b35',
            'spawn': '#3498db',
            'objective': '#9b59b6',
            'custom': '#f1c40f'
        };
        return colors[type] || '#00ff88';
    },

    /**
     * Calculate distance between two points
     */
    distance(p1, p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        return Math.sqrt(dx * dx + dy * dy);
    },

    /**
     * Check if point is inside a polygon
     */
    pointInPolygon(point, polygon) {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[j].x, yj = polygon[j].y;
            
            if (((yi > point.y) !== (yj > point.y)) &&
                (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }
        return inside;
    },

    /**
     * Check if point is inside a rectangle
     */
    pointInRect(point, rect) {
        return point.x >= rect.x &&
               point.x <= rect.x + rect.width &&
               point.y >= rect.y &&
               point.y <= rect.y + rect.height;
    },

    /**
     * Check if point is inside a circle
     */
    pointInCircle(point, center, radius) {
        return this.distance(point, center) <= radius;
    },

    /**
     * Get bounding box of a polygon
     */
    getPolygonBounds(points) {
        if (!points || points.length === 0) return null;
        
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        for (const p of points) {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        }
        
        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    },

    /**
     * Format coordinates for display
     */
    formatCoord(value) {
        return Math.round(value).toString().padStart(4, '0');
    },

    /**
     * Clamp a value between min and max
     */
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    },

    /**
     * Deep clone an object
     */
    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    },

    /**
     * Debounce a function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Download a file
     */
    downloadFile(content, filename, mimeType = 'text/plain') {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },

    /**
     * Download a canvas as PNG
     */
    downloadCanvas(canvas, filename) {
        const link = document.createElement('a');
        link.download = filename;
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

// Export for use in other modules
window.Utils = Utils;
