import { resolve } from "path";
import { readFileSync, existsSync } from "fs";
import { warn } from "./utils";

import { PROJECT_DIR } from "./constants";

export async function getInnerPackageJson() {
    const defaultAppPath = 'app';
    const nsConfigPath = resolve(PROJECT_DIR, "nsconfig.json");
    try {
        const nsConfig = JSON.parse(readFileSync(nsConfigPath, "utf8"));
        return await getPackageJson(resolve(PROJECT_DIR, nsConfig.appPath));
	} catch(_) {
        console.log(warn(`Couldn't get appPath from NSConfig! The default appPath ${defaultAppPath} will be used.`));
        return await getPackageJson(resolve(PROJECT_DIR, defaultAppPath));
    }
}

export async function getPackageJson(projectDir = PROJECT_DIR) {
    const path = resolve(projectDir, "package.json");
    const buffer = readFileSync(path, "utf8");
    const file = JSON.parse(buffer);

    return { path, file };
}

