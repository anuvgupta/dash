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
    resource_desync_timeout: 4,
    resource_disconnect_timeout: 8,
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
                if (delta >= m.main.resource_disconnect_timeout * 1000) {
                    modify_disconnect_resource_ids.push(resources[r]._id);
                    m.ws.update_resource_status(resources[r]._id.toString(), "offline", resources[r].status_time, resources[r].user_id);
                } else if (delta >= m.main.resource_desync_timeout * 1000) {
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
    gen_nginx_proxy_config: (proxy_settings, application, host_resource, domains) => {
        if (!proxy_settings) return null;
        // parse port(s)
        var port = application.port ? application.port.trim() : '';
        if (port == '') return null;
        port = port.split('/');
        if (port.length <= 0) return null;
        // create server name list
        var server_names = '';
        for (var d in domains) {
            var domain_name = domains[d].domain;
            server_names += domain_name + ' ';
            if (proxy_settings.www === true && (domain_name.match(/\./g) || []).length == 1)
                server_names += `www.${domain_name} `;
        }
        server_names = server_names.trim();
        if (server_names == '') return null;
        // generate nginx config object
        var proxy_config_obj = {
            'server': [{
                'listen': ["80", "[::]:80"],
                'server_name': `${server_names}`,
                'location /': {
                    'proxy_pass': `http://127.0.0.1:${port[0]}`,
                    'proxy_set_header': [
                        "Host $host",
                        "X-Real-IP $remote_addr",
                        "X-Forwarded-For $proxy_add_x_forwarded_for",
                        "X-Forwarded-Proto $scheme"
                    ],
                }
            }]
        };
        if (proxy_settings.htaccess_deny === true) {
            proxy_config_obj['server'][0]['location ~ /\\.ht'] = {
                'deny': "all"
            };
        }
        if (proxy_settings.ws_enable === true) {
            var ws_endpoint = "";
            if (proxy_settings.ws_enable_path.trim() != '') {
                ws_endpoint = proxy_settings.ws_enable_path.trim();
                proxy_config_obj['server'][0][`location /${ws_endpoint}`] = JSON.parse(JSON.stringify(proxy_config_obj['server'][0]['location /']));
            }
            proxy_config_obj['server'][0][`location /${ws_endpoint}`] = Object.assign(proxy_config_obj['server'][0][`location /${ws_endpoint}`], {
                'proxy_pass': `http://127.0.0.1:${port.length >= 2 && ws_endpoint != '' ? port[1] : port[0]}`,
                'proxy_http_version': "1.1",
                'proxy_set_header': ['Upgrade $http_upgrade', 'Connection $connection_upgrade'].concat(proxy_config_obj['server'][0][`location /${ws_endpoint}`]['proxy_set_header']),
                'proxy_connect_timeout': "7d",
                'proxy_send_timeout': "7d",
                'proxy_read_timeout': "7d"
            });
        }
        if (proxy_settings.https_enable === true) {
            // TODO: duplicate regular config, modify listening port, add ssl cert
        }
        if (proxy_settings.https_force === true) {
            proxy_config_obj['server']['location /']['return'] = "301 https://$host$request_uri";
        }
        log(proxy_config_obj);
        return proxy_config_obj;
        return null;
    },
    convert_nginx_proxy_config_obj: (proxy_config_obj) => {
        if (!proxy_config_obj) return null;
        var proxy_config_text = '';
        proxy_config_text += 'server {';
        proxy_config_text += "}";
        return (proxy_config_text != '' ? proxy_config_text : null);
    }
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
