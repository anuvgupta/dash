/* MODULE – MAIN */
// main application logic

/* IMPORTS */
const fs = require("fs");
const path = require("path");
const utils = require("./utils");

/* INFRA */
var m = null;
var log = null;
var err = null;



/* MODULE */
var init = _ => { };
var main = _ => {
    m.utils.delay(_ => {
        log('starting resource monitor');
        m.main.resource_monitor();
    }, 1000);
};
var api = {
    device_desync_timeout: 4,
    device_disconnect_timeout: 8,
    resource_monitor_interval: 0.5,
    resource_monitor: _ => {
        m.ws.broadcast_resource_hb();
        m.db.get_online_resources((success, resources) => {
            // console.log(resources);
            if (success === false || success === null || resources === null || resources === false) return;
            var modify_disconnect_resource_ids = [];
            var modify_desync_resource_ids = [];
            for (var r in resources) {
                var delta = (new Date()).getTime() - resources[r].status_time;
                // console.log('time between heartbeats', delta);
                if (delta >= m.main.device_disconnect_timeout * 1000) {
                    modify_disconnect_resource_ids.push(resources[r]._id);
                    m.ws.update_resource_status(resources[r]._id.toString(), "offline", resources[r].status_time, resources[r].user_id);
                } else if (delta >= m.main.device_desync_timeout * 1000) {
                    if (resources[r].status != "desync") {
                        modify_desync_resource_ids.push(resources[r]._id);
                        m.ws.update_resource_status(resources[r]._id.toString(), "desync", resources[r].status_time, resources[r].user_id);
                    }
                }
            }
            m.db.update_resource_status(modify_desync_resource_ids, "desync");
            m.db.update_resource_status(modify_disconnect_resource_ids, "offline");
        });
        m.utils.delay(_ => {
            m.main.resource_monitor();
        }, m.main.resource_monitor_interval * 1000);
    },
};



/* EXPORT */
module.exports = {
    id: null,
    init: id => {
        module.exports.id = id;
        m = global.m;
        log = m.utils.logger(id, false);
        err = m.utils.logger(id, true);
        log("initializing");
        module.exports.api.exit = (e = 0) => {
            m.main.unload(_ => {
                log('exit');
                process.exit(e);
            });
        };
        module.exports.api.unload = resolve => {
            log("unload");
            m.ws.exit(_ => {
                m.web.exit(_ => {
                    if (resolve) resolve();
                });
            });
        };
        init();
    },
    main: _ => {
        log("ready");
        main();
    },
    api: api
};
