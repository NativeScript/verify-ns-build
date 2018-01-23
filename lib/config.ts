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
    const { configPath, updateFlavor, verificationFlavor } = getArgs();
    const config = <VerifySchema>loadJson(configPath);

    const update = config.updateFlavors.find(u => u.name === updateFlavor);
    if (!update) {
        throw new Error(`Cannot find update flavor with name '${updateFlavor}'!`)
    }
    const verification = config.verificationFlavors.find(v => v.name === verificationFlavor);
    if (!verification) {
        throw new Error(`Cannot find verification flavor with name '${verification}'`);
    }

    const releaseConfigPath = process.env.npm_config_releaseConfig || config.releaseConfig;
    const releaseConfig = loadReleaseConfig(releaseConfigPath);

    return {
        update,
        verification,
        releaseConfig,
    };
}

function getArgs() {
    const configPath = process.env.npm_config_path;
    const updateFlavor = process.env.npm_config_update;
    const verificationFlavor = process.env.npm_config_verification;

    const errors = [];
    if (!configPath) {
        errors.push(argIsRequiredErrorMessage("path"));
    }

    if (!updateFlavor) {
        errors.push(argIsRequiredErrorMessage("update"));
    }

    if(!verificationFlavor) {
        errors.push(argIsRequiredErrorMessage("verification"));
    }

    if (errors.length) {
        const message = errors.reduce((acc, curr) => `${acc}\n\t${curr}`, "");
        throw new Error(message);
    } else {
        return {
            configPath,
            updateFlavor,
            verificationFlavor,
        };
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
