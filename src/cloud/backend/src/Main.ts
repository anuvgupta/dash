import * as Express from "express";

import Is from "./utils/Is";
import Log from "./utils/Log";
import Utilities from "./utils/Utilities";
import Configuration from "./config/Configuration";
import DatabaseAccessor from "./database/DatabaseAccessor";
import InvalidConfigException from "./exception/InvalidConfigException";

const APP_NAME: string = "dash-cloud";
const BASE_DIR: string = `${__dirname}`;
const CONFIG_PATH: string = "../config/config.json";

/**
 * Main class
 */
export default class Main {
    /**
     * Main method
     */
    static main(...args: any[]) {
        args = Array.from(args).slice(2);

        const log = new Log("Main");
        log.info(APP_NAME);
        const config: Configuration = new Configuration(
            `${BASE_DIR}/${CONFIG_PATH}`
        );
        config.load();

        const databaseHost: string = config.get("mongo_host");
        const databasePort: number = config.get("mongo_port");
        const databaseName: string = config.get("mongo_database");
        const databaseAccessor: DatabaseAccessor = new DatabaseAccessor(
            databaseName,
            databaseHost,
            databasePort
        );

        log.info("Connecting to database");
        databaseAccessor.connect(() => {
            log.info("Connected to database");
        });
    }
}

// Entry point
Main.main(...process.argv);
