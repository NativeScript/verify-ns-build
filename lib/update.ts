import { writeFileSync } from "fs";

import { WebpackUpdateOptions, NpmDependency } from "../verify-schema";
import { execute } from "./command";
import {
    PROJECT_DIR,
    UPDATE_WEBPACK_SCRIPT,
    WEBPACK_HELPER_SCRIPTS,
    UPDATE_NG_SCRIPT,
    NG_HELPER_SCRIPTS,
} from "./constants";
import { stringify, getPackage } from "./utils";
import { getPackageJson } from "./project-helpers";

const PACKAGE_JSON_OBJECT = {
    dependency: "dependencies",
    devDependency: "devDependencies",
};

export default async function update(updateWebpack: WebpackUpdateOptions, updateAngularDeps: boolean) {
    await addNpmScripts({ updateWebpack, updateAngularDeps });

    if (updateAngularDeps) {
        await updateNg();
    }

    if (updateWebpack) {
        await updateNsWebpack(updateWebpack);
    }
}

export async function updatePackageJson(dependencies: NpmDependency[] = []) {
    console.log("UPDATEEEEEE")
    const { file: packageJson, path: packageJsonPath } = await getPackageJson();
    for (const dependency of dependencies) {
        dependency.package = getPackage(dependency);
        if (dependency.type !== "nsPlatform") {
            packageJson[PACKAGE_JSON_OBJECT[dependency.type]] = packageJson[PACKAGE_JSON_OBJECT[dependency.type]] || {};
            packageJson[PACKAGE_JSON_OBJECT[dependency.type]][dependency.name] = dependency.package;
        } else {
            const ns = "nativescript";
            const platformName = `tns-${dependency.name}`;
            packageJson[ns] = packageJson[ns] || {};
            packageJson[ns][platformName] = packageJson[platformName] || {};
            packageJson[ns][platformName]["version"] = dependency.package;
        }
    }

    writeFileSync(packageJsonPath, stringify(packageJson));
    const { file: updatedPackageJson } = await getPackageJson();
    console.log("Package.json after update!", updatedPackageJson);
}


async function addNpmScripts({ updateWebpack, updateAngularDeps }) {
    let helperScripts = {};

    if (updateAngularDeps) {
        helperScripts = { ...helperScripts, ...NG_HELPER_SCRIPTS };
    }

    if (updateWebpack) {
        helperScripts = { ...helperScripts, ...WEBPACK_HELPER_SCRIPTS };
    }

    const { file: packageJson, path: packageJsonPath } = await getPackageJson();
    packageJson.scripts = { ...packageJson.scripts, ...helperScripts };

    packageJson.scripts = Object.assign((packageJson.scripts || {}), WEBPACK_HELPER_SCRIPTS);

    writeFileSync(packageJsonPath, stringify(packageJson));
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
