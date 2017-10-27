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
    red: "\u001b[0;31m",
    yellow: "\u001b[0;33m",
    purple: "\u001b[0;35m",
};

export const info = (text: string) =>
    paint(colors.yellow, text);
    
export const track = (text: string) =>
    paint(colors.purple, text);

export const warn = (text: string) =>
    paint(colors.red, text);

const paint = (color: string, text: string) =>
    `${color}${text}${colors.reset}`;
