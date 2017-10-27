import { execute } from "./command";
import {
    PROJECT_DIR,
    UPDATE_WEBPACK_SCRIPT,
    WEBPACK_HELPER_SCRIPTS,
    WEBPACK_PLUGIN,
} from "./constants";
import { writeFile } from "./fs";
import { stringify } from "./utils";
import { getPackageJson } from "./project-helpers";

export async function install(nodePackage: string) {
    const command = `npm i -D ${nodePackage}`;
    await execute(command, PROJECT_DIR);

    if (nodePackage === WEBPACK_PLUGIN) {
        await execute("npm i", PROJECT_DIR);
        await addWebpackHelperScripts();
    }
}

async function addWebpackHelperScripts() {
    const { file: packageJson, path: packageJsonPath } = await getPackageJson();
    packageJson.scripts = Object.assign((packageJson.scripts || {}), WEBPACK_HELPER_SCRIPTS);

    await writeFile(packageJsonPath, stringify(packageJson));
}

export async function updateNsWebpack(options) {
    const args = options.map(o => `--${o}`).join(" ");
    const command = `npm run ${UPDATE_WEBPACK_SCRIPT} ${args}`;

    await execute(command, PROJECT_DIR);
}
