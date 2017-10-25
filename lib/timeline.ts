import { resolve } from "path";
import { toTrace, saveTimeline } from "timeline-view";

import { BUILD_REPORT_FILENAME } from "./constants";
import { getInnerPackageJson } from "./project-helpers";
import { stringify } from "./utils";
import { writeFile } from "./fs";

let profilingOriginalValue;
let updatedValue = false;

process.on("exit", restoreProfilingValue);
process.on("SIGINT", restoreProfilingValue);

export async function modifyProfilingValue(isEnabled) {
    saveProfilingValue();

    if (isEnabled) {
        await enableTraces();
    } else {
        await disableTraces();
    }
}

export async function generateReport(log, reportDir) {
    const logLines = (log || "").split(/\r?\n/);
    const traces = logLines.map(toTrace).filter(t => !!t);
    const reportDestination = resolve(reportDir, BUILD_REPORT_FILENAME);

    saveTimeline(traces, reportDestination);
}

async function saveProfilingValue() {
    const { file } = await getInnerPackageJson();
    profilingOriginalValue = file["profiling"];
    updatedValue = true;
}

async function restoreProfilingValue() {
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

    await writeFile(path, stringify(file));
}

async function enableTraces() {
    const { file: packageJson, path: packageJsonPath } = await getInnerPackageJson();
    packageJson["profiling"] = "timeline";

    await writeFile(packageJsonPath, stringify(packageJson));
}

async function disableTraces() {
    const { file: packageJson, path: packageJsonPath } = await getInnerPackageJson();
    delete packageJson["profiling"];

    await writeFile(packageJsonPath, stringify(packageJson));
}
