import { spawn, spawnSync } from "child_process";
import { statSync, rmdirSync, unlinkSync, existsSync, readdirSync } from "fs";
import { resolve } from "path";

import { track, info } from "./utils";

import { PLATFORMS_DIR } from "./constants";

const NEW_DATA_WAIT_TIME = 2 * 60 * 1000;
const nsSpawnedProcesses = [];
const nsTimeoutIntervals = [];

const clearIntervals = () =>
    nsTimeoutIntervals.forEach(interval => clearInterval(interval));

const stopDetachedProcess = childProcess => {
    try {
        process.kill(-childProcess.pid);
    } catch (e) { }
};

const clearOnExit = () => {
    nsSpawnedProcesses.forEach(stopDetachedProcess)
    clearIntervals();
};

process.on("exit", clearOnExit);
process.on("SIGINT", () => {
    nsSpawnedProcesses.forEach(childProcess => {
        childProcess.stdout.destroy();
        childProcess.stderr.destroy();
    });

    clearOnExit();
});

export interface ExecutionResult {
    error?: Error,
    log?: any,
}

export async function executeAndKillWhenIdle(command, cwd, printLog = true)
    : Promise<ExecutionResult> {

    return await execute(command, cwd, printLog, true);
}

export async function execute(fullCommand, cwd, printLog = true, kill = false)
    : Promise<ExecutionResult> {

    const [command, ...args] = fullCommand.split(" ");
    const filteredArgs = args.filter(a => !!a);
    const options = { cwd, command, args: filteredArgs, printLog };

    const action = kill ? spawnAndTrack : spawnAndWait;

    try {
        const log = await action(options);
        return { log };
    } catch (error) {
        return error;
    }
}

const spawnAndTrack = ({ cwd, command, args, printLog }) =>
    new Promise((resolve, reject) => {
        console.log(info(`Spawning ${command} ${args}`));
        let log = "";
        let newDataArrived = false;

        const options = {
            cwd,
            stdio: "pipe",
            shell: true,
            detached: true,
        };

        const childProcess = spawn(command, args, options);
        nsSpawnedProcesses.push(childProcess);

        childProcess.stdout.on("data", processData);
        childProcess.stderr.on("data", processData);

        function processData(message) {
            if (printLog) {
                console.log(message.toString());
            }

            log += message;
            newDataArrived = true;
        }

        childProcess.on("close", code => {
            clearIntervals();
            handleClose(resolve, reject, code, log);
        });

        let waitTime = NEW_DATA_WAIT_TIME;
        const trackId = setInterval(() => {
            if (newDataArrived) {
                newDataArrived = false;
                waitTime = NEW_DATA_WAIT_TIME;
            } else {
                console.log(info(`Waiting time expired.\nKilling ${command} ${args}`));
                clearIntervals();
                stopDetachedProcess(childProcess);
                resolve(log);
            }
        }, NEW_DATA_WAIT_TIME);

        const PROGRESS_BAR_INTERVAL = 1000;
        const newDataWaitId = setInterval(() => {
            if (!newDataArrived) {
                console.log(track(`Waiting for ${waitTime / 1000}s for output...`));
                waitTime -= PROGRESS_BAR_INTERVAL;
            }

        }, PROGRESS_BAR_INTERVAL);

        nsTimeoutIntervals.push(trackId);
        nsTimeoutIntervals.push(newDataWaitId);
    });

function spawnAndWait({ cwd, command, args, printLog }) {
    return new Promise((resolve, reject) => {
        const childProcess = spawn(command, args, {
            stdio: printLog ? "inherit" : "ignore",
            cwd,
            shell: true,
        });

        childProcess.on("close", code => {
            handleClose(resolve, reject, code);
        });
    });
}

function handleClose(resolve, reject, code, log?) {
    if (code === 0) {
        log ? resolve(log) : resolve();
    } else {
        const result = {
            error: {
                code,
                message: `child process exited with code ${code}`,
            },
            log,
        };

        reject(result);
    }
}

function getFileNames(folder: string) {
    let files: Array<string> = new Array();
    readdirSync(resolve(folder)).forEach(file => {
        files.push(file);
    });

    return files;
}

function removeFileOrFolder(fullName: string) {
    if (statSync(fullName).isDirectory()) {
        try {
            rmdirSync(fullName);
        } catch (error) {
            unlinkSync(fullName);
        }

    } else if (statSync(fullName).isFile() || statSync(fullName).isSymbolicLink()) {
        unlinkSync(fullName);
    }
}