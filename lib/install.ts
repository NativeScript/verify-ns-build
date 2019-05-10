import { NpmDependency } from "../verify-schema";
import { execute } from "./command";
import {
    PROJECT_DIR,
    WEBPACK_PLUGIN,
} from "./constants";
import { getPackage } from "./utils";

const PACKAGE_TYPE_FLAG_MAP = {
    dependency: "--save",
    devDependency: "--save-dev",
};

export default async function install(dependencies: NpmDependency[] = []) {
    for (const dependency of dependencies) {
        dependency.package = getPackage(dependency);

        if (dependency.type === "nsPlatform") {
            await runPlatformAdd(dependency);
        } else {
            await runNpmInstall(dependency);
        }
    }
}

async function runNpmInstall(dependency: NpmDependency) {
    const command = toNpmCommand(dependency);
    await execute(command, PROJECT_DIR);

    if (dependency.name === WEBPACK_PLUGIN) {
        await execute("npm i", PROJECT_DIR);
    }
}

const toNpmCommand = ({ name, package: npmPackage, type, saveExact: shouldSaveExact }: NpmDependency) =>
    // `npm i ${name}@${npmPackage} ${PACKAGE_TYPE_FLAG_MAP[type]} ${shouldSaveExact === true ? "--save-exact" : ""}`;
    `npm i ${name}@${npmPackage} ${PACKAGE_TYPE_FLAG_MAP[type]} --save-exact`;

async function runPlatformAdd({ name, package: npmPackage }: NpmDependency) {
    let command = `tns platform add ${name}`;

    command += isArchive(npmPackage) ?
        ` --frameworkPath ${npmPackage}` :
        `@${npmPackage}`;

    await execute(command, PROJECT_DIR);
}

const archiveExtensions = [
    "tgz",
    "tar",
    "tar.gz",
];

const isArchive = name => archiveExtensions.some(ext => name.endsWith(ext));
