export interface Schema {
    releaseConfig?: string;
    updateFlavors?: UpdateFlavor[];
    verificationFlavors?: VerificationFlavor[]; 
}

export interface UpdateFlavor {
    name: string;
    dependencies?: string[];
    devDependencies?: string[];
    updateAngularDeps?: boolean;
    updateWebpack?: boolean;
    keepReport?: boolean;
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
    startup?: string;
}

interface FileSizeMap {
    [fileName: string]: string;
}
