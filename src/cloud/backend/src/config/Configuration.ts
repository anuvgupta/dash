import * as Fs from "fs";

import InvalidConfigException from "../exception/InvalidConfigException";

/**
 * Configuration loader
 */
class Configuration {
    sourcePath: string;
    configFileData: string;
    configData: any;
    constructor(sourcePath: string) {
        this.sourcePath = sourcePath;
        this.configFileData = "";
        this.configData = null;
    }

    /**
     * Load configuration data from file
     */
    load(): void {
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
        } catch (e) {
            throw new InvalidConfigException(
                `Configuration file ${this.sourcePath} contains invalid JSON`
            );
        }
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

export default Configuration;
