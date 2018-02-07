import { getInnerPackageJson } from "./project-helpers";
import { stringify } from "./utils";
import { writeFileSync } from "fs";

process.on("exit", restoreProfilingValue);
process.on("SIGINT", restoreProfilingValue);

let profilingOriginalValue;
let updatedValue = false;

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
