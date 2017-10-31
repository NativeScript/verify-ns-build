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

type NpmPackage = {
    pack: string,
    flag: "--save"|"--save-dev",
};

export async function installPackages(config, ignorePackage) {
    let packages = getPackages(config);
    if (ignorePackage) {
        packages = packages.filter(({ pack }) => !pack.match(ignorePackage));
    }

    for (const { pack, flag } of packages) {
        await install(pack, flag);
    }
}

function getPackages(config): NpmPackage[] {
    const { dependencies = [], devDependencies = [] } = config;

    const toNpmPackage = (packages, flag) =>
        packages.map(pack => ({ pack, flag }));

    return [
        ...toNpmPackage(dependencies, "--save"),
        ...toNpmPackage(devDependencies, "--save-dev"),
    ];
}

async function install(nodePackage: string, installOption: string) {
    const command = `npm i ${installOption} ${nodePackage}`;
    await execute(command, PROJECT_DIR);

    if (nodePackage.match(WEBPACK_PLUGIN)) {
        await execute("npm i", PROJECT_DIR);
        await addWebpackHelperScripts();
    }
}

async function addWebpackHelperScripts() {
    const { file: packageJson, path: packageJsonPath } = await getPackageJson();
    packageJson.scripts = Object.assign((packageJson.scripts || {}), WEBPACK_HELPER_SCRIPTS);

    await writeFile(packageJsonPath, stringify(packageJson));
}

export async function updateNsWebpack(config) {
    const { updateWebpack } = config;
    if (!updateWebpack) {
        return;
    }

    const options = Object.keys(updateWebpack)
        .filter(o => updateWebpack[o])
        .map(o => `--${o}`).join(" ");

    const command = `npm run ${UPDATE_WEBPACK_SCRIPT} ${options}`;
    await execute(command, PROJECT_DIR);
}
