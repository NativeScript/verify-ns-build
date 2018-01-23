import { UpdateFlavor } from "../verify-schema";

import { execute } from "./command";
import {
    PROJECT_DIR,
    UPDATE_WEBPACK_SCRIPT,
    WEBPACK_HELPER_SCRIPTS,
    UPDATE_NG_SCRIPT,
    NG_HELPER_SCRIPTS,
} from "./constants";
import { writeFile } from "./fs";
import { stringify } from "./utils";
import { getPackageJson } from "./project-helpers";

export default async function update({ updateWebpack, updateAngularDeps }: UpdateFlavor) {
    await addNpmScripts({ updateWebpack, updateAngularDeps });

    if (updateAngularDeps) {
        await updateNg();
    }

    if (updateWebpack) {
        await updateNsWebpack(updateWebpack);
    }
}

async function addNpmScripts({ updateWebpack, updateAngularDeps }) {
    let helperScripts = {};
    if (updateWebpack) {
        helperScripts = { ...helperScripts, ...WEBPACK_HELPER_SCRIPTS };
    }

    if (updateAngularDeps) {
        helperScripts = { ...helperScripts, ...NG_HELPER_SCRIPTS };
    }

    const { file: packageJson, path: packageJsonPath } = await getPackageJson();
    packageJson.scripts = {...packageJson.scripts, ...helperScripts};

    packageJson.scripts = Object.assign((packageJson.scripts || {}), WEBPACK_HELPER_SCRIPTS);

    await writeFile(packageJsonPath, stringify(packageJson));
}

async function updateNsWebpack(config) {
    const options = Object.keys(config)
        .filter(o => config[o])
        .map(o => `--${o}`).join(" ");

    const command = `npm run ${UPDATE_WEBPACK_SCRIPT} ${options}`;
    await execute(command, PROJECT_DIR);
    await execute("npm i", PROJECT_DIR);
}

async function updateNg() {
    const command = `npm run ${UPDATE_NG_SCRIPT}`;
    await execute(command, PROJECT_DIR);
    await execute("npm i", PROJECT_DIR);
}
