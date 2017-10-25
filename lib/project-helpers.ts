import { resolve } from "path";

import { readFile } from "./fs";
import { PROJECT_DIR } from "./constants";

export async function getInnerPackageJson() {
    const appPath = resolve(PROJECT_DIR, "app");
    return await getPackageJson(appPath);
}

export async function getPackageJson(projectDir = PROJECT_DIR) {
    const path = resolve(projectDir, "package.json");
    const buffer = await readFile(path, "utf8");
    const file = JSON.parse(buffer);

    return { path, file };
}

