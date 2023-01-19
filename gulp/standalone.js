require("colors");
const packager = require("electron-packager");
const pj = require("../electron/package.json");
const path = require("path");
const { getVersion } = require("./buildutils");
const fs = require("fs");
const fse = require("fs-extra");
const buildutils = require("./buildutils");
const execSync = require("child_process").execSync;
const electronNotarize = require("electron-notarize");
const { BUILD_VARIANTS } = require("./build_variants");

function gulptasksStandalone($, gulp) {
    for (const variant in BUILD_VARIANTS) {
        const variantData = BUILD_VARIANTS[variant];
        if (!variantData.standalone) {
            continue;
        }
        const tempDestDir = path.join(__dirname, "..", "build_output", variant);
        const taskPrefix = "standalone." + variant;
        const electronBaseDir = path.join(__dirname, "..", variantData.electronBaseDir || "electron");
        const tempDestBuildDir = path.join(tempDestDir, "built");

        gulp.task(taskPrefix + ".prepare.cleanup", () => {
            return gulp.src(tempDestDir, { read: false, allowEmpty: true }).pipe($.clean({ force: true }));
        });

        gulp.task(taskPrefix + ".prepare.copyPrefab", () => {
            const requiredFiles = [
                path.join(electronBaseDir, "src", "**", "*.*"),
                path.join(electronBaseDir, "node_modules", "**", "*.*"),
                path.join(electronBaseDir, "node_modules", "**", ".*"),
                path.join(electronBaseDir, "wegame_sdk", "**", "*.*"),
                path.join(electronBaseDir, "wegame_sdk", "**", ".*"),
                path.join(electronBaseDir, "favicon*"),
            ];
            return gulp.src(requiredFiles, { base: electronBaseDir }).pipe(gulp.dest(tempDestBuildDir));
        });

        gulp.task(taskPrefix + ".prepare.writeAppId", cb => {
            // no-op
            cb();
        });

        gulp.task(taskPrefix + ".prepare.writePackageJson", cb => {
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

            fs.writeFileSync(path.join(tempDestBuildDir, "package.json"), packageJsonString);

            cb();
        });

        gulp.task(taskPrefix + ".prepare.minifyCode", () => {
            return gulp.src(path.join(electronBaseDir, "*.js")).pipe(gulp.dest(tempDestBuildDir));
        });

        gulp.task(taskPrefix + ".prepare.copyGamefiles", () => {
            return gulp.src("../build/**/*.*", { base: "../build" }).pipe(gulp.dest(tempDestBuildDir));
        });

        gulp.task(taskPrefix + ".killRunningInstances", cb => {
            // no-op
            cb();
        });

        gulp.task(
            taskPrefix + ".prepare",
            gulp.series(
                taskPrefix + ".killRunningInstances",
                taskPrefix + ".prepare.cleanup",
                taskPrefix + ".prepare.copyPrefab",
                taskPrefix + ".prepare.writePackageJson",
                taskPrefix + ".prepare.minifyCode",
                taskPrefix + ".prepare.copyGamefiles",
                taskPrefix + ".prepare.writeAppId"
            )
        );

        /**
         *
         * @param {'win32'|'linux'|'darwin'} platform
         * @param {'x64'|'ia32'} arch
         * @param {function():void} cb
         */
        function packageStandalone(platform, arch, cb, isRelease = true) {
            packager({
                dir: tempDestBuildDir,
                appCopyright: "tobspr Games",
                appVersion: getVersion(),
                buildVersion: "1.0.0",
                arch,
                platform,
                asar: true,
                executableName: "shapezio",
                icon: path.join(electronBaseDir, "favicon"),
                name: "shapez",
                out: tempDestDir,
                overwrite: true,
                appBundleId: "tobspr.shapezio." + variant,
                appCategoryType: "public.app-category.games",
            }).then(
                appPaths => {
                    console.log("Packages created:", appPaths);
                    appPaths.forEach(appPath => {
                        if (!fs.existsSync(appPath)) {
                            console.error("Bad app path:", appPath);
                            return;
                        }

                        if (variantData.steamAppId) {
                            fs.writeFileSync(
                                path.join(appPath, "LICENSE"),
                                fs.readFileSync(path.join(__dirname, "..", "LICENSE"))
                            );
                        }
                    });

                    cb();
                },
                err => {
                    console.error("Packaging error:", err);
                    cb();
                }
            );
        }

        // Manual signing with patched @electron/osx-sign (we need --no-strict)
        gulp.task(taskPrefix + ".package.darwin64", cb => packageStandalone("darwin", "x64", cb));
        gulp.task(taskPrefix + ".package.win64", cb => packageStandalone("win32", "x64", cb));
        gulp.task(taskPrefix + ".package.linux64", cb => packageStandalone("linux", "x64", cb));
    }

    // Steam helpers
    gulp.task("standalone.prepareVDF", cb => {
        const hash = buildutils.getRevision();
        const version = buildutils.getVersion();

        // for (const platform of ["steampipe", "steampipe-darwin"]) {
        const templatesSource = path.join(__dirname, "steampipe", "templates");
        const templatesDest = path.join(__dirname, "steampipe", "built_vdfs");

        const variables = {
            PROJECT_DIR: path.resolve(path.join(__dirname, "..")).replace(/\\/g, "/"),
            BUNDLE_DIR: path.resolve(path.join(__dirname, "..", "build_output")).replace(/\\/g, "/"),

            TMP_DIR: path.resolve(path.join(__dirname, "steampipe", "tmp")).replace(/\\/g, "/"),
            // BUILD_DESC: "v" + version + " @ " + hash,
            VDF_DIR: path.resolve(path.join(__dirname, "steampipe", "built_vdfs")).replace(/\\/g, "/"),
        };

        const files = fs.readdirSync(templatesSource);
        for (const file of files) {
            if (!file.endsWith(".vdf")) {
                continue;
            }

            variables.BUILD_DESC = file.replace(".vdf", "") + " - v" + version + " @ " + hash;

            let content = fs.readFileSync(path.join(templatesSource, file)).toString("utf-8");
            content = content.replace(/\$([^$]+)\$/gi, (_, variable) => {
                if (!variables[variable]) {
                    throw new Error("Unknown variable " + variable + " in " + file);
                }

                return variables[variable];
            });

            fs.writeFileSync(path.join(templatesDest, file), content, { encoding: "utf8" });
        }
        cb();
    });
}

module.exports = { gulptasksStandalone };
