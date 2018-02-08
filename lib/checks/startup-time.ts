import { PROJECT_DIR } from "../constants";
import { executeAndKillWhenIdle, ExecutionResult } from "../command";
import { getPackageJson } from "../project-helpers";
import { warn } from "../utils";

const TIME_FILTER = `\\+(\\d+)s(\\d+)ms`;
const ADB_STARTUP_FILTER = (appName) =>
new RegExp(`Displayed ${appName}/com.tns.NativeScriptActivity: ${TIME_FILTER}`, "g");

const MEASURE_FAILED_MESSAGE = "Startup time couldn't be measured!";
const throwMeasuringFailed = (message: string) => {
    const errorMessage = `${MEASURE_FAILED_MESSAGE} ${message}`;
    logMeasuringFailed(errorMessage);

    return new Error(errorMessage);
}

const logMeasuringFailed = (message: string = MEASURE_FAILED_MESSAGE) =>
    console.log(warn(message));

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
    const DISPLAYED_EVENT_MATCHER = /Timeline: Modules: Displayed in ((\d|\.)*)ms/g;
    let lastMatch;
    let match;
    while ((match = DISPLAYED_EVENT_MATCHER.exec(log)) !== null) {
        lastMatch = match;
    }

    if (!lastMatch) {
        throw throwMeasuringFailed("'onDisplayed' event not found in the provided log!");
    }

    const TIME_GROUP_INDEX = 1;
    const timeString = lastMatch[TIME_GROUP_INDEX];

    if (!timeString) {
        const MATCHED_STRING_INDEX = 0;
        const matchedString = lastMatch[MATCHED_STRING_INDEX];

        throw throwMeasuringFailed(`Time not found in ${matchedString}`);
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
    const startupLine = log.match(filter).pop();
    if (!startupLine) {
        throw throwMeasuringFailed("'Displayed' event not found in device log!");
    }

    const time = startupLine.match(TIME_FILTER);
    const [, seconds, milliseconds ] = time.map(s => parseInt(s));

    return (seconds * 1000) + milliseconds;
}

async function getAppName() {
    const { file: packageJson } = await getPackageJson();

    return packageJson &&
        packageJson["nativescript"] &&
        packageJson["nativescript"]["id"];
}
