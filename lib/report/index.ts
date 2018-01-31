import { resolve } from "path";

import {
    BUILD_REPORT_FILENAME,
    JSON_REPORT_FILENAME,
    REPORT_DIR,
    BUNDLE_ANALYZER,
} from "../constants";
import { stringify, ensure, underline } from "../utils";
import { writeFile, rename } from "../fs";

import { saveHtmlReport } from "./htmlReport";

export async function saveFinalReports(result) {
    await ensure(REPORT_DIR);

    await saveJsonReport(result);
    saveHtmlReport(result);
}

async function saveJsonReport(result) {
    const reportPath = resolve(REPORT_DIR, JSON_REPORT_FILENAME);
    await writeFile(reportPath, stringify(result));

    console.log(`JSON report saved to file://${underline(reportPath)}`);
}

export async function saveBuildReport(result, name) {
    const reportDir = await getReportDirPath(name);
    const reportPath = resolve(reportDir, BUILD_REPORT_FILENAME);
    await writeFile(reportPath, stringify(result));

    if (result.bundle) {
        await moveBundleReport(reportDir, name);
    }
}

export async function getReportDirPath(buildName) {
    const buildReportDir = resolve(REPORT_DIR, buildName);
    await ensure(REPORT_DIR);
    await ensure(buildReportDir);

    return buildReportDir;
}

async function moveBundleReport(reportDir, name) {
    const { dir: bundleReportDir, files } = BUNDLE_ANALYZER;

    const filesToMove = Object.keys(BUNDLE_ANALYZER.files).map(key => ({
        oldLocation: resolve(BUNDLE_ANALYZER.dir, BUNDLE_ANALYZER.files[key]),
        newLocation: resolve(reportDir, BUNDLE_ANALYZER.files[key]),
    }));

    for (const { oldLocation, newLocation } of filesToMove) {
        await rename(oldLocation, newLocation);
    }
}
