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

