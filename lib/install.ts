import { execute } from "./command";
import {
    PROJECT_DIR,
    WEBPACK_PLUGIN,
} from "./constants";

type NpmPackage = {
    pack: string,
    flag: "--save"|"--save-dev",
};

export async function install(config, ignorePackage) {
    let packages = getPackages(config);
    if (ignorePackage) {
        packages = packages.filter(({ pack }) => !pack.match(ignorePackage));
    }

    for (const { pack, flag } of packages) {
        await installPackage(pack, flag);
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

async function installPackage(nodePackage: string, installOption: string) {
    const command = `npm i ${installOption} ${nodePackage}`;
    await execute(command, PROJECT_DIR);

    if (nodePackage.match(WEBPACK_PLUGIN)) {
        await execute("npm i", PROJECT_DIR);
    }
}

