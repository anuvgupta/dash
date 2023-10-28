import * as Express from "express";

import Log from "@dash/utils/Log";
import WebServer from "@dash/server/WebServer";

/**
 * Web route handler
 */
export default abstract class WebActivity {
    /**
     * WebActivity fields
     */
    protected endpoint: string;
    protected method: string;
    constructor(endpoint: string, method: string) {
        this.endpoint = endpoint;
        this.method = method;
    }

    /**
     * Web event handler method
     */
    abstract handleRequest(req: Express.Request, res: Express.Response): void;

    /**
     * Endpoint accessor
     */
    getEndpoint() {
        return this.endpoint;
    }

    /**
     * Method accessor
     */
    getMethod() {
        return this.method;
    }

    /**
     * Return view convenience method
     */
    protected returnView(
        req: Express.Request,
        res: Express.Response,
        view: string,
        data: any
    ): void {
        return WebServer.returnView(req, res, view, data);
    }

    /**
     * Return data convenience method
     */
    protected returnData(
        req: Express.Request,
        res: Express.Response,
        data: any
    ): void {
        return WebServer.returnData(req, res, data);
    }

    /**
     * Return error convenience method
     */
    protected returnError(
        req: Express.Request,
        res: Express.Response,
        code: number,
        msg: string
    ): void {
        return WebServer.returnError(req, res, code, msg);
    }
}
