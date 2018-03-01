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

const MEASURE_FAILED_MESSAGE = "Startup time couldn't be measured!";

export async function verifyStartupTime(
    maxTime: number,
    platform: "ios"|"android",
    log: string,
) {

    let startup: number;
    try {
        startup = await getStartupTime(platform, log);
    } catch (error) {
        return { error: error.message };
    }

    if (!startup) {
        logMeasuringFailed();
        return { error: MEASURE_FAILED_MESSAGE };
    }

    const result = { expected: maxTime, actual: startup };
    if (startup > maxTime) {
        return {
            error: `Startup time is more than expected!`,
            ...result,
        };
    } else {
        return result;
    }
}

async function getStartupTime(platform: "ios"|"android", log: string)
    : Promise<number> {

    if (platform === "ios") {
        return await getIosStartupTime(log);
    } else {
        return await getAndroidStartupTime(log);
    }
}

async function getIosStartupTime(log: string): Promise<number> {
    const matches = log.match(DISPLAYED_EVENT_FILTER);
    if (!matches || !matches.length) {
        throw throwMeasuringFailed("'onDisplayed' event not found in the provided log!");
    }

    const startupLine = matches.pop();
    const timeString = startupLine.match(DISPLAYED_EVENT_TIME_FILTER)[0];

    if (!timeString) {
        throw throwMeasuringFailed(`Time not found in ${startupLine}`);
    }

    const time = parseFloat(timeString);
    if (isNaN(time)) {
        throw throwMeasuringFailed(`Logged time - ${time} is not a number!`);
    }

    return time;
}

async function getAndroidStartupTime(log: string): Promise<number> {
    const appName = await getAppName();
    const filter = ADB_STARTUP_FILTER(appName);
    const matches = log.match(filter);
    if (!matches || !matches.length) {
        throw throwMeasuringFailed("'Displayed' event not found in device log!");
    }

    const startupLine = matches.pop();
    const time = startupLine.match(ADB_TIME_FILTER);
    const [, seconds, milliseconds ] = time.map(s => parseInt(s));

    return (seconds * 1000) + milliseconds;
}

async function getAppName() {
    const { file: packageJson } = await getPackageJson();

    return packageJson &&
        packageJson["nativescript"] &&
        packageJson["nativescript"]["id"];
}

const throwMeasuringFailed = (message: string) => {
    const errorMessage = `${MEASURE_FAILED_MESSAGE} ${message}`;
    logMeasuringFailed(errorMessage);

    return new Error(errorMessage);
}

const logMeasuringFailed = (message: string = MEASURE_FAILED_MESSAGE) =>
    console.log(warn(message));

