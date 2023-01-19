const AsyncLock = require("async-lock");
const { ipcMain } = require("electron");
const { existsSync } = require("fs");
const { unlink, readFile, writeFile } = require("fs/promises");
const path = require("path");
const { savesDir } = require("./folders");

const fileLock = new AsyncLock({
    timeout: 30000,
    maxPending: 1000,
});

/**
 * Generic handler for FS jobs.
 * @param {{ type: "read"|"write"|"delete"|"reveal", filename: string, contents?: any }} job
 */
async function onFilesystemJob(_, job) {
    const safeFileName = sanitizeFileName(job.filename);
    const filePath = path.join(savesDir, safeFileName);

    switch (job.type) {
        case "read":
            if (!existsSync(filePath)) {
                // Notify the renderer
                return { error: "file_not_found" };
            }

            return await readFile(filePath, "utf-8");
        case "write":
            await writeFileSafe(filePath, job.contents);
            return job.contents;
        case "delete":
            await unlink(filePath);
            return;
        default:
            throw new Error("Unknown FS job: " + job.type);
    }
}

async function writeFileSafe(file, contents) {
    if (fileLock.isBusy()) {
        console.warn("Concurrent write process on", file);
    }

    fileLock.acquire(file, async () => {
        await writeFile(file, contents, "utf-8");
        return;
    });
}

function sanitizeFileName(filename) {
    return filename.replace(/[^a-z.\-_0-9]/gi, "_");
}

/**
 * Registers IPC handler for filesystem-related tasks.
 */
function initializeFilesystem() {
    ipcMain.handle("fs-job", onFilesystemJob);
}

module.exports = { initializeFilesystem };
