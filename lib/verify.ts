import { getReportDirPath, saveBuildReport } from "./report";
import { ExecutionResult, execute, executeAndKillWhenIdle } from "./command";
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

    const result: any = { configuration: options };
    const { tnsOptions = [], release, bundle } = options;
    let flags;
    try {
        flags = prepareFlags(tnsOptions, release, releaseConfig, platform);
    } catch (error) {
        console.dir(error);
        result.error = error;
        return result;
    }

    result.execution = await action(platform, flags, bundle);
    result.verifications = await runChecks(options, name, result.execution);

    if (name) {
        await saveBuildReport(result, name);
    }

    return result;
}

function prepareFlags(tnsOptions, release, releaseConfig, platform) {
    const flags = tnsOptions.join(" ");
    const isReleaseBuild = release || tnsOptions.indexOf("--release") > -1;
    if (!isReleaseBuild) {
        return flags;
    }

    if (!releaseConfig || !releaseConfig[platform]) {
        throw new Error("You need to provide release configuration!");
    }

    return flags.concat(" ", releaseConfig[platform]);
}

async function runChecks(options, name, result) {
    const verifications: any = {};

    const { log } = result;
    if (options.timeline && log) {
        const reportDir = await getReportDirPath(name);
        verifications.timeline = await generateReport(log, reportDir);
    }

    const { outputSizes } = options;
    if (!result.error && outputSizes) {
        verifications.assets = await verifyAssets(outputSizes);
    }

    const { startup, platform } = options;
    if (startup) {
        verifications.startup = await verifyStartupTime(startup, platform, log);
    }

    return verifications;
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

    return await execute(command, PROJECT_DIR, true, false);
}
