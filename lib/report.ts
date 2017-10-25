import { resolve } from "path";

import {
    BUILD_REPORT_FILENAME,
    REPORT_DIR,
    BUNDLE_ANALYZER,
} from "./constants";
import { stringify, ensure } from "./utils";
import { writeFile, rename } from "./fs";

export async function saveReport(result, name) {
    const reportDir = await getReportDirPath(name);
    const reportPath = resolve(reportDir, BUILD_REPORT_FILENAME);
    await writeFile(reportPath, stringify(result));

    if (result.bundle) {
        await saveBundleReport(reportDir, name);
    }
}

export async function getReportDirPath(buildName) {
    const buildReportDir = resolve(REPORT_DIR, buildName);
    await ensure(REPORT_DIR);
    await ensure(buildReportDir);

    return buildReportDir;
}

async function saveBundleReport(reportDir, name) {
    const { dir: bundleReportDir, files } = BUNDLE_ANALYZER;

    const filesToMove = Object.values(BUNDLE_ANALYZER.files).map(fileName => ({
        oldLocation: resolve(BUNDLE_ANALYZER.dir, fileName),
        newLocation: resolve(reportDir, fileName),
    }));

    for (const {oldLocation, newLocation} of filesToMove) {
        await rename(oldLocation, newLocation);
    }
}
