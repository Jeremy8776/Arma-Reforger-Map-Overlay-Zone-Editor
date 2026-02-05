const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1366,
        height: 900,
        minWidth: 1024,
        minHeight: 768,
        icon: path.join(__dirname, 'logo-icon.png'),
        frame: false, // Custom frameless UI
        titleBarStyle: 'hidden',
        transparent: true,
        backgroundColor: '#00000000', // Set to fully transparent to allow CSS corners
        titleBarOverlay: {
            color: '#12151a',
            symbolColor: '#00ff88',
            height: 35
        },
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
        title: 'ARMOZE'
    });

    mainWindow.on('maximize', () => {
        mainWindow.webContents.send('window-state', 'maximized');
    });

    mainWindow.on('unmaximize', () => {
        mainWindow.webContents.send('window-state', 'restored');
    });

    mainWindow.setMenuBarVisibility(false);
    mainWindow.loadFile('index.html');
    mainWindow.maximize();

    // Optional: Open DevTools
    // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
    // Set for Windows Taskbar Icon grouping
    app.setAppUserModelId('com.armoze.editor');
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

// Store active process to allow input
let activeChild = null;

// IPC Handler for running commands
ipcMain.handle('run-command', async (event, command) => {
    return new Promise((resolve, reject) => {
        // Kill existing process if any (though UI prevents this usually)
        if (activeChild) {
            try { activeChild.kill(); } catch (e) { }
        }

        const child = spawn(command, {
            shell: true,
            windowsHide: true,
            env: { ...process.env, FORCE_COLOR: '1' } // Force color for nicer output parsing if supported
        });

        activeChild = child;
        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => {
            const str = data.toString();
            stdout += str;
            event.sender.send('command-output', { type: 'stdout', data: str });
        });

        child.stderr.on('data', (data) => {
            const str = data.toString();
            stderr += str;
            event.sender.send('command-output', { type: 'stderr', data: str });
        });

        child.on('close', (code) => {
            activeChild = null;
            if (code === 0) {
                resolve({ stdout, stderr });
            } else {
                reject(new Error(`Exit code ${code}`));
            }
        });

        child.on('error', (err) => {
            activeChild = null;
            reject(err);
        });
    });
});

// IPC Handler for sending input to the running command
ipcMain.handle('send-command-input', async (event, input) => {
    if (activeChild && activeChild.stdin) {
        activeChild.stdin.write(input + '\n');
        return true;
    }
    return false;
});

// IPC Handler for folder selection
ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openDirectory']
    });
    if (result.canceled) {
        return null;
    } else {
        return result.filePaths[0];
    }
});

// IPC Handler for getting default downloads path
ipcMain.handle('get-downloads-path', () => {
    return app.getPath('downloads');
});

// IPC Handler for clipboard
const { clipboard } = require('electron');
ipcMain.handle('write-clipboard', (event, text) => {
    clipboard.writeText(text);
    return true;
});

// IPC Handler for opening paths
const { shell } = require('electron');
ipcMain.handle('open-path', async (event, pathStr) => {
    await shell.openPath(pathStr);
});
