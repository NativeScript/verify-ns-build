import { resolve } from "path";

export const PROJECT_DIR = process.env.INIT_CWD || __dirname;
export const REPORT_DIR = resolve(PROJECT_DIR, "verify-report");
export const TIMELINE_FILENAME = "timeline.html";
export const BUILD_REPORT_FILENAME = "build-report.json";

export const BUNDLE_REPORT_DIR = resolve(PROJECT_DIR, "report");
export const BUNDLE_ANALYZER = {
    dir: resolve(PROJECT_DIR, "report"),
    files: {
        stats: "stats.json",
        heatmap: "report.html"
    }
};

export const TIMELINE_REPORT_DIR = PROJECT_DIR;

export const VERIFY_WEBPACK_SCRIPT = "ns-verify-bundle";
export const UPDATE_WEBPACK_SCRIPT = "update-ns-webpack";
export const WEBPACK_HELPER_SCRIPTS = [ VERIFY_WEBPACK_SCRIPT, UPDATE_WEBPACK_SCRIPT ]
    .reduce(addScript, {});

function addScript(scripts, current) {
    scripts[current] = current;
    return scripts;
}

export const bundleBuild = (platform, tnsOptions) =>
    `npm run build-${platform}-bundle -- ${tnsOptions}`;

export const noBundleBuild = (platform, tnsOptions) =>
    `tns build ${platform} ${tnsOptions}`;

export const bundleRun = (platform, tnsOptions) =>
    `npm run start-${platform}-bundle -- ${tnsOptions}`;

export const noBundleRun = (platform, tnsOptions) =>
    `tns run ${platform} ${tnsOptions}`;
