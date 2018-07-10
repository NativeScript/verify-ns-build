import { VerifySchema, ReleaseConfig } from "../verify-schema";
import { ConfigOptions } from "./config-options";

import { Config, loadConfig } from "./config";
import { verifyBuild, verifyRun } from "./verify";
import { saveFinalReports } from "./report";
import { hasError } from "./utils";
import install from "./install";
import update from "./update";

const ACTIONS = {
    build: verifyBuild,
    run: verifyRun,
};

export async function execute(options: ConfigOptions) {
    const config: Config = loadConfig(options);

    await install(config.update.dependencies);
    await update(config.update.updateWebpack, config.update.updateAngularDeps);

    if (!config.verification.verifications.length) {
        throw new Error('Verification array is empty!');
    }

    const results = {};
    for (const [index, build] of config.verification.verifications.entries()) {
        const configurationName = build.name || (index + 1).toString();

        const type = build.type;
        const name = type ? `${type}-${configurationName}` : configurationName;
        const action = ACTIONS[type];

        const execution = await action(build, config.releaseConfig, name, index);
        results[name] = execution;
    }

    await saveFinalReports(results);

    const success: boolean = !hasError(results);
    return { success, outFileName: config.outFileName };
}
