import { promisify } from "util";
import { resolve } from "path";
import * as fs from "fs";

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

import { execute } from "./utils";

const PROJECT_DIR = process.env.INIT_CWD || __dirname;
const BUNDLE_REPORT_DIR = resolve(PROJECT_DIR, "report");
const BUNDLE_STATS_PATH = resolve(BUNDLE_REPORT_DIR, "stats.json");
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

export async function build(options, releaseConfig) {
    const { platform } = options;
    if (!platform) {
        return;
    }

    const { tnsOptions = [], release, bundle } = options;
    let tnsFlags = tnsOptions.join(" ");

    if (release) {
        tnsFlags = tnsFlags.concat(" ", releaseConfig[platform])
    }

    const command = bundle ?
        bundleBuild(platform, tnsFlags) :
        noBundleBuild(platform, tnsFlags);

    await execute(command, PROJECT_DIR);
}

export async function verifyAssets(outputSizes) {
    const assets = await loadAssets();
    if (!assets) {
        return;
    }

    return Object.keys(outputSizes)
        .every(name => assets[name] && assets[name] <= outputSizes[name]);
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
        const statsStream = await readFile(BUNDLE_STATS_PATH, "utf8");
        const stats = JSON.parse(statsStream);
        return stats;
    } catch(e) {
        console.error("Stats file does not exist!");
        return;
    }
}

