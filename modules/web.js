/* MODULE – WEB SERVER */
// http web server

/* IMPORTS */
const http = require("http");
const express = require("express");
const jwt = require("jsonwebtoken");
const express_jwt = require("express-jwt");
const body_parser = require("body-parser");

/* INFRA */
var m = null;
var log = null;
var err = null;



/* MODULE */

var http_server = null;
var express_api = null;
var http_port = null;

function web_return_data(req, res, data) {
    res.status(200);
    res.setHeader('content-type', 'application/json');
    res.send(JSON.stringify(data, null, 2));
    return null;
}

function web_return_error(req, res, code, msg) {
    res.status(code);
    res.setHeader('content-type', 'application/json');
    res.send(JSON.stringify({
        status: code,
        message: msg
    }, null, 2));
}

var init = _ => {
    express_api.get("/api/projects", (req, res) => {
        m.db.project_summary((success, result) => {
            if (success && result) {
                for (var p in result.projects) {
                    delete result.projects[p]['_id'];
                    delete result.projects[p]['public'];
                    delete result.projects[p]['applications'];
                    delete result.projects[p]['domains'];
                }
                for (var a in result.applications) {
                    result.applications[a] = {
                        slug: result.applications[a].slug,
                        name: result.applications[a].name,
                        description: result.applications[a].description,
                        status: result.applications[a].status,
                        status_time: result.applications[a].status_time,
                        ts_created: result.applications[a].ts_created,
                        ts_updated: result.applications[a].ts_updated
                    };
                }
                web_return_data(req, res, {
                    projects: result.projects,
                    applications: result.applications
                });
            } else web_return_error(req, res, 500, "server error");
        });
    });
};
var api = {
    get_cloud_config: _ => {
        const config_dup = JSON.parse(JSON.stringify(global.config.env));
        return config_dup;
    },
    export_cloud_config: _ => {
        const encoded_data = Buffer.from(JSON.stringify(api.get_cloud_config())).toString('base64');
        return `JSON.parse(atob("${encoded_data}"))`;
    }
};



/* EXPORT */
module.exports = {
    init: id => {
        module.exports.id = id;
        m = global.m;
        log = m.utils.logger(id, false);
        err = m.utils.logger(id, true);
        log("initializing");
        http_port = global.http_port;
        express_api = express();
        express_api.set('view engine', 'ejs');
        http_server = http.Server(express_api);
        express_api.use(body_parser.json());
        express_api.use(body_parser.urlencoded({ extended: true }));
        express_api.use((req, res, next) => {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
            next();
        });
        express_api.use(express.static("static"));
        express_api.get("/", (req, res) => {
            // res.sendFile(__dirname + "/static/index.html");
            res.render('app', {
                export_cloud_config: api.export_cloud_config
            });
        });
        module.exports.api.exit = resolve => {
            log("exit");
            http_server.close(_ => {
                if (resolve) resolve();
            });
        };
        init();
        // open server
        express_api.listen(http_port, _ => {
            log("listening on", http_port);
        });
    },
    api: api
};

