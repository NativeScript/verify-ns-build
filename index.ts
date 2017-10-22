import { promisify } from "util";
import { resolve } from "path";
import * as fs from "fs";

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const rename = promisify(fs.rename);

import { execute } from "./utils";

const PROJECT_DIR = process.env.INIT_CWD || __dirname;
const REPORT_DIR = resolve(PROJECT_DIR, "verify-report");
const BUNDLE_REPORT_DIR = resolve(PROJECT_DIR, "report");
const BUNDLE_ANALYZER = {
    dir: resolve(PROJECT_DIR, "report"),
    files: {
        stats: "stats.json",
        heatmap: "report.html"
    }
};

const TIMELINE_REPORT_DIR = PROJECT_DIR;

const VERIFY_WEBPACK_SCRIPT = "ns-verify-bundle";
const UPDATE_WEBPACK_SCRIPT = "update-ns-webpack";
const WEBPACK_HELPER_SCRIPTS = [ VERIFY_WEBPACK_SCRIPT, UPDATE_WEBPACK_SCRIPT ]
    .reduce(addScript, {});
function addScript(scripts, current) {
    scripts[current] = current;
    return scripts;
}

const bundleBuild = (platform, tnsOptions) =>
    `npm run build-${platform}-bundle -- ${tnsOptions}`;

const noBundleBuild = (platform, tnsOptions) =>
    `tns build ${platform} ${tnsOptions}`;

export async function installNsWebpack({ version, path }) {
    if ((!version && !path) || (version && path)) {
        throw new Error("You must specify either path " +
                        "or version of the package to be installed!");
    }

    const nodePackage = path || `nativescript-dev-webpack@${version}`;
    const command = `npm i -D ${nodePackage}`;

    await execute(command, PROJECT_DIR);
}

export async function addHelperScripts() {
    const packageJsonPath = resolve(PROJECT_DIR, "package.json");
    const packageJsonStream = await readFile(packageJsonPath, "utf8");
    const packageJson = JSON.parse(packageJsonStream);

    packageJson.scripts = Object.assign((packageJson.scripts || {}), WEBPACK_HELPER_SCRIPTS);

    await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
}

export async function update(options) {
    const args = options.map(o => `--${o}`).join(" ");
    const command = `npm run ${UPDATE_WEBPACK_SCRIPT} ${args}`;
    
    await execute(command, PROJECT_DIR);
}

export async function verifyBuild(options, releaseConfig, name) {
    const { platform } = options;
    if (!platform) {
        return;
    }

    let result = {...options};

    const error = await build(platform, options, releaseConfig[platform]);
    if (error) {
        result.error = error;
        return;
    }

    const { outputSizes } = options;
    if (outputSizes) {
        const verification = await verifyAssets(outputSizes);
        result = { ...result, ...verification };
    }

    if (name) {
        await saveReport(result, name);
    }

    return result;
}

async function saveReport(result, name) {
    const reportDir = await getReportDirPath(name);
    const reportPath = resolve(reportDir, "build-report.json");
    await writeFile(reportPath, JSON.stringify(result, null, 2));

    if (result.bundle) {
        await saveBundleReport(reportDir, name);
    }
}

async function saveBundleReport(reportDir, name) {
    const { dir: bundleReportDir, files } = BUNDLE_ANALYZER;

    const filesToMove = Object.values(BUNDLE_ANALYZER.files).map(fileName => ({
        oldLocation: resolve(BUNDLE_ANALYZER.dir, fileName),
        newLocation: resolve(reportDir, fileName),
    }));

    for (const {oldLocation, newLocation} of filesToMove) {
        await rename(oldLocation, newLocation);
    }
}

async function getReportDirPath(buildName) {
    const buildReportDir = resolve(REPORT_DIR, buildName);
    await ensure(REPORT_DIR);
    await ensure(buildReportDir);

    return buildReportDir;
}

async function ensure(dir) {
    try {
        await mkdir(dir);
    } catch(e) {
        if (e.code !== "EEXIST") {
            throw e;
        }
    }
}

async function build(platform, options, releaseConfig)
    : Promise<void | Error> {

    const { tnsOptions = [], release, bundle } = options;
    let tnsFlags = tnsOptions.join(" ");

    if (release) {
        tnsFlags = tnsFlags.concat(" ", releaseConfig)
    }

    const command = bundle ?
        bundleBuild(platform, tnsFlags) :
        noBundleBuild(platform, tnsFlags);

    const error = await execute(command, PROJECT_DIR);
    return error;
}

async function verifyAssets(outputSizes) {
    const assets = await loadAssets();
    if (!assets) {
        return;
    }

    const assetsToCheck = Object.keys(outputSizes);
    const missing = assetsToCheck.filter(name => !assets[name]);
    assetsToCheck.forEach(name => {
        if (assets[name] > outputSizes[name]) {
            assets[name].isOverSizeLimit = true;
        }
    });

    return { assets, missing };
}

async function loadAssets() {
    const stats = await loadBundleStats();
    if (!stats) {
        return;
    }

    const { assets } = stats;
    const nameSizeMap = assets
        .reduce((acc, { name, size }) => {
            acc[name] = size;
            return acc;
        }, {});

    return nameSizeMap;
}

async function loadBundleStats() {
    try {
        const { dir: bundleReportDir, files } = BUNDLE_ANALYZER;
        const bundleStatsPath = resolve(bundleReportDir, files.stats);
        const statsStream = await readFile(bundleStatsPath, "utf8");
        const stats = JSON.parse(statsStream);
        return stats;
    } catch(e) {
        console.error("Stats file does not exist!");
        return;
    }
}

