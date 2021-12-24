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
            if (!auth_req || (client.auth && ws_server.verify_token(auth)))
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
        if (req.password && req.password.toLowerCase() == global.config.secret.toLowerCase()) {
            success = true;
            jwt_token = ws_server.authenticate_client(client);
        }
        ws_server.send_to_client("sign_in_res", {
            success: success,
            message: (success ? null : "invalid token"),
            data: { token: jwt_token }
        }, client, false);
    }, false);

    // projects
    ws_server.bind("new_project", (client, req) => {
        var slug = req.slug ? (`${req.slug}`).trim() : '';
        var name = req.name ? (`${req.name}`).trim() : '';
        var repo = req.repo ? (`${req.repo}`).trim() : '';
        if (slug != '' && name != '') {
            m.db.get_project(null, slug, (success1, result1) => {
                if (success1 === false) return ws_server.return_event_error("new_project", "database error", client);
                if (result1 != null && slug == result1.slug)
                    return ws_server.return_event_error("new_project", "identifier already taken", client);
                m.db.create_project(slug, name, repo, false, (success2, result2) => {
                    if (success2 === false) return ws_server.return_event_error("new_project", "database error", client);
                    return ws_server.return_event_data("new_project", { id: result2.insertedId }, client);
                });
            });
        }
    });
    ws_server.bind("get_projects", (client, req) => {
        log(req);
    })
};
var api = {};



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

