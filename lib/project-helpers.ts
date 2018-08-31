import { resolve } from "path";
import { readFileSync, existsSync } from "fs";

import { PROJECT_DIR } from "./constants";

export async function getInnerPackageJson() {
    
    let appPath = resolve(PROJECT_DIR, "app");
    const appPathNsconfig = resolve(PROJECT_DIR, "nsconfig.json");
    const doExistsNsconfig = await existsSync(appPathNsconfig);
    if(doExistsNsconfig)
    {
        const nsconfigJson = require(appPathNsconfig);
        appPath = resolve(PROJECT_DIR, nsconfigJson.appPath);
    }
    
    return await getPackageJson(appPath);
}

export async function getPackageJson(projectDir = PROJECT_DIR) {
    const path = resolve(projectDir, "package.json");
    const buffer = readFileSync(path, "utf8");
    const file = JSON.parse(buffer);

    return { path, file };
}

