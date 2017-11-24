import { resolve } from "path";

export const PROJECT_DIR = process.env.INIT_CWD || __dirname;
export const REPORT_DIR = resolve(PROJECT_DIR, "verify-report");
export const TIMELINE_FILENAME = "timeline.html";
export const JSON_REPORT_FILENAME = "final-report.json";
export const BUILD_REPORT_FILENAME = "build-report.json";
export const HTML_REPORT_FILENAME = "sunburst-report.html";

export const TIMELINE_REPORT_DIR = PROJECT_DIR;
export const BUNDLE_REPORT_DIR = resolve(PROJECT_DIR, "report");
export const PLATFORMS_DIR = resolve(PROJECT_DIR, "platforms");
export const BUNDLE_ANALYZER = {
    dir: resolve(PROJECT_DIR, "report"),
    files: {
        stats: "stats.json",
        heatmap: "report.html"
    }
};

export const WEBPACK_PLUGIN = "nativescript-dev-webpack";
export const VERIFY_WEBPACK_SCRIPT = "ns-verify-bundle";
export const UPDATE_WEBPACK_SCRIPT = "update-ns-webpack";
export const WEBPACK_HELPER_SCRIPTS = [ VERIFY_WEBPACK_SCRIPT, UPDATE_WEBPACK_SCRIPT ]
    .reduce(addScript, {});

export const UPDATE_NG_SCRIPT = "update-app-ng-deps";
export const NG_HELPER_SCRIPTS = [ UPDATE_NG_SCRIPT ].reduce(addScript, {});

function addScript(scripts, current) {
    scripts[current] = current;
    return scripts;
}

export const noBundleBuild = (platform, tnsOptions) =>
    `tns build ${platform} ${tnsOptions}`;

export const bundleBuild = (platform, tnsOptions) =>
    `${noBundleBuild(platform, tnsOptions)} --bundle`;

export const noBundleRun = (platform, tnsOptions) =>
    `tns run ${platform} ${tnsOptions}`;

export const bundleRun = (platform, tnsOptions) =>
    `${noBundleRun(platform, tnsOptions)} --bundle`;

