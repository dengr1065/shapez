const packager = require("electron-packager");
const pj = require("../electron/package.json");
const path = require("path");
const { getVersion } = require("./buildutils");
const fs = require("fs");

let signAsync;
try {
    signAsync = require("tobspr-osx-sign").signAsync;
} catch (ex) {
    console.warn("tobspr-osx-sign not installed, can not create osx builds");
}

function gulptasksStandalone($, gulp) {
    const tempDestDir = path.join(__dirname, "../build_output");
    const electronBaseDir = path.join(__dirname, "../electron");
    const tempDestBuildDir = path.join(tempDestDir, "built");

    gulp.task("standalone.prepare.cleanup", () => {
        return gulp.src(tempDestDir, { read: false, allowEmpty: true }).pipe($.clean({ force: true }));
    });

    gulp.task("standalone.prepare.copyPrefab", () => {
        const requiredFiles = [
            path.join(electronBaseDir, "node_modules", "**", "*.*"),
            path.join(electronBaseDir, "node_modules", "**", ".*"),
            path.join(electronBaseDir, "favicon*"),
        ];
        return gulp.src(requiredFiles, { base: electronBaseDir }).pipe(gulp.dest(tempDestBuildDir));
    });

    gulp.task("standalone.prepare.writePackageJson", cb => {
        const packageJsonString = JSON.stringify(
            {
                scripts: {
                    start: pj.scripts.start,
                },
                devDependencies: pj.devDependencies,
                dependencies: pj.dependencies,
            },
            null,
            4
        );

        fs.writeFile(path.join(tempDestBuildDir, "package.json"), packageJsonString, cb);
    });

    const minifyCode = () => gulp.src(path.join(electronBaseDir, "*.js")).pipe(gulp.dest(tempDestBuildDir));
    const copyGameFiles = () =>
        gulp.src("../build/**/*.*", { base: "../build" }).pipe(gulp.dest(tempDestBuildDir));

    gulp.task(
        "standalone.prepare",
        gulp.series(
            "standalone.prepare.cleanup",
            "standalone.prepare.copyPrefab",
            "standalone.prepare.writePackageJson",
            minifyCode,
            copyGameFiles
        )
    );

    /**
     *
     * @param {'win32'|'linux'|'darwin'} platform
     * @param {'x64'|'ia32'} arch
     * @param {function():void} cb
     */
    async function packageStandalone(platform, arch, cb) {
        packager({
            dir: tempDestBuildDir,
            appCopyright: "tobspr Games",
            appVersion: getVersion(),
            buildVersion: "1.0.0",
            arch,
            platform,
            asar: true,
            icon: path.join(electronBaseDir, "favicon"),
            name: "shapez",
            out: tempDestDir,
            overwrite: true,
            appBundleId: "tobspr.shapez",
        }).then(
            appPaths => {
                console.log("Packages created:", appPaths);
                appPaths.forEach(appPath => {
                    if (!fs.existsSync(appPath)) {
                        console.error("Bad app path:", appPath);
                        return;
                    }

                    fs.writeFileSync(
                        path.join(appPath, "LICENSE"),
                        fs.readFileSync(path.join(__dirname, "..", "LICENSE"))
                    );
                });

                cb();
            },
            err => {
                console.error("Packaging error:", err);
                cb();
            }
        );
    }

    gulp.task("standalone.package.win64", cb => packageStandalone("win32", "x64", cb));
    gulp.task("standalone.package.linux64", cb => packageStandalone("linux", "x64", cb));
    gulp.task(
        "standalone.build",
        gulp.series(
            "standalone.prepare",
            gulp.parallel("standalone.package.win64", "standalone.package.linux64")
        )
    );
}

module.exports = { gulptasksStandalone };
