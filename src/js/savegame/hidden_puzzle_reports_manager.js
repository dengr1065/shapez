import { ExplainedResult } from "../core/explained_result";
import { ReadWriteProxy } from "../core/read_write_proxy";

export class HiddenPuzzleReportsManager extends ReadWriteProxy {
    constructor(app) {
        super(app, "savegames.bin");

        this.currentData = this.getDefaultData();
    }

    // RW Proxy Impl
    getDefaultData() {
        return {
            version: this.getCurrentVersion(),
            reports: [],
        };
    }

    getCurrentVersion() {
        return 1001;
    }

    verify(data) {
        return ExplainedResult.good();
    }

    migrate(data) {
        return ExplainedResult.good();
    }

    // End rw proxy

    isHidden(report) {
        return this.currentData.reports.includes(report);
    }

    hideReport(report) {
        this.currentData.reports.push(report);
        this.writeAsync();
    }

    // End

    initialize() {
        // First read, then directly write to ensure we have the latest data
        // @ts-ignore
        return this.readAsync().then(() => {
            return this.writeAsync();
        });
    }
}
