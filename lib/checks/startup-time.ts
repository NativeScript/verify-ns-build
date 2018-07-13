import { PROJECT_DIR } from "../constants";
import { executeAndKillWhenIdle, ExecutionResult } from "../command";
import { getPackageJson } from "../project-helpers";
import { warn } from "../utils";

const ADB_TIME_FILTER = `\\+(\\d+)s(\\d+)ms`;
const ADB_STARTUP_FILTER = (appName) =>
    new RegExp(`Displayed ${appName}/com.tns.NativeScriptActivity: ${ADB_TIME_FILTER}`, "g");

const DISPLAYED_EVENT_TIME_FILTER = `(\\d+).(\\d+)`;
const DISPLAYED_EVENT_FILTER =
    new RegExp(`Timeline: Modules: Displayed in (${DISPLAYED_EVENT_TIME_FILTER})ms`, "g");

export const MEASURE_FAILED_MESSAGE = "Startup and second run time couldn't be measured!";

export function verifyTime(expected: number, actual: number, tolerance: number) {
    try {
        const difference = (expected * tolerance * 0.01);
        const minimumTime = expected - difference;
        const maximumTime = expected + difference;
        let verifyTime = false;
        if (actual > maximumTime) {
            verifyTime = true;
        }
        else if (actual < minimumTime) {
            if (process.env['SKIP_MINIMUM_STARTUP_TIME_CHECK']) {
                verifyTime = false;
                console.log(warn("Skip Minimum time fail: Build wan't fail! Actual time " + actual + " is less than expected time " + expected + " with tolerance (" + minimumTime + ") !"));
            }
            else {
                verifyTime = true;
            }
        }
        return verifyTime;
    }
    catch (error) {
        console.log(error);
        throwMeasuringFailed(error);
    }
}

export async function verifyStartupTime(
    expectedStartupTime: number,
    expectedSecondTime: number,
    platform: "ios" | "android",
    log: string[],
    numberOfRuns: number,
    tolerance: number
) {
    let startup: number[];
    try {
        startup = await getStartupTime(platform, log, numberOfRuns);
    } catch (error) {
        return { error: error.message };
    }
    if (!startup) {
        logMeasuringFailed();
        return { error: MEASURE_FAILED_MESSAGE };
    }
    const result = { expectedStartupTime: expectedStartupTime, actualStartupTime: startup[0], expectedSecondTime: expectedSecondTime, actualSecondTime: startup[1] };

    if (verifyTime(expectedStartupTime, startup[0], tolerance)) {
        if (verifyTime(expectedSecondTime, startup[1], tolerance)) {
            return {
                error: `Startup and second start time is more than expected!`,
                ...result,
            };
        }
        else {
            return {
                error: `Startup time is more than expected!`,
                ...result,
            };
        }
    }
    else if (verifyTime(expectedSecondTime, startup[1], tolerance)) {
        return {
            error: `Second start time is more than expected!`,
            ...result,
        };
    }
    else {
        return result;
    }
}

export async function getStartupTime(platform: "ios" | "android", log: string[], numberOfRuns: number)
    : Promise<number[]> {
    let time = [0.0, 0.0];
    if (platform === "ios") {
        let i;

        for (i = 0; i < numberOfRuns; i++) {
            const newTime = await getIosStartupTime(log[i]);
            time[0] += newTime[0];
            time[1] += newTime[1];
        }
        time[0] = time[0] / numberOfRuns;
        time[1] = time[1] / numberOfRuns;

    } else {
        let i;
        for (i = 0; i < numberOfRuns; i++) {
            const newTime = await getAndroidStartupTime(log[i]);
            time[0] += newTime[0];
            time[1] += newTime[1];
        }
        time[0] = time[0] / numberOfRuns;
        time[1] = time[1] / numberOfRuns;

    }
    if (time[0] === 0.0 && time[1] === 0.0) {
        return;
    }
    else {
        return time;
    }
}

async function getIosStartupTime(log: string): Promise<number[]> {
    const matches = log.match(DISPLAYED_EVENT_FILTER);
    if (!matches || !matches.length) {
        throw throwMeasuringFailed("'onDisplayed' event not found in the provided log!");
    }

    const secondStartupLine = matches.pop();
    const startupLine = matches.pop();
    const secondTimeString = secondStartupLine.match(DISPLAYED_EVENT_TIME_FILTER)[0];
    const startupTimeString = startupLine.match(DISPLAYED_EVENT_TIME_FILTER)[0];
    if (!startupTimeString) {
        throw throwMeasuringFailed(`Startup time not found in ${startupLine}`);
    }
    if (!secondTimeString) {
        throw throwMeasuringFailed(`Second start time not found in ${startupLine}`);
    }
    const startupTime = parseFloat(startupTimeString);
    if (isNaN(startupTime)) {
        throw throwMeasuringFailed(`Logged time - ${startupTime} is not a number!`);
    }
    const secondStartTime = parseFloat(secondTimeString);
    if (isNaN(secondStartTime)) {
        throw throwMeasuringFailed(`Logged time - ${secondStartTime} is not a number!`);
    }
    return [startupTime, secondStartTime];
}

async function getAndroidStartupTime(log: string): Promise<number[]> {
    const appName = await getAppName();
    const filter = ADB_STARTUP_FILTER(appName);
    const matches = log.match(filter);
    if (!matches || !matches.length) {
        throw throwMeasuringFailed("'Displayed' event not found in device log!");
    }

    const secondStartupLine = matches.pop();
    const startupLine = matches.pop();
    const startupTimeString = startupLine.match(ADB_TIME_FILTER);
    const secondTimeString = secondStartupLine.match(ADB_TIME_FILTER);
    const [, startupSeconds, startupSilliseconds] = startupTimeString.map(s => parseInt(s));
    const [, secondStartSeconds, secondStartilliseconds] = secondTimeString.map(s => parseInt(s));
    return [(startupSeconds * 1000) + startupSilliseconds, (secondStartSeconds * 1000) + secondStartilliseconds];
}

async function getAppName() {
    const { file: packageJson } = await getPackageJson();

    return packageJson &&
        packageJson["nativescript"] &&
        packageJson["nativescript"]["id"];
}

export const throwMeasuringFailed = (message: string) => {
    const errorMessage = `${MEASURE_FAILED_MESSAGE} ${message}`;
    logMeasuringFailed(errorMessage);

    return new Error(errorMessage);
}

export const logMeasuringFailed = (message: string = MEASURE_FAILED_MESSAGE) =>
    console.log(warn(message));