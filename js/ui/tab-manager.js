/**
 * Tab Manager Module
 * Handles tab creation, switching, closing, and state management
 */
class TabManager {
    constructor(app) {
        this.app = app;
        this.tabs = [];
        this.activeTabIndex = -1;
        this.tabBarElement = null;
    }

    /**
     * Initialize the tab manager
     * @param {HTMLElement} tabBarElement - The tab bar container element
     */
    init(tabBarElement) {
        this.tabBarElement = tabBarElement;
    }

    /**
     * Get all tabs
     * @returns {Array} Array of tab objects
     */
    getTabs() {
        return this.tabs;
    }

    /**
     * Get the active tab index
     * @returns {number} Active tab index (-1 if no tabs)
     */
    getActiveTabIndex() {
        return this.activeTabIndex;
    }

    /**
     * Get the active tab
     * @returns {Object|null} Active tab object or null
     */
    getActiveTab() {
        if (this.activeTabIndex === -1 || this.activeTabIndex >= this.tabs.length) {
            return null;
        }
        return this.tabs[this.activeTabIndex];
    }

    /**
     * Create a new tab with the given map image
     * @param {string} name - Tab name (usually filename)
     * @param {HTMLImageElement} image - The map image
     * @param {Array} zones - Optional array of zones to load
     */
    createTab(name, image, zones = []) {
        const newTab = {
            id: Date.now().toString(),
            name: name,
            image: image,
            zones: zones,
            history: [],
            historyIndex: -1,
            view: {
                zoom: 1,
                panX: 0,
                panY: 0
            }
        };

        this.tabs.push(newTab);
        this.switchToTab(this.tabs.length - 1);
    }

    /**
     * Close a tab at the given index
     * @param {number} index - Tab index to close
     * @param {Event} e - Optional event object
     */
    closeTab(index, e) {
        if (e) e.stopPropagation();

        if (index === this.activeTabIndex) {
            // If closing active tab, try to switch to previous or next
            let newIndex = index - 1;
            if (newIndex < 0 && this.tabs.length > 1) {
                newIndex = index + 1;
            }

            this.tabs.splice(index, 1);

            if (this.tabs.length === 0) {
                this.activeTabIndex = -1;
                this.app.showUploadScreen();
            } else {
                this.switchToTab(Math.max(0, Math.min(this.tabs.length - 1, index - 1)));
            }
        } else {
            this.tabs.splice(index, 1);
            if (index < this.activeTabIndex) {
                this.activeTabIndex--;
            }
            this.renderTabs();
        }
    }

    /**
     * Save the current tab's state before switching
     */
    saveCurrentTabState() {
        if (this.activeTabIndex === -1) return;
        const tab = this.tabs[this.activeTabIndex];

        tab.zones = this.app.zoneManager.getZones();
        tab.history = [...this.app.historyManager.getHistory()];
        tab.historyIndex = this.app.historyManager.getHistoryIndex();
        tab.view = {
            zoom: this.app.core.zoom,
            panX: this.app.core.panX,
            panY: this.app.core.panY
        };
    }

    /**
     * Switch to a tab at the given index
     * @param {number} index - Tab index to switch to
     */
    switchToTab(index) {
        if (index < 0 || index >= this.tabs.length) return;

        // Save current tab state if switching from another tab
        if (this.activeTabIndex !== -1 && this.activeTabIndex !== index) {
            this.saveCurrentTabState();
        }

        this.activeTabIndex = index;
        const tab = this.tabs[index];

        // 1. Load Map Image
        this.app.core.loadMap(tab.image);
        this.app.elements.uploadPrompt.style.display = 'none';
        this.app.elements.canvas.classList.add('visible');

        // 2. Restore Zones
        this.app.zoneManager.zones = Utils.deepClone(tab.zones);
        this.app.zoneManager.selectedZoneId = null;

        // 3. Restore History
        this.app.historyManager.setHistory(tab.history, tab.historyIndex);

        // 4. Restore View
        if (tab.view) {
            this.app.core.zoom = tab.view.zoom;
            this.app.core.panX = tab.view.panX;
            this.app.core.panY = tab.view.panY;
            this.app.core.updateTransform && this.app.core.updateTransform();
        }

        // 5. Update UI
        this.app.elements.mapInfo.textContent = `${tab.name} (${tab.image.width}×${tab.image.height})`;
        this.app.zoneListUI.updateZoneList();
        this.renderTabs();
        this.app.core.requestRender();
        this.app.updateUI();
    }

    /**
     * Render the tab bar
     */
    renderTabs() {
        if (!this.tabBarElement) return;

        this.tabBarElement.innerHTML = this.tabs.map((tab, i) => `
            <div class="tab ${i === this.activeTabIndex ? 'active' : ''}" 
                 onclick="app.tabManager.switchToTab(${i})" 
                 ondblclick="app.tabManager.promptRenameTab(${i})">
                <i data-lucide="map" class="tab-icon"></i>
                <span class="tab-title" title="${tab.name}">${this.escapeHtml(tab.name)}</span>
                <div class="tab-close" onclick="app.tabManager.closeTab(${i}, event)" title="Close Tab">
                    <i data-lucide="x" style="width:12px; height:12px;"></i>
                </div>
            </div>
        `).join('') + `
            <div class="tab-new" title="New Tab" onclick="app.tabManager.startNewTab()">
                <i data-lucide="plus"></i>
            </div>
        `;

        if (window.lucide) lucide.createIcons();
    }

    /**
     * Start a new tab (show upload screen)
     */
    startNewTab() {
        this.app.showUploadScreen(true);
    }

    /**
     * Prompt user to rename a tab
     * @param {number} index - Tab index to rename
     */
    promptRenameTab(index) {
        const tab = this.tabs[index];
        if (!tab) return;

        const newName = prompt("Rename Tab:", tab.name);
        if (newName && newName.trim() !== "") {
            tab.name = newName.trim();
            this.renderTabs();

            if (index === this.activeTabIndex) {
                this.app.elements.mapInfo.textContent = `${tab.name} (${tab.image.width}×${tab.image.height})`;
            }
        }
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
}

// Export for use in other modules
window.TabManager = TabManager;
