import * as Fs from "fs";

import Log from "../utils/Log";
import InvalidConfigException from "../exception/InvalidConfigException";

/**
 * Configuration loader
 */
@Log.Inject
export default class Configuration {
    /**
     * Configuration constructor
     */
    sourcePath: string;
    configFileData: string;
    configData: any;
    log: Log;
    constructor(sourcePath: string) {
        this.sourcePath = sourcePath;
        this.configFileData = "";
        this.configData = null;
    }

    /**
     * Load configuration data from file
     */
    load(): void {
        this.log.info(`Configuration file ${this.sourcePath} loading`);
        // Read config file data
        if (!Fs.existsSync(this.sourcePath)) {
            throw new InvalidConfigException(
                `Configuration file ${this.sourcePath} not found`
            );
        }
        this.configFileData = Fs.readFileSync(this.sourcePath, {
            encoding: "utf8",
            flag: "r",
        });
        // Parse config file data
        try {
            this.configData = JSON.parse(this.configFileData);
        } catch (exception) {
            throw new InvalidConfigException(
                `Configuration file ${this.sourcePath} contains invalid JSON`,
                exception
            );
        }
        this.log.info(`Configuration file ${this.sourcePath} loaded`);
    }

    /**
     * Get configuration value by key
     */
    get(key: string): any {
        if (!this.configData.hasOwnProperty(key)) {
            return null;
        }
        return this.configData[key];
    }
}
