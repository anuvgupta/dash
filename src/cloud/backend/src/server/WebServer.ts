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
    server: Http.Server;
    log: Log;
    constructor(
        stage: string,
        port: number,
        cloudConfig: object,
        backendPath: string,
        frontendPath: string
    ) {
        this.stage = stage;
        this.port = port;
        this.api = Express.default();
        this.backendPath = backendPath;
        this.frontendPath = frontendPath;
        this.cloudConfig = cloudConfig;
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

    bind(
        method: string,
        path: string,
        handler: (req: Express.Request, res: Express.Response) => void
    ): void {
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

    route(): void {
        this.bind(
            "get",
            "/api/projects",
            (req: Express.Request, res: Express.Response) => {
                this.returnData(req, res, {
                    hello: "bye",
                });
                // TODO: finish this route
            }
        );
    }

    private homeHandler(req: Express.Request, res: Express.Response): void {
        this.returnView(req, res, "app", {
            cloudConfig: this.exportCloudConfig(),
        });
    }

    private returnView(
        req: Express.Request,
        res: Express.Response,
        view: string,
        data: any
    ): void {
        res.render(view, data);
    }

    private returnData(
        req: Express.Request,
        res: Express.Response,
        data: any
    ): void {
        res.status(200);
        res.setHeader("content-type", "application/json");
        res.send(JSON.stringify(data, null, 2));
    }

    private returnError(
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
}
