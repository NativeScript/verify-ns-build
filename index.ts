import { promisify } from "util";
import { resolve } from "path";
import * as fs from "fs";

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const rename = promisify(fs.rename);

import { toTrace, saveTimeline } from "timeline-view";
import { ExecutionResult, execute, executeAndKillWhenIdle } from "./utils";

let profilingOriginalValue;

process.on("exit", restoreProfilingValue);
process.on("SIGINT", restoreProfilingValue);

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

const bundleRun = (platform, tnsOptions) =>
    `npm run start-${platform}-bundle -- ${tnsOptions}`;

const noBundleRun = (platform, tnsOptions) =>
    `tns run ${platform} ${tnsOptions}`;

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
    const { file: packageJson, path: packageJsonPath } = await getPackageJson();
    packageJson.scripts = Object.assign((packageJson.scripts || {}), WEBPACK_HELPER_SCRIPTS);

    await writeFile(packageJsonPath, stringify(packageJson));
}

export async function update(options) {
    const args = options.map(o => `--${o}`).join(" ");
    const command = `npm run ${UPDATE_WEBPACK_SCRIPT} ${args}`;

    await execute(command, PROJECT_DIR);
}

export async function verifyRun(options, releaseConfig, name) {
    saveProfilingValue();
    const { timeline } = options;
    if (timeline) {
        await enableTraces();
    } else {
        await disableTraces();
    }

    const result = await verifyApp(options, releaseConfig, name, run);
    const logLines = (result.log || "").split(/\r?\n/);
    const traces = logLines.map(toTrace).filter(t => !!t);
    const reportDir = await getReportDirPath(name);
    const reportDestination = resolve(reportDir, "report.html");
    saveTimeline(traces, reportDestination);

    return result;
}

export async function verifyBuild(options, releaseConfig, name) {
    const result = await verifyApp(options, releaseConfig, name, build);
    return result;
}

async function verifyApp(options, releaseConfig, name, action) {
    const { platform } = options;
    if (!platform) {
        return;
    }

    const { tnsOptions = [], release, bundle } = options;
    let flags = tnsOptions.join(" ");

    if (release) {
        flags = flags.concat(" ", releaseConfig[platform])
    }

    let result = {...options};

    const { log, error } = await action(platform, flags, bundle);
    result.log = log;
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
    await writeFile(reportPath, stringify(result));

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

async function run(platform, flags, bundle)
    : Promise<ExecutionResult> {

    const command = bundle ?
        bundleRun(platform, flags) :
        noBundleRun(platform, flags);

    return await executeAndKillWhenIdle(command, PROJECT_DIR);
}

async function build(platform, flags, bundle)
    : Promise<ExecutionResult> {

   const command = bundle ?
        bundleBuild(platform, flags) :
        noBundleBuild(platform, flags);

    return await executeAndKillWhenIdle(command, PROJECT_DIR);
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

async function saveProfilingValue() {
    const { file } = await getInnerPackageJson();
    profilingOriginalValue = file["profiling"];
}

async function restoreProfilingValue() {
    const { file, path } = await getInnerPackageJson();
    file["profiling"] = profilingOriginalValue;

    await writeFile(path, stringify(file));
}

async function enableTraces() {
    const { file: packageJson, path: packageJsonPath } = await getInnerPackageJson();
    packageJson["profiling"] = "timeline";

    await writeFile(packageJsonPath, stringify(packageJson));
}

async function disableTraces() {
    const { file: packageJson, path: packageJsonPath } = await getInnerPackageJson();
    delete packageJson["profiling"];

    await writeFile(packageJsonPath, stringify(packageJson));
}

function stringify(obj) {
    return JSON.stringify(obj, null, 2);
}

async function getInnerPackageJson() {
    const appPath = resolve(PROJECT_DIR, "app");
    return await getPackageJson(appPath);
}

async function getPackageJson(projectDir = PROJECT_DIR) {
    const path = resolve(projectDir, "package.json");
    const buffer = await readFile(path, "utf8");
    const file = JSON.parse(buffer);

    return { path, file };
}
