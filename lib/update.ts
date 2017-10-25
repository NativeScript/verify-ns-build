import { execute } from "./command";
import {
    PROJECT_DIR,
    UPDATE_WEBPACK_SCRIPT,
    WEBPACK_HELPER_SCRIPTS,
} from "./constants";
import { writeFile } from "./fs";
import { stringify } from "./utils";
import { getPackageJson } from "./project-helpers";

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

export async function updateNsWebpack(options) {
    const args = options.map(o => `--${o}`).join(" ");
    const command = `npm run ${UPDATE_WEBPACK_SCRIPT} ${args}`;

    await execute(command, PROJECT_DIR);
}
