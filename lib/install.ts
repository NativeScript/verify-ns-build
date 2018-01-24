import { UpdateFlavor, NpmDependency } from "../verify-schema";

import { execute } from "./command";
import {
    PROJECT_DIR,
    WEBPACK_PLUGIN,
} from "./constants";

const PACKAGE_TYPE_FLAG_MAP = {
    dependency: "--save",
    devDependency: "--save-dev",
};

export default async function install(dependencies: NpmDependency[]) {
    for (const dependency of dependencies) {
        await installPackage(dependency);
    }
}

async function installPackage(dependency: NpmDependency) {
    const command = toCommand(dependency);
    await execute(command, PROJECT_DIR);

    if (dependency.name === WEBPACK_PLUGIN) {
        await execute("npm i", PROJECT_DIR);
    }
}

function toCommand(dependency: NpmDependency) {
    return `npm i ${dependency.package} ${PACKAGE_TYPE_FLAG_MAP[dependency.type]}`;
}
