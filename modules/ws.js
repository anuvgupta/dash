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
    // delete client object
    delete_client: (client_id) => {
        delete ws_server.clients[client_id];
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
                type: "app",
                events: { disconnect: null },
                memory: {}
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
                var disconnect_event = client.events.disconnect;
                if (disconnect_event != null) disconnect_event(_ => {
                    ws_server.delete_client(client.id); // remove client object on disconnect
                }); else ws_server.delete_client(client.id);
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
    ws_server.bind("associate_project_application", (client, req) => {
        var project_id = req.project_id ? (`${req.project_id}`).trim() : '';
        var application_id = req.application_id ? (`${req.application_id}`).trim() : '';
        if (project_id != '' && application_id != '') {
            m.db.get_project(project_id, null, (success1, result1) => {
                if (success1 === false) return ws_server.return_event_error("associate_project_app", "database error", client);
                if (result1 == null)
                    return ws_server.return_event_error("associate_project_app", "project not found", client);
                m.db.get_application(application_id, null, (success2, result2) => {
                    if (success2 === false) return ws_server.return_event_error("associate_project_app", "database error", client);
                    if (result2 == null)
                        return ws_server.return_event_error("associate_project_app", "application not found", client);
                    var update = { applications: result1.applications };
                    if (!update.applications.includes(application_id))
                        update.applications.push(application_id);
                    m.db.update_project(project_id, update, (success3, result3) => {
                        if (success3 === false) return ws_server.return_event_error("associate_project_app", "database error", client);
                        return ws_server.return_event_data("update_project", { id: project_id, project: result3 }, client);
                    });
                });
            });
        }
    });
    ws_server.bind("deassociate_project_application", (client, req) => {
        var project_id = req.project_id ? (`${req.project_id}`).trim() : '';
        var application_id = req.application_id ? (`${req.application_id}`).trim() : '';
        if (project_id != '' && application_id != '') {
            m.db.get_project(project_id, null, (success1, result1) => {
                if (success1 === false) return ws_server.return_event_error("deassociate_project_application", "database error", client);
                if (result1 == null)
                    return ws_server.return_event_error("deassociate_project_application", "project not found", client);
                m.db.get_application(application_id, null, (success2, result2) => {
                    if (success2 === false) return ws_server.return_event_error("deassociate_project_application", "database error", client);
                    if (result2 == null)
                        return ws_server.return_event_error("deassociate_project_application", "application not found", client);
                    var update = { applications: [] };
                    for (var a in result1.applications) {
                        if (result1.applications[a] != application_id)
                            update.applications.push(result1.applications[a]);
                    }
                    m.db.update_project(project_id, update, (success3, result3) => {
                        if (success3 === false) return ws_server.return_event_error("deassociate_project_application", "database error", client);
                        return ws_server.return_event_data("update_project", { id: project_id, project: result3 }, client);
                    });
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
    ws_server.bind("link_project_demo", (client, req) => {
        var project_id = req.project_id ? (`${req.project_id}`).trim() : '';
        var application_id = req.application_id ? (`${req.application_id}`).trim() : '';
        if (project_id != '' && application_id != '') {
            m.db.get_project(project_id, null, (success1, result1) => {
                if (success1 === false) return ws_server.return_event_error("link_project_demo", "database error", client);
                if (result1 == null) return ws_server.return_event_error("link_project_demo", "project not found", client);
                m.db.get_application(application_id, null, (success2, result2) => {
                    if (success2 === false) return ws_server.return_event_error("link_project_demo", "database error", client);
                    if (result2 == null) return ws_server.return_event_error("link_project_demo", "application not found", client);
                    if (result2.primary_domain && result2.primary_domain.id && result2.primary_domain.id != '') {
                        if (result2.domains.includes(result2.primary_domain.id)) {
                            m.db.get_domain(result2.primary_domain.id, null, (success3, result3) => {
                                if (success3 === false) return ws_server.return_event_error("link_project_demo", "database error", client);
                                if (result3 == null) return ws_server.return_event_error("link_project_demo", "domain not found", client);
                                if (result3.domain && result3.domain != '') {
                                    var sub = result2.primary_domain.sub ? result2.primary_domain.sub : '';
                                    var link = `http://${sub == '' ? '' : sub + '.'}${result3.domain}/`;
                                    log(link, result1.link);
                                    if (link === result1.link) link = '';
                                    var update = { link: link };
                                    m.db.update_project(project_id, update, (success4, result4) => {
                                        if (success4 === false || success4 === null) return ws_server.return_event_error("link_project_demo", "database error", client);
                                        return ws_server.return_event_data("update_project", { id: project_id, project: result4 }, client);
                                    });
                                }
                            });
                        }
                    }

                });
            });
        }
    });
    ws_server.bind("update_project_tech", (client, req) => {
        var id = req.id ? (`${req.id}`).trim() : '';
        var tech_item = req.tech_item ? (`${req.tech_item}`).trim() : '';
        var tech_section = req.tech_section ? (`${req.tech_section}`).trim() : '';
        if (id != '' && tech_item != '' && tech_section != '') {
            m.db.get_project(id, null, (success1, result1) => {
                if (success1 === false) return ws_server.return_event_error("update_project", "database error", client);
                if (result1 == null) return ws_server.return_event_error("update_project", "project not found", client);
                var update = {};
                var update_key = `tech.${tech_section}`;
                update[update_key] = result1.tech[tech_section];
                if (!update[update_key].includes(tech_item))
                    update[update_key].push(tech_item);
                m.db.update_project(id, update, (success2, result2) => {
                    if (success2 === false) return ws_server.return_event_error("update_project", "database error", client);
                    return ws_server.return_event_data("update_project", { id: id, project: result2 }, client);
                });
            });
        }
    });
    ws_server.bind("remove_project_tech", (client, req) => {
        var id = req.id ? (`${req.id}`).trim() : '';
        var tech_item = req.tech_item ? (`${req.tech_item}`).trim() : '';
        var tech_section = req.tech_section ? (`${req.tech_section}`).trim() : '';
        if (id != '' && tech_item != '' && tech_section != '') {
            m.db.get_project(id, null, (success1, result1) => {
                if (success1 === false) return ws_server.return_event_error("update_project", "database error", client);
                if (result1 == null) return ws_server.return_event_error("update_project", "project not found", client);
                var update = {};
                var update_key = `tech.${tech_section}`;
                update[update_key] = result1.tech[tech_section];
                if (update[update_key].includes(tech_item)) {
                    for (var i = 0; i < update[update_key].length; i++) {
                        if (update[update_key][i] === tech_item)
                            update[update_key].splice(i, 1);
                    }
                }
                m.db.update_project(id, update, (success2, result2) => {
                    if (success2 === false) return ws_server.return_event_error("update_project", "database error", client);
                    return ws_server.return_event_data("update_project", { id: id, project: result2 }, client);
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
    ws_server.bind("get_resource", (client, req) => {
        var id = req.id ? (`${req.id}`).trim() : '';
        m.db.get_resource(id, null, (success1, result1) => {
            if (success1 === false || result1 === null)
                return ws_server.return_event_error("get_resource", "database error", client);
            m.db.get_applications_by_resource(id, (success2, result2) => {
                if (success2 === false || result2 === null)
                    return ws_server.return_event_error("get_resource", "database error", client);
                result1.applications = result2;
                return ws_server.return_event_data("get_resource", { resource: result1 }, client);
            });
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
    ws_server.bind("associate_resource_domain", (client, req) => {
        var resource_id = req.resource_id ? (`${req.resource_id}`).trim() : '';
        var domain_id = req.domain_id ? (`${req.domain_id}`).trim() : '';
        if (resource_id != '' && domain_id != '') {
            m.db.get_resource(resource_id, null, (success1, result1) => {
                if (success1 === false) return ws_server.return_event_error("associate_resource_domain", "database error", client);
                if (result1 == null)
                    return ws_server.return_event_error("associate_resource_domain", "resource not found", client);
                m.db.get_domain(domain_id, null, (success2, result2) => {
                    if (success2 === false) return ws_server.return_event_error("associate_resource_domain", "database error", client);
                    if (result2 == null)
                        return ws_server.return_event_error("associate_resource_domain", "domain not found", client);
                    var update = { domains: result1.domains };
                    if (!update.domains.includes(domain_id))
                        update.domains.push(domain_id);
                    m.db.update_resource(resource_id, update, (success3, result3) => {
                        if (success3 === false) return ws_server.return_event_error("associate_resource_domain", "database error", client);
                        return ws_server.return_event_data("update_resource", { id: resource_id, resource: result3 }, client);
                    });
                });
            });
        }
    });
    ws_server.bind("deassociate_resource_domain", (client, req) => {
        var resource_id = req.resource_id ? (`${req.resource_id}`).trim() : '';
        var domain_id = req.domain_id ? (`${req.domain_id}`).trim() : '';
        if (resource_id != '' && domain_id != '') {
            m.db.get_resource(resource_id, null, (success1, result1) => {
                if (success1 === false) return ws_server.return_event_error("deassociate_resource_domain", "database error", client);
                if (result1 == null)
                    return ws_server.return_event_error("deassociate_resource_domain", "resource not found", client);
                m.db.get_domain(domain_id, null, (success2, result2) => {
                    if (success2 === false) return ws_server.return_event_error("deassociate_resource_domain", "database error", client);
                    if (result2 == null)
                        return ws_server.return_event_error("deassociate_resource_domain", "domain not found", client);
                    var update = { domains: [] };
                    for (var d in result1.domains) {
                        if (result1.domains[d] != domain_id)
                            update.domains.push(result1.domains[d]);
                    }
                    m.db.update_resource(resource_id, update, (success3, result3) => {
                        if (success3 === false) return ws_server.return_event_error("deassociate_resource_domain", "database error", client);
                        return ws_server.return_event_data("update_resource", { id: resource_id, resource: result3 }, client);
                    });
                });
            });
        }
    });

    // domains
    ws_server.bind("new_domain", (client, req) => {
        var domain = req.domain ? (`${req.domain}`).trim() : '';
        if (domain != '') {
            m.db.get_domain(null, domain, (success1, result1) => {
                if (success1 === false) return ws_server.return_event_error("new_domain", "database error", client);
                if (result1 != null && domain == result1.domain)
                    return ws_server.return_event_error("new_domain", "domain already taken", client);
                var domain_split = m.utils.split_domain(domain);
                m.db.create_domain(domain, domain_split.sld, domain_split.tld, (success2, result2) => {
                    if (success2 === false) return ws_server.return_event_error("new_domain", "database error", client);
                    return ws_server.return_event_data("new_domain", { id: result2, domain: domain }, client);
                });
            });
        }
    });
    ws_server.bind("get_domains", (client, req) => {
        var launch_domain_id = req.hasOwnProperty('launch') ? (`${req.launch}`).trim() : '';
        var associate_resource_id = req.hasOwnProperty('associate_resource') ? (`${req.associate_resource}`).trim() : '';
        var associate_application_id = req.hasOwnProperty('associate_application') ? (`${req.associate_application}`).trim() : '';
        m.db.get_domains((success1, result1) => {
            if (success1 === false || result1 === null)
                return ws_server.return_event_error("get_domains", "database error", client);
            var ret_data = { list: result1 };
            if (launch_domain_id != "") {
                for (var r in result1) {
                    if (result1[r]._id.toString() == launch_domain_id) {
                        ret_data.launch = result1[r];
                        break;
                    }
                }
            }
            if (associate_resource_id != "")
                ret_data.associate_resource = associate_resource_id;
            if (associate_application_id != "")
                ret_data.associate_application = associate_application_id;
            return ws_server.return_event_data("get_domains", ret_data, client);
        });
    });
    ws_server.bind("get_domain", (client, req) => {
        var id = req.id ? (`${req.id}`).trim() : '';
        m.db.get_domain(id, null, (success1, result1) => {
            if (success1 === false || result1 === null)
                return ws_server.return_event_error("get_domain", "database error", client);
            return ws_server.return_event_data("get_domain", { domain: result1 }, client);
        });
    });
    ws_server.bind("update_domain", (client, req) => {
        var id = req.id ? (`${req.id}`).trim() : '';
        var update = req.update ? JSON.parse(JSON.stringify(req.update)) : null;
        if (id != '' && update != null && Object.keys(update).length > 0) {
            m.db.get_domain(id, null, (success1, result1) => {
                if (success1 === false) return ws_server.return_event_error("update_domain", "database error", client);
                if (result1 == null) return ws_server.return_event_error("update_domain", "domain not found", client);
                if (update.hasOwnProperty('domain') && !update.hasOwnProperty('twoLevel') && !update.hasOwnProperty('topLevel')) {
                    // domain only
                    var domain_split = m.utils.split_domain(update.domain);
                    update.twoLevel = domain_split.sld;
                    update.topLevel = domain_split.tld;
                } else if (!update.hasOwnProperty('domain') && update.hasOwnProperty('twoLevel') && !update.hasOwnProperty('topLevel')) {
                    // twolevel only
                    update.domain = ([update.twoLevel, result1.topLevel]).join('.');
                } else if (!update.hasOwnProperty('domain') && !update.hasOwnProperty('twoLevel') && update.hasOwnProperty('topLevel')) {
                    // toplevel only
                    update.domain = ([result1.twoLevel, update.topLevel]).join('.');
                }
                m.db.update_domain(id, update, (success2, result2) => {
                    if (success2 === false) return ws_server.return_event_error("update_domain", "database error", client);
                    return ws_server.return_event_data("update_domain", { id: id, domain: result2 }, client);
                });
            });
        }
    });
    ws_server.bind("delete_domain", (client, req) => {
        var id = req.id ? (`${req.id}`).trim() : '';
        if (id != '') {
            m.db.get_domain(id, null, (success1, result1) => {
                if (success1 === false) return ws_server.return_event_error("delete_domain", "database error", client);
                if (result1 == null) return ws_server.return_event_error("delete_domain", "resource not found", client);
                m.db.delete_domain(id, null, (success2, result2) => {
                    if (success2 === false) return ws_server.return_event_error("delete_domain", "database error", client);
                    return ws_server.return_event_data("delete_domain", { id: id }, client);
                });
            });
        }
    });
    ws_server.bind("update_domain_subdomains", (client, req) => {
        var id = req.id ? (`${req.id}`).trim() : '';
        var new_subdomain = req.new_subdomain ? (`${req.new_subdomain}`).trim() : '';
        if (id != '' && new_subdomain != '') {
            m.db.get_domain(id, null, (success1, result1) => {
                if (success1 === false) return ws_server.return_event_error("update_domain", "database error", client);
                if (result1 == null) return ws_server.return_event_error("update_domain", "domain not found", client);
                var update = { subdomains: result1.subdomains };
                if (!update.subdomains.includes(new_subdomain))
                    update.subdomains.push(new_subdomain);
                m.db.update_domain(id, update, (success2, result2) => {
                    if (success2 === false) return ws_server.return_event_error("update_domain", "database error", client);
                    return ws_server.return_event_data("update_domain", { id: id, domain: result2 }, client);
                });
            });
        }
    });
    ws_server.bind("remove_domain_subdomain", (client, req) => {
        var id = req.id ? (`${req.id}`).trim() : '';
        var remove_subdomain = req.remove_subdomain ? (`${req.remove_subdomain}`).trim() : '';
        if (id != '' && remove_subdomain != '') {
            m.db.get_domain(id, null, (success1, result1) => {
                if (success1 === false) return ws_server.return_event_error("update_domain", "database error", client);
                if (result1 == null) return ws_server.return_event_error("update_domain", "domain not found", client);
                var update = { subdomains: result1.subdomains };
                if (update.subdomains.includes(remove_subdomain)) {
                    for (var i = 0; i < update.subdomains.length; i++) {
                        if (update.subdomains[i] === remove_subdomain)
                            update.subdomains.splice(i, 1);
                    }
                }
                m.db.update_domain(id, update, (success2, result2) => {
                    if (success2 === false) return ws_server.return_event_error("update_domain", "database error", client);
                    return ws_server.return_event_data("update_domain", { id: id, domain: result2 }, client);
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
        var launch_app_id = req.hasOwnProperty('launch') ? (`${req.launch}`).trim() : '';
        var associate_project_id = req.hasOwnProperty('associate') ? (`${req.associate}`).trim() : '';
        m.db.get_applications((success1, result1) => {
            if (success1 === false || result1 === null)
                return ws_server.return_event_error("get_applications", "database error", client);
            var ret_data = { list: result1 };
            if (launch_app_id != "") {
                for (var r in result1) {
                    if (result1[r]._id.toString() == launch_app_id) {
                        ret_data.launch = result1[r];
                        break;
                    }
                }
            }
            if (associate_project_id != "") {
                ret_data.associate = associate_project_id;
            }
            return ws_server.return_event_data("get_applications", ret_data, client);
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
                var host_resource = result1.host;
                var app_identifier_slug = result1.slug;
                var _next = (update_obj) => {
                    m.db.update_application(id, update_obj, (success2, result2) => {
                        if (success2 === false) return ws_server.return_event_error("update_application", "database error", client);
                        if (host_resource != 'none')
                            m.ws.refresh_daemon_ecosystem(host_resource);
                        if (result2.host != host_resource && result2.host != 'none') {
                            host_resource = result2.host;
                            m.ws.refresh_daemon_ecosystem(host_resource);
                        }
                        return ws_server.return_event_data("update_application", { id: id, application: result2 }, client);
                    });
                };
                if (host_resource != 'none') {
                    if (update.hasOwnProperty('ecosystem.cwd')) {
                        if (update['ecosystem.cwd'].includes('$app_root')) {
                            m.db.get_resource(host_resource, null, (success3, result3) => {
                                if (success3 === null || success3 === null) return _next(update);
                                if (result3.software.app_root == "") return _next(update);
                                update['ecosystem.cwd'] = update['ecosystem.cwd'].replace('$app_root', result3.software.app_root);
                                return _next(update);
                            });
                        } else return _next(update);
                    } else return _next(update);
                } else return _next(update);
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
                                signal: signal, application: id
                            }, ws_daemon_client);
                            if (signal == 'tail') {
                                if (!client.memory.hasOwnProperty('tailed_applications'))
                                    client.memory.tailed_applications = {};
                                client.memory.tailed_applications[id] = null;
                                if (client.events.disconnect == null) client.events.disconnect = ((resolve = null) => {
                                    log(`client ${client.id} disconnected --> untailing apps: ${Object.keys(client.memory.tailed_applications)}`);
                                    for (var tailed_app_id in client.memory.tailed_applications) {
                                        ws_server.send_to_client('signal', {
                                            signal: 'untail', application: tailed_app_id
                                        }, ws_daemon_client);
                                    }
                                    if (resolve) resolve();
                                });
                            } else if (signal == 'untail') {
                                if (client.memory.hasOwnProperty('tailed_applications')) {
                                    if (client.memory.tailed_applications.hasOwnProperty(id)) {
                                        delete client.memory.tailed_applications[id];
                                    }
                                }
                            }
                        }
                    });
                } else {
                    if (signal != 'tail' && signal != 'untail') {
                        ws_server.send_to_client('signal_application_res_daemon_res', {
                            success: true,
                            data: {
                                success: false,
                                message: 'No host selected!',
                                application_id: id
                            }
                        }, client);
                    }
                }
            });
        }
    });
    ws_server.bind("signal_application_res_daemon", (client, req) => {
        var application_id = req.application_id ? (`${req.application_id}`).trim() : '';
        var success = req.success && req.success === true;
        var message = req.message ? (`${req.message}`).trim() : '';
        if (application_id != '' && message != '') {
            m.db.get_application(application_id, null, (success1, result1) => {
                if (success1 === false) return ws_server.return_event_error("signal_application_res_daemon", "database error", client);
                if (result1 == null) return ws_server.return_event_error("signal_application_res_daemon", "application not found", client);
                ws_server.send_to_group("signal_application_res_daemon_res", {
                    success: true,
                    data: {
                        success: success,
                        message: message,
                        application_id: application_id
                    }
                }, "app");
            });
        }
    });
    ws_server.bind("tail_application_stream", (client, req) => {
        var app_id = req.app_id ? (`${req.app_id}`).trim() : '';
        var log_line = req.log_line ? (`${req.log_line}`).trim() : '';
        var now_ts = req.now_ts;
        if (app_id != '' && log_line != '') {
            ws_server.send_to_group("tail_app_stream_line", {
                app_id: app_id, log_line: log_line, now_ts: now_ts
            }, "app");
        }
    });
    ws_server.bind("tail_application_stream_intro", (client, req) => {
        var app_id = req.app_id ? (`${req.app_id}`).trim() : '';
        var log_lines = req.log_lines ? (`${req.log_lines}`).trim() : '';
        // console.log(app_id, log_lines);
        if (app_id != '') {
            ws_server.send_to_group("tail_app_stream_lines", {
                app_id: app_id, log_lines: log_lines
            }, "app");
        }
    });
    ws_server.bind("get_application_status", (client, req) => {
        var id = req.id ? (`${req.id}`).trim() : '';
        if (id != '') {
            m.db.get_application(id, null, (success1, result1) => {
                if (success1 === false) return ws_server.return_event_error("get_application_status", "database error", client);
                if (result1 == null) return ws_server.return_event_error("get_application_status", "application not found", client);
                var application_resource_id = result1.host;
                if (application_resource_id != 'none') {
                    m.db.get_resource(application_resource_id, null, (success2, result2) => {
                        if (success2 === false) return ws_server.return_event_error("get_application_status", "database error", client);
                        if (result2 == null) return ws_server.return_event_error("get_application_status", "resource not found", client);
                        var ws_daemon_client = m.ws.get_daemon_client(application_resource_id);
                        if (ws_daemon_client != null && ws_server.clients.hasOwnProperty(ws_daemon_client.id)) {
                            ws_server.send_to_client('get_application_status', {
                                application: id
                            }, ws_daemon_client);
                        }
                    });
                }
            });
        }
    });
    ws_server.bind("return_application_status", (client, req) => {
        var id = req.application_id ? (`${req.application_id}`).trim() : '';
        var status = req.status ? (`${req.status}`).trim() : '';
        var success = req.success === true;
        var timestamp = req.timestamp;
        // console.log(id, status, success, timestamp);
        if (id != '' && status != '' && success) {
            var update = {
                status: status,
                status_time: timestamp
            };
            if (id != '' && update != null && Object.keys(update).length > 0) {
                m.db.get_application(id, null, (success1, result1) => {
                    if (success1 === false || result1 == null) return;
                    m.db.update_application(id, update, (success2, result2) => {
                        if (success2 === false) return;
                        ws_server.send_to_group("update_application_res", {
                            success: true, data: {
                                id: id, application: result2
                            }
                        }, "app");
                    });
                });
            }
        }
    });
    ws_server.bind("associate_application_domain", (client, req) => {
        var application_id = req.application_id ? (`${req.application_id}`).trim() : '';
        var domain_id = req.domain_id ? (`${req.domain_id}`).trim() : '';
        if (application_id != '' && domain_id != '') {
            m.db.get_application(application_id, null, (success1, result1) => {
                if (success1 === false) return ws_server.return_event_error("associate_application_domain", "database error", client);
                if (result1 == null)
                    return ws_server.return_event_error("associate_application_domain", "application not found", client);
                m.db.get_domain(domain_id, null, (success2, result2) => {
                    if (success2 === false) return ws_server.return_event_error("associate_application_domain", "database error", client);
                    if (result2 == null)
                        return ws_server.return_event_error("associate_application_domain", "domain not found", client);
                    var update = { domains: result1.domains };
                    if (!update.domains.includes(domain_id))
                        update.domains.push(domain_id);
                    m.db.update_application(application_id, update, (success3, result3) => {
                        if (success3 === false) return ws_server.return_event_error("associate_application_domain", "database error", client);
                        return ws_server.return_event_data("update_application", { id: application_id, application: result3 }, client);
                    });
                });
            });
        }
    });
    ws_server.bind("deassociate_application_domain", (client, req) => {
        var application_id = req.application_id ? (`${req.application_id}`).trim() : '';
        var domain_id = req.domain_id ? (`${req.domain_id}`).trim() : '';
        if (application_id != '' && domain_id != '') {
            m.db.get_application(application_id, null, (success1, result1) => {
                if (success1 === false) return ws_server.return_event_error("deassociate_application_domain", "database error", client);
                if (result1 == null)
                    return ws_server.return_event_error("deassociate_application_domain", "application not found", client);
                m.db.get_domain(domain_id, null, (success2, result2) => {
                    if (success2 === false) return ws_server.return_event_error("deassociate_application_domain", "database error", client);
                    if (result2 == null)
                        return ws_server.return_event_error("deassociate_application_domain", "domain not found", client);
                    var update = { domains: [] };
                    for (var d in result1.domains) {
                        if (result1.domains[d] != domain_id)
                            update.domains.push(result1.domains[d]);
                    }
                    m.db.update_application(application_id, update, (success3, result3) => {
                        if (success3 === false) return ws_server.return_event_error("deassociate_application_domain", "database error", client);
                        return ws_server.return_event_data("update_application", { id: application_id, application: result3 }, client);
                    });
                });
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
                var resource_id = result1._id.toString();
                ws_server.authenticate_client(client);
                ws_server.group_client(client, 'daemon');
                ws_server.set_client_object(client, resource_id);
                ws_server.return_event_data("sync_daemon", {
                    id: resource_id,
                    daemon_key: daemon_key,
                    resource: result1
                }, client);
                m.ws.refresh_daemon_ecosystem(resource_id);
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
    },
    refresh_daemon_ecosystem: (resource_id) => {
        var daemon_client = m.ws.get_daemon_client(resource_id);
        if (daemon_client === null) return;
        m.db.get_daemon_ecosystem(resource_id, (success, result) => {
            if (success === false || success === null) return;
            ws_server.send_to_client('ecosystem', {
                ecosystem: result
            }, daemon_client);
        });
    },
    ws_server: ws_server
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

