/* MODULE – WEBSOCKET SERVER */
// http/ws websocket server

/* IMPORTS */
const ws = require("ws");
const jwt = require("jsonwebtoken");

/* INFRA */
var m = null;
var log = null;
var err = null;



/* MODULE */
var ws_server = {
    port: null,
    socket: null,
    online: false,
    clients: {}, // client sockets
    events: {}, // event handlers
    // encode event+data to JSON
    encode_msg: (e, d) => {
        return JSON.stringify({
            event: e,
            data: d
        });
    },
    // decode event+data from JSON
    decode_msg: (m) => {
        try {
            m = JSON.parse(m);
        } catch (e) {
            log("invalid json msg", e);
            m = null;
        }
        return m;
    },
    // bind handler to client event
    bind: (event, handler, auth_req = true) => {
        ws_server.events[event] = (client, req, auth) => {
            if (!auth_req || (client.auth && (ws_server.verify_token(auth) || client.type == 'daemon')))
                handler(client, req, auth);
        };
    },
    // verify JWT token
    verify_token: (token) => {
        if (!token || token == null)
            return false;
        var result = null;
        try {
            result = jwt.verify(token, global.config.jwt.secret);
        } catch (e) {
            console.log(`[web] error verifying token "${token}":`, (e.message ? e.message : e));
            result = false;
        }
        return result ? true : false;
    },
    // mark client as authenticated
    authenticate_client: (client, auth = true) => {
        client.auth = auth;
        // jwt.sign({ user_id: `${String(client.o_id)}` }, `${String(client.o_id)}`);
        return jwt.sign(
            { client_id: (`${client.id}`).trim() },
            global.config.jwt.secret,
            { algorithm: global.config.jwt.algo, expiresIn: global.config.jwt.expiration }
        );
    },
    // assign client to specific type/group
    group_client: (client, type = "app") => {
        client.type = type;
    },
    // get client object id
    get_client_object(client) {
        return client.o_id;
    },
    // set client object id
    set_client_object(client, o_id) {
        client.o_id = o_id;
    },
    // send data to specific client
    send_to_client: (event, data, client, auth_req = true) => {
        if (!auth_req || client.auth)
            client.socket.send(ws_server.encode_msg(event, data));
    },
    // send data to all clients in group
    send_to_group: (event, data, group, auth_req = true) => {
        for (var c_id in ws_server.clients) {
            if (
                ws_server.clients.hasOwnProperty(c_id) &&
                ws_server.clients[c_id] !== null &&
                (!auth_req || ws_server.clients[c_id].auth) &&
                ws_server.clients[c_id].type == group
            ) {
                ws_server.clients[c_id].socket.send(ws_server.encode_msg(event, data));
            }
        }
    },
    // send data to specific client
    trigger_for_client: (event, data, client, auth_req = true) => {
        if (!auth_req || client.auth)
            ws_server.events[event](client, data);
    },
    // return error for event
    return_event_error: (event, error_msg, client, auth_req = true) => {
        ws_server.send_to_client(`${event}_res`, {
            success: false, message: (`${error_msg}`)
        }, client, auth_req);
        return false;
    },
    // return data for event
    return_event_data: (event, data, client, auth_req = true) => {
        ws_server.send_to_client(`${event}_res`, {
            success: true, data: data
        }, client, auth_req);
        return true;
    },
    // initialize server
    init: _ => {
        // attach server socket events
        ws_server.socket.on("connection", (client_socket) => {
            // create client object on new connection
            var client = {
                socket: client_socket,
                id: "_c_" + m.utils.rand_id(),
                o_id: null,
                auth: false,
                type: "app"
            };
            log(`client ${client.id} – connected`);
            // client socket event handlers
            client.socket.addEventListener("message", (m) => {
                var d = ws_server.decode_msg(m.data); // parse message
                if (d != null && d.hasOwnProperty('event')) {
                    if (!d.hasOwnProperty('data') || !d.data) d.data = null;
                    if (!d.hasOwnProperty('auth') || !d.auth) d.auth = null;
                    // console.log('    ', d.event, d.data);
                    if (d.event != 'hb_daemon' || global.config.ws_heartbeat_log === true)
                        log(`client ${client.id} – message: ${d.event}`, d.data);
                    // handle various events
                    if (ws_server.events.hasOwnProperty(d.event))
                        ws_server.events[d.event](client, d.data, d.auth);
                    else err("unknown event", d.event);
                } else err(`client ${client.id} – invalid message: `, m.data);
            });
            client.socket.addEventListener("error", (e) => {
                err(`client ${client.id} – error`, e);
            });
            client.socket.addEventListener("close", (c, r) => {
                log(`client ${client.id} – disconnected`);
                delete ws_server.clients[client.id]; // remove client object on disconnect
            });
            // add client object to client object list
            ws_server.clients[client.id] = client;
        });
        ws_server.socket.on("listening", _ => {
            log("listening on", ws_server.port);
            ws_server.online = true;
        });
        ws_server.socket.on("error", (e) => {
            err("server error", e);
            ws_server.online = false;
        });
        ws_server.socket.on("close", _ => {
            log("server closed");
            ws_server.online = false;
        });
    },
    close: resolve => {
        ws_server.socket.close(_ => {
            if (resolve) resolve();
        });
    }
};

var init = _ => {

    // auth
    ws_server.bind("auth", (client, req, token) => {
        if (token && ws_server.verify_token(token)) {
            client.auth = true;
            ws_server.return_event_data("auth", {}, client);
        } else {
            client.auth = false;
            ws_server.return_event_error("auth", "invalid token", client, false);
        }
    }, false);
    ws_server.bind("sign_in", (client, req) => {
        var success = false;
        var jwt_token = null;
        if (req.password && req.password.trim() == global.config.secret.trim()) {
            success = true;
            jwt_token = ws_server.authenticate_client(client);
        }
        ws_server.send_to_client("sign_in_res", {
            success: success,
            message: (success ? null : "incorrect password"),
            data: { token: jwt_token }
        }, client, false);
    }, false);

    // projects
    ws_server.bind("new_project", (client, req) => {
        var slug = req.slug ? (`${req.slug}`).trim() : '';
        var name = req.name ? (`${req.name}`).trim() : '';
        var repo = req.repo ? (`${req.repo}`).trim() : '';
        var desc = req.desc ? (`${req.desc}`).trim() : '';
        if (slug != '' && name != '') {
            m.db.get_project(null, slug, (success1, result1) => {
                if (success1 === false) return ws_server.return_event_error("new_project", "database error", client);
                if (result1 != null && slug == result1.slug)
                    return ws_server.return_event_error("new_project", "identifier already taken", client);
                m.db.create_project(slug, name, repo, desc, false, (success2, result2) => {
                    if (success2 === false) return ws_server.return_event_error("new_project", "database error", client);
                    return ws_server.return_event_data("new_project", { id: result2, slug: slug }, client);
                });
            });
        }
    });
    ws_server.bind("get_projects", (client, req) => {
        m.db.get_projects((success1, result1) => {
            if (success1 === false || result1 === null)
                return ws_server.return_event_error("get_projects", "database error", client);
            return ws_server.return_event_data("get_projects", { list: result1 }, client);
        });
    });
    ws_server.bind("update_project", (client, req) => {
        var id = req.id ? (`${req.id}`).trim() : '';
        var update = req.update ? JSON.parse(JSON.stringify(req.update)) : null;
        if (id != '' && update != null && Object.keys(update).length > 0) {
            m.db.get_project(id, null, (success1, result1) => {
                if (success1 === false) return ws_server.return_event_error("update_project", "database error", client);
                if (result1 == null)
                    return ws_server.return_event_error("update_project", "project not found", client);
                m.db.update_project(id, update, (success2, result2) => {
                    if (success2 === false) return ws_server.return_event_error("update_project", "database error", client);
                    return ws_server.return_event_data("update_project", { id: id, project: result2 }, client);
                });
            });
        }
    });
    ws_server.bind("delete_project", (client, req) => {
        var id = req.id ? (`${req.id}`).trim() : '';
        if (id != '') {
            m.db.get_project(id, null, (success1, result1) => {
                if (success1 === false) return ws_server.return_event_error("delete_project", "database error", client);
                if (result1 == null)
                    return ws_server.return_event_error("delete_project", "project not found", client);
                m.db.delete_project(id, (success2, result2) => {
                    if (success2 === false) return ws_server.return_event_error("delete_project", "database error", client);
                    return ws_server.return_event_data("delete_project", { id: id }, client);
                });
            });
        }
    });
    ws_server.bind("star_project", (client, req) => {
        var id = req.id ? (`${req.id}`).trim() : '';
        if (id != '') {
            m.db.get_project(id, null, (success1, result1) => {
                if (success1 === false) return ws_server.return_event_error("star_project", "database error", client);
                if (result1 == null)
                    return ws_server.return_event_error("star_project", "project not found", client);
                m.db.toggle_star_project(id, (success2, result2) => {
                    if (success2 === false) return ws_server.return_event_error("star_project", "database error", client);
                    return ws_server.return_event_data("star_project", { id: id, starred: result2 }, client);
                });
            });
        }
    });

    // resources
    ws_server.bind("new_resource", (client, req) => {
        var slug = req.slug ? (`${req.slug}`).trim() : '';
        var name = req.name ? (`${req.name}`).trim() : '';
        var link = req.link ? (`${req.link}`).trim() : '';
        var ip = req.ip ? (`${req.ip}`).trim() : '';
        if (slug != '' && name != '') {
            m.db.get_resource(null, slug, (success1, result1) => {
                if (success1 === false) return ws_server.return_event_error("new_resource", "database error", client);
                if (result1 != null && slug == result1.slug)
                    return ws_server.return_event_error("new_resource", "identifier already taken", client);
                m.db.create_resource(slug, name, link, ip, (success2, result2) => {
                    if (success2 === false) return ws_server.return_event_error("new_resource", "database error", client);
                    return ws_server.return_event_data("new_resource", { id: result2, slug: slug }, client);
                });
            });
        }
    });
    ws_server.bind("get_resources", (client, req) => {
        m.db.get_resources((success1, result1) => {
            if (success1 === false || result1 === null)
                return ws_server.return_event_error("get_resources", "database error", client);
            return ws_server.return_event_data("get_resources", { list: result1 }, client);
        });
    });
    ws_server.bind("update_resource", (client, req) => {
        var id = req.id ? (`${req.id}`).trim() : '';
        var update = req.update ? JSON.parse(JSON.stringify(req.update)) : null;
        if (id != '' && update != null && Object.keys(update).length > 0) {
            m.db.get_resource(id, null, (success1, result1) => {
                if (success1 === false) return ws_server.return_event_error("update_resource", "database error", client);
                if (result1 == null)
                    return ws_server.return_event_error("update_resource", "resource not found", client);
                m.db.update_resource(id, update, (success2, result2) => {
                    if (success2 === false) return ws_server.return_event_error("update_resource", "database error", client);
                    return ws_server.return_event_data("update_resource", { id: id, resource: result2 }, client);
                });
            });
        }
    });
    ws_server.bind("delete_resource", (client, req) => {
        var id = req.id ? (`${req.id}`).trim() : '';
        if (id != '') {
            m.db.get_resource(id, null, (success1, result1) => {
                if (success1 === false) return ws_server.return_event_error("delete_resource", "database error", client);
                if (result1 == null)
                    return ws_server.return_event_error("delete_resource", "resource not found", client);
                m.db.delete_resource(id, null, (success2, result2) => {
                    if (success2 === false) return ws_server.return_event_error("delete_resource", "database error", client);
                    return ws_server.return_event_data("delete_resource", { id: id }, client);
                });
            });
        }
    });

    // applications
    ws_server.bind("new_application", (client, req) => {
        var slug = req.slug ? (`${req.slug}`).trim() : '';
        var name = req.name ? (`${req.name}`).trim() : '';
        var description = req.description ? (`${req.description}`).trim() : '';
        if (slug != '' && name != '') {
            m.db.get_application(null, slug, (success1, result1) => {
                if (success1 === false) return ws_server.return_event_error("new_application", "database error", client);
                if (result1 != null && slug == result1.slug)
                    return ws_server.return_event_error("new_application", "identifier already taken", client);
                m.db.create_application(slug, name, description, (success2, result2) => {
                    if (success2 === false) return ws_server.return_event_error("new_application", "database error", client);
                    return ws_server.return_event_data("new_application", { id: result2, slug: slug }, client);
                });
            });
        }
    });
    ws_server.bind("get_applications", (client, req) => {
        m.db.get_applications((success1, result1) => {
            if (success1 === false || result1 === null)
                return ws_server.return_event_error("get_applications", "database error", client);
            return ws_server.return_event_data("get_applications", { list: result1 }, client);
        });
    });
    ws_server.bind("update_application", (client, req) => {
        var id = req.id ? (`${req.id}`).trim() : '';
        var update = req.update ? JSON.parse(JSON.stringify(req.update)) : null;
        if (id != '' && update != null && Object.keys(update).length > 0) {
            m.db.get_application(id, null, (success1, result1) => {
                if (success1 === false) return ws_server.return_event_error("update_application", "database error", client);
                if (result1 == null)
                    return ws_server.return_event_error("update_application", "application not found", client);
                m.db.update_application(id, update, (success2, result2) => {
                    if (success2 === false) return ws_server.return_event_error("update_application", "database error", client);
                    return ws_server.return_event_data("update_application", { id: id, application: result2 }, client);
                });
            });
        }
    });
    ws_server.bind("delete_application", (client, req) => {
        var id = req.id ? (`${req.id}`).trim() : '';
        if (id != '') {
            m.db.get_application(id, null, (success1, result1) => {
                if (success1 === false) return ws_server.return_event_error("delete_application", "database error", client);
                if (result1 == null)
                    return ws_server.return_event_error("delete_application", "application not found", client);
                m.db.delete_application(id, null, (success2, result2) => {
                    if (success2 === false) return ws_server.return_event_error("delete_application", "database error", client);
                    return ws_server.return_event_data("delete_application", { id: id }, client);
                });
            });
        }
    });
    ws_server.bind("signal_application", (client, req) => {
        var id = req.id ? (`${req.id}`).trim() : '';
        var signal = req.signal ? (`${req.signal}`).trim() : '';
        if (id != '' && signal != null && signal != '') {
            m.db.get_application(id, null, (success1, result1) => {
                if (success1 === false) return ws_server.return_event_error("signal_application", "database error", client);
                if (result1 == null) return ws_server.return_event_error("signal_application", "application not found", client);
                var application_resource_id = result1.host;
                if (application_resource_id != 'none') {
                    m.db.get_resource(application_resource_id, null, (success2, result2) => {
                        if (success2 === false) return ws_server.return_event_error("signal_application", "database error", client);
                        if (result2 == null) return ws_server.return_event_error("signal_application", "resource not found", client);
                        var ws_daemon_client = m.ws.get_daemon_client(application_resource_id);
                        if (ws_daemon_client != null && ws_server.clients.hasOwnProperty(ws_daemon_client.id)) {
                            ws_server.send_to_client('signal', {
                                signal: signal,
                                application: id
                            }, ws_daemon_client);
                        }
                    });
                }
            });
        }
    });

    // daemon
    ws_server.bind("sync_daemon", (client, req) => {
        var daemon_key = req.daemon_key ? (`${req.daemon_key}`).trim() : '';
        if (daemon_key != '') {
            m.db.get_resource_by_key(daemon_key, (success1, result1) => {
                if (success1 === false)
                    return ws_server.return_event_error("sync_daemon", "database error", client, false);
                if (result1 == null)
                    return ws_server.return_event_error("sync_daemon", "resource not found", client, false);
                ws_server.authenticate_client(client);
                ws_server.group_client(client, 'daemon');
                ws_server.set_client_object(client, result1._id.toString());
                ws_server.return_event_data("sync_daemon", {
                    id: result1._id.toString(),
                    daemon_key: daemon_key,
                    resource: result1
                }, client);
            });
        }
    }, false);
    ws_server.bind('hb_daemon', (client, req) => {
        m.db.get_resource(ws_server.get_client_object(client), null, (success, resource) => {
            if (success === false || success === null || resource === false || resource === null) return;
            // log(`hb_daemon | client ${client.id} - resource ${client.o_id} heartbeat`);
            // if (resource.status != "online") { // putting this line here doesn't work because we need to update the status time for the device monitor to keep the status as online
            var now = (new Date()).getTime();
            m.db.set_resource_status(client.o_id, "online", now, (success2, result1) => {
                if (success2 === false || success2 === null || result1 === false || result1 === null) return;
                if (resource.status != "online") {  // putting this line here works because it protects the UI from spam about the resource status while allowing the db to update the status
                    ws_server.send_to_group("resource_status", {
                        id: resource._id.toString(),
                        status: "online",
                        status_time: now
                    }, "app");
                }
            });
            // }
        });
    });
};
var api = {
    broadcast_resource_hb: _ => {
        ws_server.send_to_group("hb", null, "daemon");
    },
    update_resource_status: (resource_id, status, status_time) => {
        ws_server.send_to_group("resource_status", {
            id: resource_id,
            status: status,
            status_time: status_time
        }, "app");
        if (status === "offline") {
            for (var cl in ws_server.clients) {
                if (ws_server.clients.hasOwnProperty(cl) && ws_server.clients[cl].o_id && ws_server.clients[cl].o_id.toString() == resource_id) {
                    ws_server.clients[cl].socket.close();
                    delete ws_server.clients[cl];
                }
            }
        }
    },
    get_daemon_client: (resource_id) => {
        for (var c_id in ws_server.clients) {
            if (
                ws_server.clients.hasOwnProperty(c_id) &&
                ws_server.clients[c_id] !== null &&
                (ws_server.clients[c_id].auth) &&
                ws_server.clients[c_id].type == 'daemon' &&
                ws_server.clients[c_id].o_id == resource_id
            ) {
                return ws_server.clients[c_id];
            }
        }
        return null;
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
        ws_server.port = global.ws_port;
        ws_server.socket = new ws.Server({
            port: ws_port
        });
        module.exports.api.exit = resolve => {
            log("exit");
            ws_server.close(_ => {
                if (resolve) resolve();
            });
        };
        // open server
        ws_server.init();
        init();
    },
    api: api
};

