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
var indent_marker = '\t';
var get_indents = (n = 1) => {
    var indents_text = '';
    for (var i = 0; i < n; i++)
        indents_text += indent_marker;
    return indents_text;
};
// recursive reverse-parser (generates nginx config string from object/tree representation)
var reverse_parse_nginx_config_obj = (proxy_config_obj, proxy_config_key = null, indents = -1) => {
    var eol = '\n';
    var ret_text = '';
    var typeof_type = typeof proxy_config_obj;
    if (typeof_type === 'object') {
        if (Array.isArray(proxy_config_obj)) {
            ret_text = get_indents(indents) + '* ERROR * parser encountered unexpected array: [' + proxy_config_obj.join(', ') + ']' + eol;
        } else { // object
            if (proxy_config_key) ret_text += `${get_indents(indents)}${proxy_config_key} {` + eol;
            var keys = (proxy_config_obj.hasOwnProperty('__keys') ? proxy_config_obj.__keys : Object.keys(proxy_config_obj));
            for (var k in keys) {
                if (Array.isArray(proxy_config_obj[keys[k]])) { // array
                    for (var i in proxy_config_obj[keys[k]])
                        ret_text += reverse_parse_nginx_config_obj(proxy_config_obj[keys[k]][i], keys[k], indents + 1);
                } else ret_text += reverse_parse_nginx_config_obj(proxy_config_obj[keys[k]], keys[k], indents + 1);
            }
            if (proxy_config_key) ret_text += `${get_indents(indents)}}` + eol;
        }
    } else if (typeof_type === 'string' || typeof_type === 'number' || typeof_type === 'boolean') {
        // string, number, boolean
        ret_text = `${get_indents(indents)}${proxy_config_key ? proxy_config_key + ' ' : ''}${proxy_config_obj};` + eol;
    }
    return ret_text;
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
    gen_nginx_proxy_config_error: '',
    gen_nginx_proxy_config: (proxy_settings, application, host_resource, domains) => {
        if (!proxy_settings) {
            api.gen_nginx_proxy_config_error = 'No proxy settings';
            return null;
        }
        // parse port(s)
        var port = application.port ? application.port.trim() : '';
        if (port == '') {
            api.gen_nginx_proxy_config_error = 'No app port';
            return null;
        }
        port = port.split('/');
        if (port.length <= 0) {
            api.gen_nginx_proxy_config_error = 'Invalid app port';
            return null;
        }
        // create server name list
        var server_names = '';
        var server_names_list = [];
        for (var ad in application.domains) {
            var d_id = application.domains[ad].split('.')[0];
            var d_sub = application.domains[ad].includes('.') ? application.domains[ad].slice(application.domains[ad].indexOf('.') + 1) : '';
            for (var d in domains) {
                if (d_id == domains[d]._id.toString()) {
                    var domain_name = domains[d].domain;
                    if (d_sub == '') {
                        server_names += domain_name + ' ';
                        server_names_list.push(domain_name);
                        if (proxy_settings.www === true && (domain_name.match(/\./g) || []).length == 1) {
                            var www_alias = `www.${domain_name}`;
                            server_names += `${www_alias} `;
                            server_names_list.push(www_alias);
                        }
                    } else {
                        var sub_name = `${d_sub}.${domain_name}`;
                        server_names += `${sub_name} `;
                        server_names_list.push(sub_name);
                    }
                }
            }
        }
        server_names = server_names.trim();
        if (server_names == '') {
            api.gen_nginx_proxy_config_error = 'No app domains';
            return null;
        }
        // generate nginx config object
        var proxy_config_obj = {
            __keys: ['server'],
            'server': [{
                __keys: ['listen', 'server_name', 'location /'],
                'listen': ["80", "[::]:80"],
                'server_name': `${server_names}`,
                'location /': {
                    __keys: ['proxy_pass', 'proxy_set_header'],
                    'proxy_pass': `http://127.0.0.1:${port[0]}`,
                    'proxy_set_header': [
                        "Host $host",
                        "X-Real-IP $remote_addr",
                        "X-Forwarded-For $proxy_add_x_forwarded_for",
                        "X-Forwarded-Proto $scheme"
                    ],
                },
            }]
        };
        var main_location_key = 'location /';
        if (proxy_settings.hasOwnProperty('path') && proxy_settings.path != '') {
            main_location_key = `location /${(`${proxy_settings.path}`).trim()}`;
            proxy_config_obj['server'][0][main_location_key] = JSON.parse(JSON.stringify(proxy_config_obj['server'][0]['location /']));
            delete proxy_config_obj['server'][0]['location /'];
            proxy_config_obj['server'][0].__keys = ['listen', 'server_name', main_location_key];
        }
        if (proxy_settings.ws_enable === true) {
            var ws_endpoint = "";
            var ws_endpoint_key = `location /${ws_endpoint}`;
            if (proxy_settings.ws_enable_path.trim() != '') {
                ws_endpoint = proxy_settings.ws_enable_path.trim();
                ws_endpoint_key = `location /${ws_endpoint}`;
                proxy_config_obj['server'][0][ws_endpoint_key] = JSON.parse(JSON.stringify(proxy_config_obj['server'][0][main_location_key]));
            }
            proxy_config_obj['server'][0][ws_endpoint_key] = Object.assign(proxy_config_obj['server'][0][ws_endpoint_key], {
                'proxy_pass': `http://127.0.0.1:${port.length >= 2 && ws_endpoint != '' ? port[1] : port[0]}`,
                'proxy_http_version': "1.1",
                'proxy_set_header': ['Upgrade $http_upgrade', 'Connection $connection_upgrade'].concat(proxy_config_obj['server'][0][ws_endpoint_key]['proxy_set_header']),
                'proxy_connect_timeout': "7d",
                'proxy_send_timeout': "7d",
                'proxy_read_timeout': "7d"
            });
            proxy_config_obj['server'][0][ws_endpoint_key].__keys.splice(1, 0, 'proxy_http_version');
            proxy_config_obj['server'][0][ws_endpoint_key].__keys.push('proxy_connect_timeout', 'proxy_send_timeout', 'proxy_read_timeout');
            if (!proxy_config_obj['server'][0].__keys.includes(ws_endpoint_key))
                proxy_config_obj['server'][0].__keys.push(ws_endpoint_key);
            var upgrade_key = 'map $http_upgrade $connection_upgrade';
            proxy_config_obj[upgrade_key] = { 'default': "upgrade", "''": "close" };
            proxy_config_obj.__keys.unshift(upgrade_key);
        }
        if (proxy_settings.htaccess_deny === true) {
            var htdeny_key = 'location ~ /\\.ht';
            proxy_config_obj['server'][0][htdeny_key] = { 'deny': "all" };
            proxy_config_obj['server'][0].__keys.push(htdeny_key);
        }
        if (proxy_settings.https_enable === true) {
            var cert_sub_map = {};
            var cert_key_map = {}
            // console.log(domains);
            for (var d in domains) {
                for (var c in domains[d].certificates) {
                    var cert = domains[d].certificates[c];
                    if (cert.host === host_resource.slug) {
                        var cert_path = cert.cert_path;
                        if (!cert_sub_map.hasOwnProperty(cert_path))
                            cert_sub_map[cert_path] = [];
                        cert_sub_map[cert_path].push.apply(cert_sub_map[cert_path], cert.subdomains);
                        cert_key_map[cert_path] = cert.cert_key_path;
                    }
                }
            }
            // log(cert_sub_map);
            for (var cert_path in cert_sub_map) {
                var subdomains_matched = [];
                // console.log('match between', cert_sub_map[cert_path], 'and', server_names_list);
                for (var c_n in cert_sub_map[cert_path]) {
                    var cert_name = cert_sub_map[cert_path][c_n];
                    for (var s_n in server_names_list) {
                        var server_name = server_names_list[s_n];
                        // console.log(cert_name, server_name);
                        if (cert_name === server_name || (cert_name[0] == '*' && cert_name[1] == '.' && cert_name.substring(cert_name.indexOf('.') + 1) == server_name.substring(server_name.indexOf('.') + 1)))
                            subdomains_matched.push(server_name);
                    }
                }
                // console.log(cert_path, subdomains_matched);
                if (subdomains_matched.length <= 0) continue;
                var secure_server_obj = JSON.parse(JSON.stringify(proxy_config_obj['server'][0]));
                secure_server_obj.__keys.splice(2, 0, 'ssl', 'ssl_certificate', 'ssl_certificate_key');
                secure_server_obj = Object.assign(secure_server_obj, {
                    'server_name': subdomains_matched.join(' '),
                    'listen': ["443 ssl", "[::]:443 ssl"],
                    'ssl_certificate': `${cert_path}`,
                    'ssl_certificate_key': `${cert_key_map[cert_path]}`,
                    'ssl': "on",
                });
                proxy_config_obj['server'].push(secure_server_obj);
            }
        }
        if (proxy_settings.https_force === true) {
            proxy_config_obj['server'][0][main_location_key]['return'] = "301 https://$host$request_uri";
            proxy_config_obj['server'][0][main_location_key].__keys.push('return');
        }
        // log(proxy_config_obj);
        return proxy_config_obj;
        // return null;
    },
    convert_nginx_proxy_config_obj: (proxy_config_obj) => {
        if (!proxy_config_obj) return null;
        var proxy_config_text = '';
        proxy_config_text = reverse_parse_nginx_config_obj(proxy_config_obj);
        return (proxy_config_text != '' ? proxy_config_text : null);
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
