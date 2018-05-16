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
    generateReport,
    verifyAssets,
    verifyStartupTime,
    verifyLogs,
} from "./checks";

import { enableTraces, enableProfiling, LogTracker } from "./traces";
import { Verification } from "../verify-schema";
import { spawn, ChildProcess } from "child_process";
import { setTimeout } from "timers";

export async function verifyRun(options: Verification, releaseConfig, name) {
    const watcher = await enableProfiling(options);
    return await verifyApp(options, releaseConfig, name, run, watcher);
}

export async function verifyBuild(options: Verification, releaseConfig, name) {
    return await verifyApp(options, releaseConfig, name, build);
}

async function verifyApp(options: Verification, releaseConfig, name, action, tracker?: void | LogTracker) {
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
    if (tracker) {
        await sleep(options.trackerTimeout || 5000);
        result.execution.log = tracker.close();
    }

    result.verifications = await runChecks(options, name, result.execution);

    if (name) {
        await saveBuildReport(result, name);
    }

    return result;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function prepareFlags(tnsOptions, release, releaseConfig, platform) {
    const flags = tnsOptions.join(" ");
    const isRelease = release || tnsOptions.indexOf("--release") > -1;
    if (isRelease) {
        flags.concat(" ", "--release");
    }

    const shouldUseReleaseArgs = isRelease || tnsOptions.indexOf("--for-device") > -1;
    if (!shouldUseReleaseArgs) {
        return flags;
    }

    if (!releaseConfig || !releaseConfig[platform]) {
        throw new Error("You need to provide release configuration!");
    }

    return flags.concat(" ", releaseConfig[platform]);
}

async function runChecks(options: Verification, name: string, result) {
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

    const { expectedInOutput } = options;
    if (expectedInOutput) {
        verifications.expectedInOutput = await verifyLogs(expectedInOutput, log);
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

    return await executeAndKillWhenIdle(command, PROJECT_DIR);
}
