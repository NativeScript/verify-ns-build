import { spawn } from "child_process";

export async function execute(fullCommand, cwd) {
    const [ command, ...args ] = fullCommand.split(" ");
    try {
        await spawnChildProcess(cwd, command, ...args);
    } catch(error) {
        console.error(error);
    }
}

function spawnChildProcess(cwd, command, ...args) {
    return new Promise((resolve, reject) => {
        const truthyArgs = args.filter(a => !!a);

        const childProcess = spawn(command, truthyArgs, {
            stdio: "inherit",
            cwd,
            shell: true,
        });

        childProcess.on("close", code => {
            if (code === 0) {
                resolve();
            } else {
                reject({
                    code,
                    message: `child process exited with code ${code}`,
                });
            }
        });
    });
}

