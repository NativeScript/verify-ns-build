import { resolve } from "path";

import { BUNDLE_ANALYZER } from "../constants";
import { readFile } from "../fs";

export async function verifyAssets(outputSizes) {
    const assets = await loadAssets();
    if (!assets || assets.error) {
        return assets;
    }

    const assetsToCheck = Object.keys(outputSizes);
    const checked = assetsToCheck.map(name => {
        const produced = assets[name];
        const asset = { name };
        if (!produced) {
            return Object.assign(asset, {
                missing: true,
                error: "Asset is missing!",
            });
        } else if (produced.size > outputSizes[name]) {
            return Object.assign(asset, {
                isOverSizeLimit: true,
                error: `Asset is over size limit! ` +
                    `Expected: ${outputSizes[name]}. Actual: ${produced.size}.`,
            });
        } else {
            return Object.assign(asset, {
                size: produced.size,
                success: true,
            });
        }
    });

    return checked;
}

async function loadAssets() {
    const stats = await loadBundleStats();
    if (!stats || stats.error) {
        return stats;
    }

    const { assets } = stats;
    const nameSizeMap = assets
        .reduce((acc, { name, size }) => {
            acc[name] = { size };
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
    } catch (e) {
        return { error: `Stats file could not be loaded! Original error:\n\t${e}` };
    }
}
