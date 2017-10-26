import { mkdir } from "./fs";

export function stringify(obj) {
    return JSON.stringify(obj, null, 2);
}

export async function ensure(dir) {
    try {
        await mkdir(dir);
    } catch(e) {
        if (e.code !== "EEXIST") {
            throw e;
        }
    }
}

const colors = {
    reset: "\u001b[0m",
    yellow: "\u001b[0;33m",
    purple: "\u001b[0;35m",
};

export const info = (text: string) =>
    `${colors.yellow}${text}${colors.reset}`;
    
export const track = (text: string) =>
    `${colors.purple}${text}${colors.reset}`;
