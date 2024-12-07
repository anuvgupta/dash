import * as Express from "express";

import Log from "@dash/utils/Log";
import Table from "@dash/model/table/Table";
import WebActivity from "@dash/server/activity/WebActivity";

/**
 * Route configuration
 */
const METHOD: string = "get";
const ENDPOINT: string = "/api/projects";

/**
 * Get projects list route handler
 */
@Log.Inject
export default class GetProjects extends WebActivity {
    /**
     * GetProjects constructor
     */
    log: Log;
    constructor() {
        super(ENDPOINT, METHOD);
    }

    /**
     * Event handler
     */
    handleRequest(req: Express.Request, res: Express.Response): void {
        // this.returnData(req, res, {
        //     hello: "bye",
        // });
        // this.log.info(this.endpoint, this.method);
        // TODO: implement this API
        this.database.table(Table.PROJECTS);
    }
}
