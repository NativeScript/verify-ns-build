import { getReportDirPath, saveBuildReport } from "./report";
import { ExecutionResult, executeAndKillWhenIdle } from "./command";
import {
    PROJECT_DIR,
    bundleBuild,
    bundleRun,
    noBundleBuild,
    noBundleRun,
} from "./constants";

import {
    enableTraces,
    generateReport,
    verifyAssets,
    verifyStartupTime,
} from "./checks";

export async function verifyRun(options, releaseConfig, name) {
    const { timeline } = options;
    if (timeline) {
        await enableTraces();
    }

    return await verifyApp(options, releaseConfig, name, run);
}

export async function verifyBuild(options, releaseConfig, name) {
    return await verifyApp(options, releaseConfig, name, build);
}

async function verifyApp(options, releaseConfig, name, action) {
    const { platform } = options;
    if (!platform) {
        return;
    }

    const { tnsOptions = [], release, bundle } = options;
    let flags = tnsOptions.join(" ");

    if (release) {
        flags = flags.concat(" ", releaseConfig[platform])
    }

    const executeResult = await action(platform, flags, bundle);
    let result = {...options, ...executeResult};

    result = await runChecks(options, name, result);

    delete result.log;
    return result;
}

async function runChecks(options, name, result) {
    const { log } = result;
    if (options.timeline && log) {
        const reportDir = await getReportDirPath(name);
        await generateReport(log, reportDir);
    }

    const { outputSizes } = options;
    if (!result.error && outputSizes) {
        const verification = await verifyAssets(outputSizes);
        result = { ...result, assets: { ...verification } };
    }

    const { startup, platform } = options;
    if (startup) {
        const startupVerification = await verifyStartupTime(startup, platform);
        result = { ...result, startup: { ...startupVerification } };
    }

    if (name) {
        await saveBuildReport(result, name);
    }

    return result;
}

async function run(platform, flags, bundle)
    : Promise<ExecutionResult> {

    const command = bundle ?
        bundleRun(platform, flags) :
        noBundleRun(platform, flags);

    return await executeAndKillWhenIdle(command, PROJECT_DIR);
}

async function build(platform, flags, bundle)
    : Promise<ExecutionResult> {

   const command = bundle ?
        bundleBuild(platform, flags) :
        noBundleBuild(platform, flags);

    return await executeAndKillWhenIdle(command, PROJECT_DIR);
}
