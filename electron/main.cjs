const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        title: "EFOUR POS",
        icon: path.join(__dirname, app.isPackaged ? '../dist/E4LOGO.jpeg' : '../public/E4LOGO.jpeg'), // Correct path for development and production
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    // In production, load the built index.html
    // In dev, you might want to load localhost, but for the packaged app we use the file.
    if (app.isPackaged) {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    } else {
        // Fallback or dev mode
        mainWindow.loadURL('http://localhost:5173');
    }

    // Uncomment to open DevTools automatically
    // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
