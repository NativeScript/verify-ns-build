import { resolve } from "path";

import { toTrace, saveTimeline } from "timeline-view";

import { restoreProfilingValue } from "../traces";
import { TIMELINE_FILENAME } from "../constants";

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
