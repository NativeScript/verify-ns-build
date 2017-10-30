import { resolve } from "path";
import { toTrace, saveTimeline } from "timeline-view";

import { TIMELINE_FILENAME } from "../constants";
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
    if (!log) {
        return {
            error: "Timeline couldn't be generated! Log is empty!"
        };
    }

    const logLines = log.split(/\r?\n/);
    const traces = logLines.map(toTrace).filter(t => !!t);
    if (!traces.length) {
        return {
            error: "Timeline couldn't be generated! No traces!"
        };
    }

    const reportDestination = resolve(reportDir, TIMELINE_FILENAME);
    try {
        saveTimeline(traces, reportDestination);
        return { reportDestination };

    } catch (originalError) {
        return {
            error: {
                message: "Generating timeline failed!",
                originalError,
            },
        };

    } finally {
        await restoreProfilingValue();
    }
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
