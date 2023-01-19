const { app, ipcMain, shell } = require("electron");
const { mkdirSync } = require("fs");
const path = require("path");

const appData = path.join(app.getPath("appData"), "shapez");
const savesDir = path.join(appData, "saves");
const modsDir = path.join(appData, "mods");

// Here, { recursive: true } permits omitting existsSync check
mkdirSync(savesDir, { recursive: true });
mkdirSync(modsDir, { recursive: true });

// Folders need to exist before it is possible to set them
app.setPath("userData", appData);

/**
 * Sets IPC handler to open various folders.
 */
function initializeFolders() {
    ipcMain.handle("open-folder", (_, folder) => {
        const folderPath = {
            saves: savesDir,
            mods: modsDir,
        }[folder];

        if (folderPath === undefined) {
            // Asked to open unknown folder
            return;
        }
        return shell.openPath(folderPath);
    });

    ipcMain.handle("open-mods-folder", () => {
        return shell.openPath(modsDir);
    });
}

module.exports = {
    initializeFolders,
    savesDir,
    modsDir,
};
