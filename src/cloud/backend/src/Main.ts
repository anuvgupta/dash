import Is from "./utils/Is";
import Log from "./utils/Log";
import Utilities from "./utils/Utilities";
import WebServer from "./server/WebServer";
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
     * Main constructor
     */
    stage: string;
    webServer: WebServer;
    config: Configuration;
    cli: CommandLineInterface;
    database: DatabaseAccessor;
    log: Log;
    constructor(stage: string) {
        this.log = new Log("Main");
        this.log.info(APP_NAME);
        this.stage = stage;

        this.config = new Configuration(`${BASE_DIR}/${CONFIG_PATH}`);
        this.log.info("Loading config");
        this.config.load();

        this.cli = new CommandLineInterface();

        this.database = new DatabaseAccessor(
            this.config.get("mongo_database"),
            this.config.get("mongo_host"),
            this.config.get("mongo_port")
        );

        const baseDirPathArr = BASE_DIR.split("/");
        const backendPath =
            baseDirPathArr.slice(0, baseDirPathArr.length - 2).join("/") +
            "/backend";
        const frontendPath =
            baseDirPathArr.slice(0, baseDirPathArr.length - 2).join("/") +
            "/frontend";
        this.webServer = new WebServer(
            this.config.get("http_port"),
            this.stage,
            this.config.get("env"),
            backendPath,
            frontendPath
        );
    }

    /**
     * Load singleton modules
     */
    load(callback: () => void): void {
        this.log.info("Loading CLI");
        this.cli.load();
        this.log.info("Connecting to database");
        this.database.load(() => {
            this.log.info("Connected to database");
            this.log.info("Starting web server");
            this.webServer.load(() => {
                this.webServer.route();
                callback();
            });
        });
    }

    /**
     * Main method
     */
    static main(...args: any[]) {
        args = Utilities.getArguments(args);
        // console.log(args);
        let stage: string = "prod";
        if (args.length > 0) {
            stage = `${args[0]}`;
        }
        const main = new Main(stage);
        main.load(() => {
            main.log.info("Ready");
        });
    }
}

// Entry point
Main.main(...process.argv);
