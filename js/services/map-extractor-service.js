/**
 * Map Extractor Service
 * Interface for the Map Extractor Tool
 */
class MapExtractorService {
    constructor(app) {
        this.app = app;
        this.config = {
            scanDir: '',
            outputDir: '',
            toolsDir: 'tools',
            gameDir: ''
        };
    }

    /**
     * Set default output directory based on environment
     */
    init() {
        // In a real browser we can't do much with local paths, 
        // but we can store them in localStorage for the user's convenience.
        const savedScan = localStorage.getItem('extractor_scanDir');
        if (savedScan) this.config.scanDir = savedScan;

        const savedOut = localStorage.getItem('extractor_outputDir');
        if (savedOut) this.config.outputDir = savedOut;

        const savedTools = localStorage.getItem('extractor_toolsDir');
        if (savedTools) this.config.toolsDir = savedTools;
    }

    saveConfig(config) {
        Object.assign(this.config, config);
        localStorage.setItem('extractor_scanDir', this.config.scanDir);
        localStorage.setItem('extractor_outputDir', this.config.outputDir);
        localStorage.setItem('extractor_toolsDir', this.config.toolsDir);
    }

    /**
     * Generate the PowerShell command for the user
     */
    generateCommand(searchTerm) {
        // Resolve toolsDir: if it's 'tools', we can try to guess the full path or let the user provide it.
        // For the shell command, we need a full path. 
        // We can use window.location or a placeholder that the user can fix.
        let absoluteToolsDir = this.config.toolsDir;

        // If it looks like a relative path, try to qualify it (best effort for display)
        if (absoluteToolsDir === 'tools' && !absoluteToolsDir.includes(':')) {
            // We assume the user is running from the project root
            absoluteToolsDir = '.\\tools';
        }

        const scriptPath = `${absoluteToolsDir}\\ExtractTexture.ps1`;
        let cmd = `powershell -ExecutionPolicy Bypass -File "${scriptPath}"`;

        if (searchTerm) cmd += ` -ResourcePath "${searchTerm}"`;
        if (this.config.scanDir) cmd += ` -ScanDir "${this.config.scanDir}"`;
        if (this.config.outputDir) cmd += ` -OutputDir "${this.config.outputDir}"`;
        if (this.config.toolsDir) cmd += ` -ToolsDir "${absoluteToolsDir}"`;
        if (this.config.gameDir) cmd += ` -GameDir "${this.config.gameDir}"`;

        return cmd;
    }

    /**
     * In an Electron environment, this would actually run the command.
     * In a browser environment, we might offer to 'Copy to Clipboard'
     */
    async executeExtraction(searchTerm) {
        console.log('Executing extraction for:', searchTerm);
        const command = this.generateCommand(searchTerm);

        // Check if we are in Electron (this is a placeholder for actual IPC)
        if (window.electronAPI) {
            try {
                return await window.electronAPI.runCommand(command);
            } catch (err) {
                throw new Error('Failed to run extraction: ' + err.message);
            }
        } else {
            // Provide the command to the user
            return {
                status: 'manual',
                command: command,
                message: 'Automatic extraction is only available in the Desktop version. Please run this command in your terminal:'
            };
        }
    }
}

window.MapExtractorService = MapExtractorService;
