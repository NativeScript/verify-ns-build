import {
    modifyProfilingValue,
    generateReport,
} from "./timeline";
import { getReportDirPath, saveReport } from "./report";
import { ExecutionResult, executeAndKillWhenIdle } from "./command";
import {
    PROJECT_DIR,
    bundleBuild,
    bundleRun,
    noBundleBuild,
    noBundleRun,
} from "./constants";
import { verifyAssets } from "./webpack-bundle";

export async function verifyRun(options, releaseConfig, name) {
    const { timeline } = options;
    await modifyProfilingValue(timeline);

    const result = await verifyApp(options, releaseConfig, name, run);

    const { log } = result;
    if (timeline && log) {
        const reportDir = await getReportDirPath(name);
        await generateReport(log, reportDir);
    }

    return result;
}

export async function verifyBuild(options, releaseConfig, name) {
    const result = await verifyApp(options, releaseConfig, name, build);
    return result;
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

    const { outputSizes } = options;
    if (!result.error && outputSizes) {
        const verification = await verifyAssets(outputSizes);
        result = { ...result, ...verification };
    }

    if (name) {
        await saveReport(result, name);
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
