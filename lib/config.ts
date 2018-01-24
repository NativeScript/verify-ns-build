import { join } from "path";
import { homedir } from "os";

import {
    VerifySchema,
    ReleaseConfig,
    UpdateFlavor,
    VerificationFlavor,
 } from "../verify-schema";

export interface Config {
    update: UpdateFlavor;
    verification: VerificationFlavor;
    releaseConfig: ReleaseConfig;
}

export function loadConfig(): Config {
    const errors = [];

    const configPath = process.env.npm_config_path;
    if (!configPath) {
        throw new Error(`You must specify --path!`);
    }
    const config = <VerifySchema>loadJson(configPath);

    const update = getFlavor(config.updateFlavors,
        process.env.npm_config_update,
        "update");
    const verification = getFlavor(config.verificationFlavors,
        process.env.npm_config_verification,
        "verification");


    const releaseConfigPath = process.env.npm_config_releaseConfig || config.releaseConfig;
    const releaseConfig = loadReleaseConfig(releaseConfigPath);

    return {
        update,
        verification,
        releaseConfig,
    };
}

function getFlavor(flavors: any[], name: string, categoryName: string) {
    if (!name) {
        const defaultFlavor = flavors.find(f => f.name === "default");

        if (defaultFlavor) {
            return defaultFlavor;
        } else {
            throw new Error(`You must specify --${categoryName} or provide a default flavor!`);
        }
    }

    const flavor = flavors.find(f => f.name === name)
    if (flavor) {
        return flavor;
    } else {
        throw new Error(`${categoryName} with name ${name} not found!`);
    }
}

function argIsRequiredErrorMessage(name: string) {
    return `You must specify --${name}!`;
}

function loadReleaseConfig(path: string): ReleaseConfig {
    const releaseConfig = {
        android: "--release",
        ios: "--release",
    };

    if (path) {
        const loadedConfig = loadJson(path);
        const overrideDefaults = key => releaseConfig[key] = loadedConfig[key];
        Object.keys(loadedConfig).forEach(overrideDefaults);
    }

    return releaseConfig;
}

function loadJson(path) {
    if (path.startsWith(".")) {
        const projectDir = process.env.INIT_CWD || process.cwd();
        path = join(projectDir, path);
    } else if (path.startsWith("~")) {
        path = join(homedir(), path.substr(1));
    }

    const file = require(path);

    return file;
}
