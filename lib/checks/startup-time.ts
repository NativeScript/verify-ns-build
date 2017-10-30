import { PROJECT_DIR } from "../constants";
import { executeAndKillWhenIdle, ExecutionResult } from "../command";
import { getPackageJson } from "../project-helpers";
import { warn } from "../utils";

const TIME_FILTER = `\\+(\\d+)s(\\d+)ms`;
const ADB_STARTUP_FILTER = (appName) =>
new RegExp(`Displayed ${appName}/com.tns.NativeScriptActivity: ${TIME_FILTER}`, "g");

const MEASURE_FAILED_MESSAGE = "Startup time couldn't be measured!";
const warnMeasuringFailed = () => console.log(warn(MEASURE_FAILED_MESSAGE));

export async function verifyStartupTime(
    maxTime: number,
    platform: "ios"|"android",
) {

    let startup: number;
    try {
        startup = await getStartupTime(platform);
    } catch(error) {
        return { error };
    }

    if (!startup) {
        warnMeasuringFailed();
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

async function getStartupTime(platform: "ios"|"android")
    : Promise<number> {

    if (platform === "ios") {
        throw new Error(`Startup time cannot be measured for ${platform}`);
    } else {
        return await getAndroidStartupTime();
    }
}

async function getAndroidStartupTime(): Promise<number> {
    const command = `adb logcat -d`;
    const { error, log } =
        await executeAndKillWhenIdle(command, PROJECT_DIR, false);

    if (error) {
        warnMeasuringFailed();
        throw error;
    }

    const appName = await getAppName();
    const filter = ADB_STARTUP_FILTER(appName);
    const startupLine = log.match(filter).pop();
    if (!startupLine) {
        warnMeasuringFailed();
        throw error;
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
