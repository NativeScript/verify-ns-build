import { spawn } from "child_process";

const NEW_DATA_WAIT_TIME = 10 * 1000;
const nsSpawnedProcesses = [];
const nsTimeoutIntervals = [];

const stopDetachedProcess = childProcess => {
    try {
        process.kill(-childProcess.pid);
    } catch (e) {}
};

const clearOnExit = () => {
    nsSpawnedProcesses.forEach(stopDetachedProcess)
    nsTimeoutIntervals.forEach(interval => clearInterval(interval));
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

export async function executeAndKillWhenIdle(command, cwd)
    : Promise<ExecutionResult> {

    return await execute(command, cwd, true);
}

export async function execute(fullCommand, cwd, kill = false)
    : Promise<ExecutionResult> {

    const [ command, ...args ] = fullCommand.split(" ");
    const filteredArgs = args.filter(a => !!a);
    const options = { cwd, command, args: filteredArgs };

    const action = kill ? spawnAndTrack : spawnAndWait;

    try {
        const log = await action(options);
        return { log };
    } catch (error) {
        return error;
    }
}

const spawnAndTrack = ({ cwd, command, args }) =>
    new Promise((resolve, reject) => {
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

        const trackId = setInterval(() => {
            if (newDataArrived) {
                newDataArrived = !newDataArrived;
            } else {
                clearInterval(trackId);
                stopDetachedProcess(childProcess);
                resolve(log);
            }
        }, NEW_DATA_WAIT_TIME);
        nsTimeoutIntervals.push(trackId);

        childProcess.stdout.on("data", processData);
        childProcess.stderr.on("data", processData);

        function processData(message) {
            console.log(message.toString());
            log += message;
            newDataArrived = true;
        }

        childProcess.on("close", code => {
            clearInterval(trackId);
            handleClose(resolve, reject, code, log);
        });
    });

function spawnAndWait({ cwd, command, args }) {
    return new Promise((resolve, reject) => {
        const childProcess = spawn(command, args, {
            stdio: "inherit",
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
