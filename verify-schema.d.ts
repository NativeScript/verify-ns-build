export interface VerifySchema {
    releaseConfigPath?: string;
    updateFlavors?: UpdateFlavor[];
    verificationFlavors?: VerificationFlavor[];
    outFileName?: string;
}

export interface UpdateFlavor {
    name: string;
    dependencies?: NpmDependency[];
    updateAngularDeps?: boolean;
    updateWebpack?: WebpackUpdateOptions;
}

export interface NpmDependency {
    /**
     * Name of the package to be installed.
     */
    name: string;
    /**
     * Package to be installed with 'npm install'.
     * Will be concatenated with the package name and @. Examples:
     * - 'latest' -> 'name@latest'
     * - '../some-path/tns-core-modules-3.4.0.tgz' -> 'name@../some-path/tns-core-modules-3.4.0.tgz'
     */
    package: string;
    /**
     * Specifies whether the package should be installed as
     * a dependency or as a development dependency,
     * or it should be added as nativescript platform.
     */
    type: "dependency" | "devDependency" | "nsPlatform";
}

export interface WebpackUpdateOptions {
    configs?: boolean;
    deps?: boolean;
}

export interface VerificationFlavor {
    name: string;
    verifications?: Verification[];
}

export interface Verification {
    platform: "android" | "ios";
    type: "build" | "run";
    name?: string;
    bundle?: boolean;
    release?: boolean;
    tnsOptions?: string[];
    outputSizes?: FileSizeMap;
    timeline?: boolean;
    startup?: number;
    secondStartTime?: number;
    numberOfRuns?: number;
    expectedInOutput?: string[];
    trackerTimeout?: number;
    getExpectedTime?: boolean;
    tolerance?: number;
    copyInstallable?: boolean;
    enableLifecycle?: boolean;
    device?: boolean;

}

interface FileSizeMap {
    [fileName: string]: string;
}

export interface ReleaseConfig {
    android: string;
    ios: string;
}
