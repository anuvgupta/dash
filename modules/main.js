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
var main = _ => { };
var api = {};



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
