import { getInnerPackageJson } from "./project-helpers";
import { stringify } from "./utils";
import { writeFileSync } from "fs";
import { ChildProcess, spawn } from "child_process";
import { splitCommand } from "./command";
import { Verification } from "../verify-schema";

process.on("exit", restoreProfilingValue);
process.on("SIGINT", restoreProfilingValue);

const DEVICE_LOG_COMMANDS = {
    android: "adb logcat",
    ios: "idevicesyslog"
};

let profilingOriginalValue;
let updatedValue = false;

export class LogTracker {
    private log: string;
    private trackerProcess: ChildProcess;

    constructor(fullCommand: string) {
        const { command, args } = splitCommand(fullCommand);
        this.start(command, args);
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
        const command = DEVICE_LOG_COMMANDS[platform];
        const tracker = new LogTracker(command);
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
