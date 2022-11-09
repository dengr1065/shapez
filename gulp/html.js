const buildUtils = require("./buildutils");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function computeIntegrityHash(fullPath, algorithm = "sha256") {
    const file = fs.readFileSync(fullPath);
    const hash = crypto.createHash(algorithm).update(file).digest("base64");
    return algorithm + "-" + hash;
}

/**
 * PROVIDES (per <variant>)
 *
 * html.<variant>.dev
 * html.<variant>.prod
 */
function gulptasksHTML($, gulp, buildFolder) {
    async function buildHtml({ integrity = true }) {
        return gulp
            .src("../src/html/index.html")
            .pipe(
                $.dom(
                    /** @this {Document} **/ function () {
                        const document = this;

                        // Append css
                        const css = document.createElement("link");
                        css.rel = "stylesheet";
                        css.media = "none";
                        css.setAttribute("onload", "this.media='all'");
                        css.href = "main.css";

                        if (integrity) {
                            css.setAttribute(
                                "integrity",
                                computeIntegrityHash(path.join(buildFolder, "main.css"))
                            );
                        }
                        document.head.appendChild(css);

                        let fontCss = `
                        @font-face {
                            font-family: "GameFont";
                            font-style: normal;
                            font-weight: normal;
                            font-display: swap;
                            src: url('res/fonts/GameFont.woff2') format("woff2");
                        }
                        `;
                        let loadingCss =
                            fontCss +
                            fs.readFileSync(path.join(__dirname, "preloader", "preloader.css")).toString();

                        const style = document.createElement("style");
                        style.textContent = loadingCss;
                        document.head.appendChild(style);

                        let bodyContent = fs
                            .readFileSync(path.join(__dirname, "preloader", "preloader.html"))
                            .toString();

                        // Append loader, but not in standalone (directly include bundle there)
                        const bundleScript = document.createElement("script");
                        bundleScript.src = "bundle.js";

                        if (integrity) {
                            bundleScript.setAttribute(
                                "integrity",
                                computeIntegrityHash(path.join(buildFolder, "bundle.js"))
                            );
                        }
                        document.head.appendChild(bundleScript);

                        document.body.innerHTML = bodyContent;
                    }
                )
            )
            .pipe(
                $.htmlmin({
                    caseSensitive: true,
                    collapseBooleanAttributes: true,
                    collapseInlineTagWhitespace: true,
                    collapseWhitespace: true,
                    preserveLineBreaks: true,
                    minifyJS: true,
                    minifyCSS: true,
                    quoteCharacter: '"',
                    useShortDoctype: true,
                })
            )
            .pipe($.htmlBeautify())
            .pipe($.rename("index.html"))
            .pipe(gulp.dest(buildFolder));
    }

    gulp.task("html.dev", () => {
        return buildHtml({ integrity: false });
    });

    gulp.task("html", () => {
        return buildHtml({ integrity: true });
    });
}

module.exports = {
    gulptasksHTML,
};
