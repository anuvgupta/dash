import * as Http from "http";
import * as Events from "events";
import * as Express from "express";
import * as Jwt from "jsonwebtoken";
import * as ExpressJwt from "express-jwt";

import Log from "@dash/utils/Log";
import WebActivity from "@dash/server/activity/WebActivity";
import DatabaseAccessor from "@dash/database/DatabaseAccessor";

/**
 * Web event handler
 */
type WebEventHandler = (req: Express.Request, res: Express.Response) => void;

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
    envConfig: object;
    server: Http.Server;
    database: DatabaseAccessor;
    log: Log;
    constructor(
        stage: string,
        port: number,
        envConfig: object,
        backendPath: string,
        frontendPath: string,
        database: DatabaseAccessor
    ) {
        this.stage = stage;
        this.port = port;
        this.api = Express.default();
        this.backendPath = backendPath;
        this.frontendPath = frontendPath;
        this.envConfig = envConfig;
        this.database = database;
        this.server = null;
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
        this.api.get("/", this.homeHandler.bind(this));
        // open server
        this.server = this.api.listen(this.port, () => {
            this.log.info("Listening on", this.port);
            callback();
        });
        return this;
    }

    route(activities: WebActivity[]): void {
        for (const activity of activities) {
            activity.setDatabaseAcesssor(this.database);
            this.bind(
                activity.getMethod(),
                activity.getEndpoint(),
                (req: Express.Request, res: Express.Response) => {
                    activity.handleRequest(req, res);
                }
            );
        }
    }

    private bind(method: string, path: string, handler: WebEventHandler): void {
        switch (method) {
            case "get":
                this.api.get(path, handler);
                break;
            case "post":
                this.api.post(path, handler);
                break;
            default:
                break;
        }
    }

    private homeHandler(req: Express.Request, res: Express.Response): void {
        WebServer.returnView(req, res, "app", {
            envConfig: this.exportEnvConfig(),
        });
    }

    private getEnvConfig(): object {
        const envOverrides = { production: this.stage === "prod" };
        const envDuplicate = JSON.parse(JSON.stringify(this.envConfig));
        return Object.assign(envDuplicate, envOverrides);
    }

    private exportEnvConfig(): string {
        const encodedData = Buffer.from(
            JSON.stringify(this.getEnvConfig())
        ).toString("base64");
        return `JSON.parse(atob("${encodedData}"))`;
    }

    static returnView(
        req: Express.Request,
        res: Express.Response,
        view: string,
        data: any
    ): void {
        res.render(view, data);
    }

    static returnData(
        req: Express.Request,
        res: Express.Response,
        data: any
    ): void {
        res.status(200);
        res.setHeader("content-type", "application/json");
        res.send(JSON.stringify(data, null, 2));
    }

    static returnError(
        req: Express.Request,
        res: Express.Response,
        code: number,
        msg: string
    ): void {
        res.status(code);
        res.setHeader("content-type", "application/json");
        res.send(
            JSON.stringify(
                {
                    status: code,
                    message: msg,
                },
                null,
                2
            )
        );
    }
}
