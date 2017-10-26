import { resolve } from "path";

import { BUNDLE_ANALYZER } from "../constants";
import { readFile } from "../fs";

export async function verifyAssets(outputSizes) {
    const assets = await loadAssets();
    if (!assets) {
        return;
    }

    const assetsToCheck = Object.keys(outputSizes);
    const missing = assetsToCheck.filter(name => !assets[name]);
    assetsToCheck.forEach(name => {
        if (assets[name] > outputSizes[name]) {
            assets[name].isOverSizeLimit = true;
        }
    });

    return { assets, missing };
}

async function loadAssets() {
    const stats = await loadBundleStats();
    if (!stats) {
        return;
    }

    const { assets } = stats;
    const nameSizeMap = assets
        .reduce((acc, { name, size }) => {
            acc[name] = size;
            return acc;
        }, {});

    return nameSizeMap;
}

async function loadBundleStats() {
    try {
        const { dir: bundleReportDir, files } = BUNDLE_ANALYZER;
        const bundleStatsPath = resolve(bundleReportDir, files.stats);
        const statsStream = await readFile(bundleStatsPath, "utf8");
        const stats = JSON.parse(statsStream);
        return stats;
    } catch(e) {
        console.error("Stats file does not exist!");
        return;
    }
}
