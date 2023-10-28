import * as Express from "express";

import Log from "@dash/utils/Log";
import WebActivity from "@dash/server/activity/WebActivity";

/**
 * Get projects list
 */
@Log.Inject
export default class GetProjects extends WebActivity {
    /**
     * GetProjects constructor
     */
    log: Log;
    constructor() {
        super("/api/projects", "get");
    }

    /**
     * Event handler
     */
    handleRequest(req: Express.Request, res: Express.Response): void {
        this.returnData(req, res, {
            hello: "bye",
        });
        this.log.info(this.endpoint, this.method);
        // TODO: implement this API
    }
}
