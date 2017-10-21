import { promisify } from "util";
import { resolve } from "path";
import * as fs from "fs";

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

import { execute } from "./utils";

const PROJECT_DIR = process.env.INIT_CWD || __dirname;
const VERIFY_WEBPACK_SCRIPT = "ns-verify-bundle";
const UPDATE_WEBPACK_SCRIPT = "update-ns-webpack";

const WEBPACK_HELPER_SCRIPTS = [ VERIFY_WEBPACK_SCRIPT, UPDATE_WEBPACK_SCRIPT ]
    .reduce(addScript, {});
function addScript(scripts, current) {
    scripts[current] = current;
    return scripts;
}

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

    const { bundleOptions = [], tnsOptions = [], release, bundle } = options;
    const bundleFlags = joinOptions(bundleOptions);
    let tnsFlags = joinOptions(tnsOptions);

    if (release) {
        tnsFlags = tnsFlags.concat(" ", releaseConfig[platform])
    }

    const command = bundle ?
        bundleBuild(platform, bundleFlags, tnsFlags) :
        noBundleBuild(platform, tnsFlags);

    await execute(command, PROJECT_DIR);
}

function bundleBuild(platform, bundleOptions, tnsOptions) {
    return `npm run build-${platform}-bundle ${bundleOptions} -- ${tnsOptions}`;
}

function noBundleBuild(platform, tnsOptions) {
    return `tns build ${platform} ${tnsOptions}`;
}

function joinOptions(options) {
    return options.join(" ");
}
