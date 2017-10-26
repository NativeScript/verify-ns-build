import { resolve } from "path";
import { toTrace, saveTimeline } from "timeline-view";

import { BUILD_REPORT_FILENAME } from "../constants";
import { getInnerPackageJson } from "../project-helpers";
import { stringify } from "../utils";
import { writeFile } from "../fs";

let profilingOriginalValue;
let updatedValue = false;

process.on("exit", restoreProfilingValue);
process.on("SIGINT", restoreProfilingValue);

export async function enableTraces() {
    await saveProfilingValue();
    const { file: packageJson, path: packageJsonPath } = await getInnerPackageJson();
    packageJson["profiling"] = "timeline";

    await writeFile(packageJsonPath, stringify(packageJson));
}

export async function generateReport(log, reportDir) {
    const logLines = (log || "").split(/\r?\n/);
    const traces = logLines.map(toTrace).filter(t => !!t);
    const reportDestination = resolve(reportDir, BUILD_REPORT_FILENAME);

    saveTimeline(traces, reportDestination);
    await restoreProfilingValue();
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
