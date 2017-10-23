import { spawn } from "child_process";

const NEW_DATA_WAIT_TIME = 10 * 1000;

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
    const options = { cwd, command, args, kill };

    try {
        const log = await spawnChildProcess(options);
        return { log };
    } catch (error) {
        return { error };
    }
}

const spawnChildProcess = ({ cwd, command, args, kill }) =>
    new Promise((resolve, reject) => {
        let log = "";
        let newDataArrived = false;

        const options = {
            cwd,
            stdio: kill ? "pipe" : "inherit",
            shell: true,
            detached: true,
        };

        const truthyArgs = args.filter(a => !!a);
        const childProcess = spawn(command, truthyArgs, options);

        let trackId;
        if (kill) {
            trackId = setInterval(() => {
                if (newDataArrived) {
                    newDataArrived = !newDataArrived;
                } else {
                    stopChildProcess();
                }
            }, NEW_DATA_WAIT_TIME);
         }

        childProcess.stdout.on("data", processData);
        childProcess.stderr.on("data", processData);

        function processData(message) {
            console.log(message.toString());
            log += message;
            newDataArrived = true;
        }

        childProcess.on("close", code => {
            if (code === 0) {
                if (trackId) {
                    clearInterval(trackId);
                }

                resolve(log);
            } else {
                reject({
                    code,
                    message: `child process exited with code ${code}`,
                });
            }
        });

        process.on("exit", () => {
            stopChildProcess();
        });

        function stopChildProcess() {
            if (trackId) {
                clearInterval(trackId);
            }

            try {
                process.kill(-childProcess.pid);
            } catch(e) {}
        }
    });

