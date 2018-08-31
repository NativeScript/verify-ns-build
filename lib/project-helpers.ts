import { resolve } from "path";
import { readFileSync, existsSync } from "fs";

import { PROJECT_DIR } from "./constants";

export async function getInnerPackageJson() {
    
    let packageJsonPath = "app";
    const nsConfigPath = resolve(PROJECT_DIR, "nsconfig.json");

    try {
        const nsConfig = JSON.parse(readFileSync(nsConfigPath, "utf8"));
        if (typeof nsConfig.appPath !== 'undefined' &&  nsConfig.appPath !== null) {
            packageJsonPath = nsConfig.appPath;
        }
	} catch(_) {
		
    }
    
    return await getPackageJson(resolve(PROJECT_DIR,packageJsonPath));
}

export async function getPackageJson(projectDir = PROJECT_DIR) {
    const path = resolve(projectDir, "package.json");
    const buffer = readFileSync(path, "utf8");
    const file = JSON.parse(buffer);

    return { path, file };
}

