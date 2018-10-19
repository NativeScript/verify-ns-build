import { mkdirSync } from "fs";
import { NpmDependency } from "../verify-schema";

export function stringify(obj) {
    return JSON.stringify(obj, null, 2);
}

export async function ensure(dir) {
    try {
        mkdirSync(dir);
    } catch (e) {
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

const underlineCode = "\u001b[4m";

export const underline = (text: string) =>
    paint(underlineCode, text);

export const info = (text: string) =>
    paint(colors.yellow, text);

export const track = (text: string) =>
    paint(colors.purple, text);

export const warn = (text: string) =>
    paint(colors.red, text);

const paint = (color: string, text: string) =>
    `${color}${text}${colors.reset}`;

export const hasError = (report: object) =>
    report.hasOwnProperty("error") ||
    Object.values(report)
        .filter(value => value !== null && typeof value === "object")
        .some(hasError);

export const getPackage = (dependency: NpmDependency) => {
    return process.env[dependency.name] || process.env[dependency.name.replace(/-/g, '_')] || dependency.package;
}