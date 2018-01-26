export interface ConfigOptions {
    /**
     * Path to the verify.config.json.
     * It can be either relative ("./verify.config.json")
     * or absolute ("verify.config.json").
     */
    config?: string;
    /**
     * Name of a preloaded configuration to be used.
     * The path for the config to be fetched from will be:
     * ./node_modules/verify-ns-build/config/${defaultConfig}/verify.config.json
     */
    defaultConfig?: string;
    /**
     * Path to the release configuration.
     * It can be either relative ("./release.config.json")
     * or absolute ("release.config.json").
     */
    releaseConfig?: string;
    /**
     * The update flavor to be used.
     * It should match an update configuration
     * with the same name from the updateFlavors array
     * in the verify.config.json.
     * If it's not specified, the flavor with name 'default'
     * will be used.
     */
    update?: string;

    /**
     * The verification flavor to be used.
     * It should match an update configuration
     * with the same name from the verificationFlavors array
     * in the verify.config.json.
     * If it's not specified, the verification with name 'default'
     * will be used.
      */
    verification?: string;
}
