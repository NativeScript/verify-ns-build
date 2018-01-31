import { join } from "path";
import { homedir } from "os";

import { ConfigOptions } from "./config-options";

import {
    VerifySchema,
    ReleaseConfig,
    UpdateFlavor,
    VerificationFlavor,
} from "../verify-schema";

export interface Config {
    outFileName: string;
    update: UpdateFlavor;
    verification: VerificationFlavor;
    releaseConfig: ReleaseConfig;
}

export function loadConfig(options: ConfigOptions): Config {
    const errors = [];

    const { config: configPath, defaultConfig: defaultConfigName } = options;
    if (!configPath && !defaultConfigName) {
        throw new Error(`You must specify config path!`);
    }

    let config: VerifySchema;
    if (configPath) {
        config = loadJson(configPath);
    } else {
        const defaultConfigPath = join(__dirname, `../configs/${defaultConfigName}/verify.config.json`);
        try {
            config = loadJson(defaultConfigPath);
        } catch (e) {
            throw new Error(`Cannot find default configuration called ${defaultConfigName}!`);
        }
    }

    const update = getFlavor(config.updateFlavors,
        options.update,
        "update");
    const verification = getFlavor(config.verificationFlavors,
        options.verification,
        "verification");
    const releaseConfig = loadReleaseConfig(options, config);
    const { outFileName } = config;

    return {
        update,
        verification,
        releaseConfig,
        outFileName,
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

function loadReleaseConfig(configOptions: ConfigOptions, schemaOptions: VerifySchema): ReleaseConfig {
    const path: string = configOptions.releaseConfigPath ||
        schemaOptions.releaseConfigPath;
    const providedConfig: ReleaseConfig = configOptions.releaseConfig;

    const config = {
        android: "--release ",
        ios: "--release ",
    };

    const augmentDefaults = (key, newConfig) => config[key] += newConfig[key];
    if (path) {
        const loadedConfig = loadJson(path);
        Object.keys(loadedConfig).forEach(key => augmentDefaults(key, loadedConfig));
    } else if (providedConfig) {
        Object.keys(providedConfig).forEach(key => augmentDefaults(key, providedConfig));
    }

    return config;
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
