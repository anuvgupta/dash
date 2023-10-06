import * as Express from "express";

import Is from "./utils/Is";
import Log from "./utils/Log";
import Utilities from "./utils/Utilities";
import Configuration from "./config/Configuration";
import DatabaseAccessor from "./database/DatabaseAccessor";
import CommandLineInterface from "./cli/CommandLineInterface";
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
        args = Utilities.getArguments(args);
        console.log(args);

        const log = new Log("Main");
        log.info(APP_NAME);

        // Configuration
        log.info("Loading config");
        const config: Configuration = new Configuration(
            `${BASE_DIR}/${CONFIG_PATH}`
        );
        config.load();

        // Command-line interface
        log.info("Loading CLI");
        const cli: CommandLineInterface = new CommandLineInterface();
        cli.load();

        // Database
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
            // TODO: more initialization
        });
    }
}

// Entry point
Main.main(...process.argv);
