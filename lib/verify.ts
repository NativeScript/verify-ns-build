import { getReportDirPath, saveBuildReport } from "./report";
import { ExecutionResult, execute, executeAndKillWhenIdle } from "./command";
import { runApp, stopApp, uninstallApp, installApp, getDevice, warmUpDevice } from "./device";
import { resolve } from "path";
import { readdirSync, existsSync, mkdirSync, copyFileSync } from "fs";
import {
    PROJECT_DIR,
    bundleBuild,
    bundleRun,
    noBundleBuild,
    noBundleRun,
    LONG_WAIT,
} from "./constants";

import {
    generateReport,
    verifyAssets,
    verifyStartupTime,
    getStartupTime,
    verifyLogs,
    logMeasuringFailed,
    MEASURE_FAILED_MESSAGE
} from "./checks";

import { enableTraces, enableProfiling, LogTracker } from "./traces";
import { Verification } from "../verify-schema";
import { setTimeout } from "timers";

export async function verifyRun(options: Verification, releaseConfig, name, shouldWarmupDevice: boolean) {
    return await verifyApp(options, releaseConfig, name, build, shouldWarmupDevice, true);
}

export async function verifyBuild(options: Verification, releaseConfig, name, shouldWarmupDevice: boolean) {
    return await verifyApp(options, releaseConfig, name, build, shouldWarmupDevice);
}

async function verifyApp(options: Verification, releaseConfig, name, action, shouldWarmupDevice: boolean, tracker = false) {
    const { platform } = options;
    if (!platform) {
        return;
    }
    if (tracker) {
        if (!options.numberOfRuns) { options.numberOfRuns = 1; }
        if (!options.tolerance) { options.tolerance = 10; }
        if (shouldWarmupDevice) {
            const appFolderPath = resolve(PROJECT_DIR.toString(), "releaseApps");
            const appPath = getInstallablePath(platform, appFolderPath, options.name);
            const app = await getApp();
            await getDevice(platform);
            await warmUpDevice(platform, 10000, app, appPath);
        }
    }

    const result: any = { configuration: options };

    const { tnsOptions = [], release, bundle, getExpectedTime, numberOfRuns, copyInstallable, enableLifecycle, device } = options;

    let flags;
    try {
        flags = prepareFlags(tnsOptions, release, releaseConfig, platform, device);
    } catch (error) {
        console.dir(error);
        result.error = error;
        return result;
    }

    if (getExpectedTime) {
        let expectedTimeLogs = []
        const appPath = resolve(PROJECT_DIR.toString(), "releaseApps");
        await getPerformanceTimeLogsFromApp(options, platform, tracker, appPath, options.name).then(function (logs) {
            expectedTimeLogs = logs.slice();
        });
        let expectedTime: number[];
        try {
            expectedTime = await getStartupTime(platform, expectedTimeLogs, numberOfRuns);
        } catch (error) {
            logMeasuringFailed(error.message);
        }
        if (!expectedTime) {
            logMeasuringFailed(MEASURE_FAILED_MESSAGE);
        }
        options.startup = expectedTime[0];
        options.secondStartTime = expectedTime[1];
    }

    if (enableLifecycle) {
        await enableTraces("lifecycle");
    }

    result.execution = await action(platform, flags, bundle);

    if (copyInstallable) {
        const dir = resolve(PROJECT_DIR, 'buildApps');
        if (!existsSync(dir)) {
            mkdirSync(dir);
        }

        const appPathAndAppName = getInstallablePath(platform, "", "", true);
        let pathToCopy = resolve(dir, appPathAndAppName.appName);
        if (platform === "ios") {
            pathToCopy = pathToCopy.replace(".ipa", "-" + name + ".ipa");
        }
        else {
            pathToCopy = pathToCopy.replace(".apk", "-" + name + ".apk");
        }

        await copyFileSync(appPathAndAppName.appPath, pathToCopy);
    }

    if (tracker) {
        result.execution.log = [];
        await getPerformanceTimeLogsFromApp(options, platform, tracker).then(function (logs) {
            result.execution.log = logs.slice();
        });
    }

    result.verifications = await runChecks(options, name, result.execution)

    if (name) {
        await saveBuildReport(result, name);
    }
    return result;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function getApp(): Promise<string>{
    const APP_CONFIG = resolve(PROJECT_DIR.toString(), "package.json");
    const pjson = require(APP_CONFIG);
    const app = pjson.nativescript.id;
    return app;
}

async function getPerformanceTimeLogsFromApp(options: Verification, platform: "ios" | "android", tracker, appPath = "", fileName = ""): Promise<string[]> {
    let i: number;
    let watcher: void | LogTracker;
    let logs: string[] = [];

    const app = await getApp();

    const { numberOfRuns } = options;
    await getDevice(platform);

    appPath = getInstallablePath(platform, appPath, fileName);

    for (i = 0; i < numberOfRuns; i++) {
        await sleep(LONG_WAIT);
        if (tracker) {
            watcher = await enableProfiling(options);
        }
        await uninstallApp(app);
        await installApp(appPath);
        await runApp(app);
        await stopApp(app);
        await runApp(app);
        await stopApp(app);
        await uninstallApp(app);
        if (tracker && watcher) {
            await sleep(options.trackerTimeout || 5000);
            logs[i] = await watcher.close();
        }

    }
    return logs;
}

function getInstallablePath(platform, folderWithInstallable = "", fileName = "", returnAppName = false) {
    let appPath;
    let appName;
    let appNameSearchText;
    if (folderWithInstallable === "") {
        if (platform === "ios") {
            appPath = resolve(PROJECT_DIR, "platforms", "ios", "build", "device");
            appNameSearchText = fileName + ".ipa";
        }
        else {
            appPath = resolve(PROJECT_DIR, "platforms", "android", "app", "build", "outputs", "apk", "release");
            appNameSearchText = fileName + ".apk";
        }
    }
    else {
        appPath = folderWithInstallable;
        if (platform === "ios") {
            appNameSearchText = fileName + ".ipa";
        }
        else {
            appNameSearchText = fileName + ".apk";
        }
    }

    const files = readdirSync(appPath);
    for (const file in files) {
        if (files[file].toString().includes(appNameSearchText)) {
            appName = files[file].toString();
            break;
        }
    }
    appPath = resolve(appPath, appName);
    if (returnAppName) {
        return {
            appPath,
            appName
        }
    }
    else {
        return appPath;
    }
}

function prepareFlags(tnsOptions, release, releaseConfig, platform, device) {
    let flags = tnsOptions.join(" ");
    const isRelease = release || tnsOptions.indexOf("--release") > -1;
    if (isRelease) {
        flags = flags.concat(" --release");

    }

    if (device) {
        if (!(tnsOptions.indexOf("--for-device") > -1)) {
            flags = flags.concat(" --for-device");
        }
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
        verifications.timeline = await generateReport(log[0], reportDir);
    }

    const { outputSizes } = options;
    if (!result.error && outputSizes) {
        verifications.assets = await verifyAssets(outputSizes);
    }

    const { startup, secondStartTime, tolerance, platform, numberOfRuns } = options;

    let secondStartTimeVariable = secondStartTime;
    if (!secondStartTime) {
        secondStartTimeVariable = startup;
    }

    if (startup) {
        verifications.startup = await verifyStartupTime(startup, secondStartTimeVariable, platform, log, numberOfRuns, tolerance);
    }

    const { expectedInOutput } = options;
    if (expectedInOutput) {
        verifications.expectedInOutput = await verifyLogs(expectedInOutput, log[0]);
    }

    return verifications;
}

//Not used anymore. Keep for future needs.
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