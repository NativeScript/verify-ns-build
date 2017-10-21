import { spawn } from "child_process";

export async function execute(fullCommand, cwd) {
    const { command, args } = fullCommand.split(" ");
    await spawnChildProcess(cwd, command, ...args);
}

function spawnChildProcess(cwd, command, ...args) {
    return new Promise((resolve, reject) => {
        const escapedArgs = args.map(a => `"${a}"`);

        const childProcess = spawn(command, escapedArgs, {
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

