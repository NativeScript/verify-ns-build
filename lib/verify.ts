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
} from "./checks";

import { enableTraces } from "./traces";
import { Verification } from "../verify-schema";
import { spawn, ChildProcess } from "child_process";
import { setTimeout } from "timers";

interface Watcher {
    process: ChildProcess;
    log: string;
}

export async function verifyRun(options: Verification, releaseConfig, name) {
    const watcher = await enableProfiling(options);
    return await verifyApp(options, releaseConfig, name, run, watcher);
}

async function enableProfiling({ timeline, startup, platform }: Verification):
    Promise<void | Watcher> {

    if (timeline) {
        await enableTraces("timeline");
    } else if (startup) {
        await enableTraces("lifecycle");
    }

    if (timeline || startup) {
        const command = platform === "ios" ? "idevicesyslog" : "adb";
        const args = platform === "ios" ? [] : ["logcat"];

        const child = spawn(command, args);
        const watcher = { process: child, log: "" };

        child.stdout.on("data", data => watcher.log += data);
        child.stderr.on("data", data => watcher.log += data);

        return watcher;
    }
}

export async function verifyBuild(options: Verification, releaseConfig, name) {
    return await verifyApp(options, releaseConfig, name, build);
}

async function verifyApp(options: Verification, releaseConfig, name, action, watcher?: void | Watcher) {
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
    if (watcher) {
        await sleep(5000);
        watcher.process.kill();
        result.execution.log = watcher.log;
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

    return await execute(command, PROJECT_DIR, false);
}
