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
        dependency.package = getPackage(dependency);
        await runNpmInstall(dependency);
    }
}

function getPackage(dependency: NpmDependency) {
    return process.env[dependency.name] || dependency.package;
}

async function runNpmInstall(dependency: NpmDependency) {
    const command = toCommand(dependency);
    await execute(command, PROJECT_DIR);

    if (dependency.name === WEBPACK_PLUGIN) {
        await execute("npm i", PROJECT_DIR);
    }
}

function toCommand({ name, package: npmPackage, type }: NpmDependency) {
    return `npm i ${name}@${npmPackage} ${PACKAGE_TYPE_FLAG_MAP[type]}`;
}
