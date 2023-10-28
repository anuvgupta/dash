import Is from "./utils/Is";
import Log from "./utils/Log";
import Utilities from "./utils/Utilities";
import WebServer from "./server/WebServer";
import JwtConfig from "./config/JwtConfig";
import MongoConfig from "./config/MongoConfig";
import Configuration from "./config/Configuration";
import WebSocketServer from "./server/WebSocketServer";
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

    /**
     * Main constructor
     */
    stage: string;
    baseDirPath: string[];
    config: Configuration;
    cli: CommandLineInterface;
    database: DatabaseAccessor;
    webSocketServer: WebSocketServer;
    webServer: WebServer;
    log: Log;
    constructor(stage: string) {
        this.stage = stage;
        this.baseDirPath = BASE_DIR.split("/");
        this.log = new Log("Main");
        this.log.info(APP_NAME);
        // Configuration store
        this.config = new Configuration(`${BASE_DIR}/${CONFIG_PATH}`);
        this.log.info("Loading config");
        this.config.load();
        // Command-line interface
        this.cli = new CommandLineInterface(this);
        // Mongo database accessor
        this.database = new DatabaseAccessor(
            new MongoConfig(this.config.get("mongo"))
        );
        // Web server
        const backendPath =
            this.baseDirPath.slice(0, this.baseDirPath.length - 2).join("/") +
            "/backend";
        const frontendPath =
            this.baseDirPath.slice(0, this.baseDirPath.length - 2).join("/") +
            "/frontend";
        this.webServer = new WebServer(
            this.stage,
            this.config.get("http_port"),
            this.config.get("env"),
            backendPath,
            frontendPath
        );
        // WebSocket server
        this.webSocketServer = new WebSocketServer(
            this.stage,
            this.config.get("ws_port"),
            new JwtConfig(this.config.get("jwt"))
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
}

// Entry point
Main.main(...process.argv);
