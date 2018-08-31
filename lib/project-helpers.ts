import { resolve } from "path";
import { readFileSync, existsSync } from "fs";

import { PROJECT_DIR } from "./constants";

export async function getInnerPackageJson() {
    
    const appPath = resolve(PROJECT_DIR, "app");
    const doExists = await existsSync(resolve(appPath, "package.json"))
    const innerPackageJson = doExists ? await getPackageJson(appPath) : getPackageJson(resolve(PROJECT_DIR, "src"))
    
    return innerPackageJson;
}

export async function getPackageJson(projectDir = PROJECT_DIR) {
    const path = resolve(projectDir, "package.json");
    const buffer = readFileSync(path, "utf8");
    const file = JSON.parse(buffer);

    return { path, file };
}

