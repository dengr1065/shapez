import { makeDiv } from "../../../core/utils";
import { BaseHUDPart } from "../base_hud_part";

export class HUDPuzzleBackToMenu extends BaseHUDPart {
    createElements(parent) {
        const key = this.root.gameMode.getId();

        this.element = makeDiv(parent, "ingame_HUD_PuzzleBackToMenu");
        this.button = document.createElement("button");
        this.button.classList.add("button");
        this.element.appendChild(this.button);

        this.trackClicks(this.button, this.back);
    }

    initialize() {}

    back() {
        const gameState = this.root.gameState;
        if (gameState.creationPayload.gameModeParameters.report) {
            const result = confirm("Hide reports for this puzzle?");
            if (result) {
                const key = gameState.creationPayload.gameModeParameters.puzzle.meta.shortKey;
                this.root.app.hiddenPuzzleReportsMgr.hideReport(key);
            }

            gameState.goToReports();
        } else {
            gameState.goBackToMenu();
        }
    }
}
