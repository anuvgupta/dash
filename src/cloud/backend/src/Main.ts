import * as Express from "express";

import Is from "./utils/Is";
import Log from "./utils/Log";
import Utilities from "./utils/Utilities";
import Configuration from "./config/Configuration";
import DatabaseAccessor from "./database/DatabaseAccessor";
import InvalidConfigException from "./exception/InvalidConfigException";

export default class Main {
    static main() {
        const log = new Log("Main");

        log.info("dash-cloud");

        const databaseName = "temp_db_name";
        const databaseHost = "localhost";
        const databasePort = 27017;

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

// entry point
Main.main();
