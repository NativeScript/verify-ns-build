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
    .reduce((acc, current) => Object.assign(acc, { current }), {});

export function installNsWebpack({ version, path }) {
    if ((!version && !path) || (version && path)) {
        throw new Error("You must specify either path " +
                        "or version of the package to be installed!");
    }

    const nodePackage = path || `nativescript-dev-webpack${version}`;
    const command = `npm i -D ${nodePackage}`;

    execute(command, PROJECT_DIR);
}

export async function addHelperScripts() {
    const packageJsonPath = resolve(PROJECT_DIR, "package.json");
    const packageJsonStream = await readFile(packageJsonPath, "utf8");
    const packageJson = JSON.parse(packageJsonStream);

    packageJson.scripts = Object.assign((packageJson.scripts || {}), WEBPACK_HELPER_SCRIPTS);

    await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
}

export function update({ options }) {
    const args = options.map(o => `--${o}`).join(" ");
    const command = `npm run ${UPDATE_WEBPACK_SCRIPT} ${args}`;
    
    execute(command, PROJECT_DIR);
}

