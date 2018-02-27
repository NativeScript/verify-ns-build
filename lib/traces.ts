import { writeFileSync } from "fs";
import { ChildProcess, spawn, spawnSync } from "child_process";
import { resolve } from "path";

import { Verification } from "../verify-schema";
import { getInnerPackageJson } from "./project-helpers";
import { stringify } from "./utils";
import { splitCommand, execute } from "./command";
import { PROJECT_DIR } from "./constants";

process.on("exit", restoreProfilingValue);
process.on("SIGINT", restoreProfilingValue);

export interface LogCommands {
    prepareCommand?: string;
    startCommand: string;
}

const ANDROID_HOME_PATH = process.env["ANDROID_HOME"];
const ADB_PATH = resolve(ANDROID_HOME_PATH, "platform-tools", "adb");

const DEVICE_LOG_COMMANDS = {
    android: {
        prepareCommand: `${ADB_PATH} logcat -c`,
        startCommand: `${ADB_PATH} logcat`,
    },
    ios: {
        startCommand: "idevicesyslog",
    }
};

let profilingOriginalValue;
let updatedValue = false;

export class LogTracker {
    private log: string;
    private trackerProcess: ChildProcess;

    constructor({ prepareCommand, startCommand }: LogCommands) {
        if (prepareCommand) {
            this.prepare(prepareCommand);
        }

        const { command, args } = splitCommand(startCommand);
        this.start(command, args);
    }

    private async prepare(command: string) {
        spawnSync(command, { cwd: PROJECT_DIR, shell: true });
    }

    private start(command: string, args: string[]) {
        this.trackerProcess = spawn(command, args);

        this.trackerProcess.stdout.on("data", data => this.log += data);
        this.trackerProcess.stderr.on("data", data => this.log += data);
    }

    public close(): string {
        this.trackerProcess.kill();
        return this.log;
    }
}

export async function enableProfiling(
    { timeline, startup, platform, expectedInOutput }: Verification
):
    Promise<void | LogTracker> {

    if (timeline) {
        await enableTraces("timeline");
    } else if (startup) {
        await enableTraces("lifecycle");
    }

    if (timeline || startup || expectedInOutput) {
        const commands = DEVICE_LOG_COMMANDS[platform];
        const tracker = new LogTracker(commands);
        return tracker;
    }
}

export async function enableTraces(tracingLvl: string) {
    await saveProfilingValue();
    const { file: packageJson, path: packageJsonPath } = await getInnerPackageJson();
    packageJson["profiling"] = tracingLvl;

    writeFileSync(packageJsonPath, stringify(packageJson));
}

async function saveProfilingValue() {
    const { file } = await getInnerPackageJson();

    if (!profilingOriginalValue) {
        profilingOriginalValue = file["profiling"];
    }

    updatedValue = true;
}

export async function restoreProfilingValue() {
    if (!updatedValue) {
        return;
    }

    const { file, path } = await getInnerPackageJson();
    if (!profilingOriginalValue) {
        delete file["profiling"];
    } else {
        file["profiling"] = profilingOriginalValue;
    }

    updatedValue = false;
    profilingOriginalValue = null;

    writeFileSync(path, stringify(file));
}
