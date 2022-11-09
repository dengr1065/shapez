const path = require("path");
const fs = require("fs");
const gulpYaml = require("gulp-yaml");
const YAML = require("yaml");
const stripIndent = require("strip-indent");

const translationsSourceDir = path.join(__dirname, "..", "translations");
const translationsJsonDir = path.join(__dirname, "..", "src", "js", "built-temp");

function gulptasksTranslations($, gulp) {
    gulp.task("translations.fullBuild", () => {
        return gulp
            .src(path.join(translationsSourceDir, "*.yaml"))
            .pipe($.plumber())
            .pipe(gulpYaml({ space: 2, safe: true }))
            .pipe(gulp.dest(translationsJsonDir));
    });
}

module.exports = {
    gulptasksTranslations,
};
