import * as Http from "http";
import * as Events from "events";
import * as Express from "express";
import * as Jwt from "jsonwebtoken";
import * as ExpressJwt from "express-jwt";

import Log from "../utils/Log";

/**
 * Web server
 */
@Log.Inject
export default class WebServer {
    /**
     * WebServer constructor
     */
    api: any;
    port: number;
    stage: string;
    backendPath: string;
    frontendPath: string;
    cloudConfig: object;
    // server: Http.Server;
    log: Log;
    constructor(
        port: number,
        stage: string,
        cloudConfig: object,
        backendPath: string,
        frontendPath: string
    ) {
        this.port = port;
        this.stage = stage;
        this.api = Express.default();
        this.backendPath = backendPath;
        this.frontendPath = frontendPath;
        this.cloudConfig = cloudConfig;
        // this.server = Http.Server(this.api);
    }

    load(callback: () => void): WebServer {
        this.api.set("view engine", "ejs");
        this.api.set("views", `${this.backendPath}/assets/views`);
        this.api.use(Express.json());
        this.api.use(Express.urlencoded({ extended: true }));
        this.api.use(
            (req: Express.Request, res: Express.Response, next: () => void) => {
                res.header("Access-Control-Allow-Origin", "*");
                res.header(
                    "Access-Control-Allow-Headers",
                    "Origin, X-Requested-With, Content-Type, Accept"
                );
                next();
            }
        );
        this.api.use(Express.static(`${this.frontendPath}/assets`));
        this.api.use(Express.static(`${this.frontendPath}/src`));
        // open server
        this.api.listen(this.port, () => {
            this.log.info("Listening on", this.port);
            callback();
        });
        return this;
    }

    route(): void {
        this.api.get("/", this.homeHandler.bind(this));
    }

    private getCloudConfig(): object {
        const envOverrides = { production: this.stage === "prod" };
        const envDuplicate = JSON.parse(JSON.stringify(this.cloudConfig));
        return Object.assign(envDuplicate, envOverrides);
    }

    private exportCloudConfig(): string {
        const encodedData = Buffer.from(
            JSON.stringify(this.getCloudConfig())
        ).toString("base64");
        return `JSON.parse(atob("${encodedData}"))`;
    }

    private homeHandler(req: Express.Request, res: Express.Response): void {
        res.render("app", { cloudConfig: this.exportCloudConfig() });
    }
}
