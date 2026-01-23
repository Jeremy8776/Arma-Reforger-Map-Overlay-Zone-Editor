/**
 * History Manager Module
 * Handles undo/redo functionality and history state management
 */
class HistoryManager {
    /**
     * Create a new HistoryManager
     * @param {Function} getZonesCallback - Function to get current zones state
     * @param {Function} setZonesCallback - Function to set zones state
     */
    constructor(getZonesCallback, setZonesCallback) {
        this.getZones = getZonesCallback;
        this.setZones = setZonesCallback;
        this.history = [];
        this.historyIndex = -1;
        this.maxHistory = 50;

        // Callbacks
        this.onHistoryChanged = null;
    }

    /**
     * Get the current history array
     * @returns {Array} The history array
     */
    getHistory() {
        return this.history;
    }

    /**
     * Get the current history index
     * @returns {number} The current history index
     */
    getHistoryIndex() {
        return this.historyIndex;
    }

    /**
     * Set the history state (used when switching tabs)
     * @param {Array} history - History array
     * @param {number} historyIndex - Current history index
     */
    setHistory(history, historyIndex) {
        this.history = [...history];
        this.historyIndex = historyIndex;
    }

    /**
     * Save the current state to history
     */
    saveHistory() {
        // Remove any redo states (states after current index)
        this.history = this.history.slice(0, this.historyIndex + 1);

        // Save current state
        const state = Utils.deepClone(this.getZones());
        this.history.push(state);

        // Limit history size
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        } else {
            this.historyIndex++;
        }

        this.notifyHistoryChanged();
    }

    /**
     * Check if undo is available
     * @returns {boolean} True if can undo
     */
    canUndo() {
        return this.historyIndex > 0;
    }

    /**
     * Check if redo is available
     * @returns {boolean} True if can redo
     */
    canRedo() {
        return this.historyIndex < this.history.length - 1;
    }

    /**
     * Undo the last action
     * @returns {boolean} True if undo was performed
     */
    undo() {
        if (!this.canUndo()) return false;

        this.historyIndex--;
        const state = Utils.deepClone(this.history[this.historyIndex]);
        this.setZones(state);
        this.notifyHistoryChanged();
        return true;
    }

    /**
     * Redo the last undone action
     * @returns {boolean} True if redo was performed
     */
    redo() {
        if (!this.canRedo()) return false;

        this.historyIndex++;
        const state = Utils.deepClone(this.history[this.historyIndex]);
        this.setZones(state);
        this.notifyHistoryChanged();
        return true;
    }

    /**
     * Clear all history
     */
    clear() {
        this.history = [];
        this.historyIndex = -1;
        this.notifyHistoryChanged();
    }

    /**
     * Notify listeners of history change
     */
    notifyHistoryChanged() {
        if (this.onHistoryChanged) {
            this.onHistoryChanged();
        }
    }
}

// Export for use in other modules
window.HistoryManager = HistoryManager;
