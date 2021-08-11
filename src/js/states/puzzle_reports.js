import { createLogger } from "../core/logging";
import { TextualGameState } from "../core/textual_game_state";
import { enumGameModeIds } from "../game/game_mode";
import { HUDModalDialogs } from "../game/hud/parts/modal_dialogs";
import { ShapeDefinition } from "../game/shape_definition";
import { MUSIC } from "../platform/sound";
import { Savegame } from "../savegame/savegame";
import { T } from "../translations";

const logger = createLogger("puzzle-reports");

export class PuzzleReportsState extends TextualGameState {
    constructor() {
        super("PuzzleReportsState");
    }

    getThemeMusic() {
        return MUSIC.puzzle;
    }

    getStateHeaderTitle() {
        return T.puzzleReports.title;
    }

    getMainContentHTML() {
        return `<div class="puzzleReports">${T.puzzleReports.loadingReports}</div>`;
    }

    /**
     * @param {object} payload
     * @param {string} payload.nextStateId
     */
    onEnter(payload) {
        this.dialogs = new HUDModalDialogs(null, this.app);
        const dialogsElement = document.body.querySelector(".modalDialogParent");
        this.dialogs.initializeToElement(dialogsElement);

        this.language = this.app.settings.getLanguage();

        this.reportsHtml = this.htmlElement.querySelector(".puzzleReports");
        this.loadReports();
    }

    loadReports() {
        this.app.clientApi
            .apiListPuzzleReports()
            .then(reports => reports.filter(r => !this.app.hiddenPuzzleReportsMgr.isHidden(r.shortKey)))
            .then(reports => {
                this.reportsHtml.innerHTML = "";
                reports.forEach(report => this.appendReport(report));
            })
            .catch(error => {
                this.dialogs.showWarning(
                    T.dialogs.puzzleLoadFailed.title,
                    T.dialogs.puzzleLoadFailed.desc + " " + error
                );
            });
    }

    /**
     * @param {import("../savegame/savegame_typedefs").PuzzleReport} report
     */
    appendReport(report) {
        const reportDiv = document.createElement("div");
        reportDiv.classList.add("puzzleReport");

        const definition = ShapeDefinition.fromShortKey(report.shortKey);
        const canvas = definition.generateAsCanvas(100 * this.app.getEffectiveUiScale());

        const icon = document.createElement("div");
        icon.classList.add("icon");
        icon.appendChild(canvas);
        reportDiv.appendChild(icon);

        const reportKey = document.createElement("div");
        reportKey.classList.add("shortKey");
        reportKey.innerText = report.shortKey;
        reportDiv.appendChild(reportKey);

        const reportInfo = document.createElement("div");
        reportInfo.classList.add("reporterName");
        reportInfo.innerText = report.reporterName;
        reportDiv.appendChild(reportInfo);

        const reportReason = document.createElement("div");
        reportReason.innerText = T.dialogs.puzzleReport.options[report.reason];
        reportReason.classList.add("reportReason");
        reportDiv.appendChild(reportReason);

        const reportedDate = document.createElement("div");
        reportedDate.classList.add("reportedDate");
        reportedDate.innerText = report.createdAt.toLocaleString(this.language);
        reportDiv.appendChild(reportedDate);

        const playButton = document.createElement("button");
        playButton.classList.add("styledButton");
        playButton.innerText = T.puzzleMenu.play;
        reportDiv.appendChild(playButton);

        this.trackClicks(playButton, () => this.playPuzzle(report));

        this.reportsHtml.appendChild(reportDiv);
    }

    /**
     * @param {import("../savegame/savegame_typedefs").PuzzleReport} report
     */
    playPuzzle(report) {
        const closeLoading = this.dialogs.showLoadingDialog();

        this.app.clientApi.apiDownloadPuzzleByKey(report.shortKey).then(
            puzzleData => {
                closeLoading();
                logger.log("Got puzzle:", puzzleData);
                this.startLoadedPuzzle(puzzleData);
            },
            err => {
                closeLoading();
                logger.error("Failed to download puzzle", report.shortKey, ":", err);
                this.dialogs.showWarning(
                    T.dialogs.puzzleDownloadError.title,
                    T.dialogs.puzzleDownloadError.desc + " " + err
                );
            }
        );
    }

    createEmptySavegame() {
        return new Savegame(this.app, {
            internalId: "puzzle",
            metaDataRef: {
                internalId: "puzzle",
                lastUpdate: 0,
                version: 0,
                level: 0,
                name: "puzzle",
            },
        });
    }

    /**
     * @param {import("../savegame/savegame_typedefs").PuzzleFullData} puzzle
     */
    startLoadedPuzzle(puzzle) {
        const savegame = this.createEmptySavegame();
        this.moveToState("InGameState", {
            gameModeId: enumGameModeIds.puzzlePlay,
            gameModeParameters: {
                puzzle,
                report: true,
            },
            savegame,
        });
    }

    getDefaultPreviousState() {
        return "PuzzleMenuState";
    }
}
