import { ConfigOptions } from "./config-options";

import { Config, loadConfig } from "./config";
import { verifyBuild, verifyRun } from "./verify";
import { saveFinalReports } from "./report";
import { hasError } from "./utils";
import update, { updatePackageJson } from "./update";
import { PROJECT_DIR } from "./constants";
import * as command from "./command";
import install from "./install";

const ACTIONS = {
    build: verifyBuild,
    run: verifyRun,
};

export async function execute(options: ConfigOptions) {
    const config: Config = loadConfig(options);

    if (config.update.dependenciesUpdateType === "installAllAtOnce") {
        const packageJson = await updatePackageJson(config);
        if (config.update.updateWebpack && config.update.updateWebpack.deps) {
            await command.execute(`npm i nativescript-dev-webpack@${packageJson.devDependencies['nativescript-dev-webpack']} --save-exact`, PROJECT_DIR);
        }

        if (config.update.updateAngularDeps) {
            await command.execute(`npm i nativescript-angular@${packageJson.dependencies['nativescript-angular']} --save-exact`, PROJECT_DIR);
        }
    } else {
        await install(config.update.dependencies);
    }

    await update(config.update.updateWebpack, config.update.updateAngularDeps, config.update.saveExact, config.update.dependenciesUpdateType !== "installAllAtOnce");

    if (config.update.dependenciesUpdateType === "installAllAtOnce") {
        await command.execute("npm i", PROJECT_DIR);
    }
    if (!config.verification.verifications.length) {
        throw new Error('Verification array is empty!');
    }

    const results = {};
    for (const [index, build] of config.verification.verifications.entries()) {
        const configurationName = build.name || (index + 1).toString();

        const type = build.type;
        const name = type ? `${type}-${configurationName}` : configurationName;
        const action = ACTIONS[type];
        const execution = await action(build, config.releaseConfig, name, index === 0);
        results[name] = execution;
    }

    await saveFinalReports(results);

    const success: boolean = !hasError(results);
    return { success, outFileName: config.outFileName };
}

export async function updatePackageJsonDeps(config: Config) {
    await updatePackageJson(config);
}