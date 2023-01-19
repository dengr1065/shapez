const { app, BrowserWindow, Menu, ipcMain, shell, session } = require("electron");
const { initializeMenu } = require("./src/menu");
const { initializeSwitches, isLocal, isDev, shouldHideDevtools } = require("./src/switches");
const { initializeFolders } = require("./src/folders");
const { initializeFilesystem } = require("./src/filesystem");
const { showMissingExternalMods, initializeMods } = require("./src/mods");
const path = require("path");
const windowStateKeeper = require("electron-window-state");

/** @type {BrowserWindow} */
let win = null;

async function onReady() {
    // Show external mod errors before we open anything
    await showMissingExternalMods();

    win = createWindow();
    win.once("ready-to-show", () => {
        win.show();

        if (isDev && !shouldHideDevtools) {
            // Show developer tools initially
            win.webContents.toggleDevTools();
        }
    });
    win.on("closed", () => (win = null));

    ipcMain.on("set-fullscreen", (_, flag) => win.setFullScreen(flag));
}

/**
 * Opens a URL in external browser if it's HTTPS, does
 * nothing if it isn't.
 * @param {string} url
 */
function openSecureURL(url) {
    if (!url.startsWith("https://")) {
        return;
    }

    return shell.openExternal(url);
}

function createWindow() {
    let faviconName = "favicon.png";
    if (process.platform === "win32") {
        faviconName = "favicon.ico";
    }

    const mainWindowState = windowStateKeeper({
        defaultWidth: 1000,
        defaultHeight: 800,
    });

    const window = new BrowserWindow({
        x: mainWindowState.x,
        y: mainWindowState.y,
        width: mainWindowState.width,
        height: mainWindowState.height,
        show: false,
        backgroundColor: "#222428",
        minWidth: 800,
        minHeight: 600,
        title: "shapez",
        icon: path.join(__dirname, faviconName),
        autoHideMenuBar: !isDev,
        webPreferences: {
            sandbox: true,
            preload: path.join(__dirname, "src/preload.js"),
        },
    });

    mainWindowState.manage(window);

    if (isLocal) {
        window.loadURL("http://localhost:3005");
    } else {
        window.loadFile("index.html");
    }

    // Disable permission requests
    window.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) => {
        callback(false);
    });

    window.webContents.on("will-navigate", (event, url) => {
        if (url == window.webContents.getURL()) {
            // Allow location.reload()
            return;
        }
    });

    // Filter loading any module via remote;
    // you shouldn't be using remote at all, though
    // https://electronjs.org/docs/tutorial/security#16-filter-the-remote-module
    app.on("remote-require", (event, webContents, moduleName) => {
        event.preventDefault();
    });

    // built-ins are modules such as "app"
    app.on("remote-get-builtin", (event, webContents, moduleName) => {
        event.preventDefault();
    });

    window.webContents.setWindowOpenHandler(({ url }) => {
        openSecureURL(url);
        return { action: "deny" };
    });

    window.webContents.on("will-redirect", event => {
        event.preventDefault();
    });

    if (isDev) {
        initializeMenu(window);
    } else {
        Menu.setApplicationMenu(null);
    }

    return window;
}

initializeSwitches();
initializeFolders();

if (!app.requestSingleInstanceLock()) {
    // Already running
    app.exit();
}

app.on("ready", onReady);
app.on("second-instance", () => {
    // Someone tried to run a second instance, we should focus
    if (win) {
        if (win.isMinimized()) {
            win.restore();
        }
        win.focus();
    }
});

ipcMain.on("restart-app", () => {
    app.relaunch();
    app.exit(0);
});
ipcMain.on("exit-app", () => app.quit());

initializeFilesystem();
initializeMods();
