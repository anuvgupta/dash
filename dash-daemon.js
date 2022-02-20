/* DASHBOARD */
// project dashboard – resource daemon

/* IMPORTS */
const fs = require("fs");
const pm2 = require("pm2");
const path = require("path");
const websocket = require("ws");
const split2 = require('split2');
const readline = require("readline");
const cproc = require("child_process");
const tf = require('@logdna/tail-file');

/* ENVIRONMENT */
global.args = process.argv.slice(2);
global.env = global.args[0] == "prod" ? "prod" : "dev";
global.config = JSON.parse(fs.readFileSync('./config-daemon.json', { encoding: 'utf8', flag: 'r' }));

/* MODULES */

// utilities
const utils = {
    input: readline.createInterface({
        input: process.stdin,
        output: process.stdout
    }),
    delay: (callback, timeout) => {
        setTimeout(_ => {
            process.nextTick(callback);
        }, timeout);
    },
    rand_id: (length = 10) => {
        var key = "";
        var chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        for (var i = 0; i < length; i++)
            key += chars[utils.rand_int(0, chars.length - 1)];
        return key;
    },
    rand_int: (low, high) => {  // inclusive
        return (Math.floor(Math.random() * (high - low + 1)) + low);
    },
    logger: (module, err = false) => {
        return (...args) => {
            args = Array.prototype.slice.call(args);
            args.unshift(`${err ? '* ' : ''}[${module}]${err ? ' ERROR:' : ''}`);
            target = err ? console.error : console.log;
            target.apply(null, args);
        }
    },
};

// database
const db = {
    ecosystem: {}
};

// main class
const app = {

    // constants
    config: global.config,
    name: "dash resource daemon",
    secure: global.config.secure,

    // main method
    main: _ => {
        utils.delay(_ => {
            app.log("initializing");
            cli.init(_ => {
                pm.init(_ => {
                    ws.init(_ => {
                        app.log("ready");
                    });
                });
            });
        }, 50);
    },

    // module methods
    process_signal: (application_id, signal, resolve) => {
        app.log(`processing signal for app ${application_id}: "${signal}"`);
        if (db.ecosystem.hasOwnProperty(application_id)) {
            app.log(`found application ${application_id}`);
            var app_ecosystem = db.ecosystem[application_id];
            // app.log(app_ecosystem);
            pm[`${signal}_process`] && pm[`${signal}_process`](app_ecosystem, application_id, (success = true) => {
                resolve(success, `<b>${app_ecosystem.name}</b> received <b>${signal.toUpperCase()}</b>`);
            });
        } else {
            resolve(false, `App ${app_ecosystem.name} not in ecosystem`);
            // TODO: queue signal for processing later? or maybe not
        }
    },
    process_proxy_config: (application_id, nginx_root, nginx_config, proxy_settings, resolve) => {
        app.log(`processing nginx proxy for app ${application_id}`);
        if (!db.ecosystem.hasOwnProperty(application_id))
            return resolve(false, `App ${app_ecosystem.name} not in ecosystem`);
        app.log(`found application ${application_id}`);
        var app_ecosystem = db.ecosystem[application_id];
        var app_name = app_ecosystem.name;
        var proxy_file_dir_loc = `${nginx_root}/sites-available`;
        var proxy_file_location = `${proxy_file_dir_loc}/dash-app_${app_name}.conf`;
        var proxy_file_link_loc = `${nginx_root}/sites-enabled/dash-app_${app_name}.conf`;
        // var proxy_file_rel_path = path.relative(proxy_file_dir_loc, proxy_file_location);
        var proxy_file_content = `# ${app_name} (dash managed application) reverse proxy configuration\n${nginx_config}\n`;
        app.log(`writing config for app "${app_name}" (${application_id}) to location ${proxy_file_location}`);
        fs.writeFile(proxy_file_location, proxy_file_content, (err) => {
            if (err) { console.error(err); return resolve(false, "Failed writing proxy file"); }
            app.log(`wrote file, linking to location ${proxy_file_link_loc}`);
            _next = _ => {
                // app.log(fs.readFileSync(proxy_file_link_loc, 'utf8'));
                pm.nginx_reload(resolve, "Proxy pushed & linked");
            };
            if (fs.existsSync(proxy_file_link_loc)) {
                app.log('symlink exists');
                _next();
            } else {
                fs.symlink(proxy_file_location, proxy_file_link_loc, 'file', (err) => {
                    if (err) { console.error(err); return resolve(false, "Failed symlinking proxy file"); }
                    app.log("symlink created");
                    _next();
                });
            }
        });
        
    },
    remove_proxy_config: (application_id, nginx_root, resolve) => {
        app.log(`removing nginx proxy for app ${application_id}`);
        if (!db.ecosystem.hasOwnProperty(application_id))
            return resolve(false, `App ${app_ecosystem.name} not in ecosystem`);
        app.log(`found application ${application_id}`);
        var app_ecosystem = db.ecosystem[application_id];
        var app_name = app_ecosystem.name;
        var proxy_file_dir_loc = `${nginx_root}/sites-available`;
        var proxy_file_location = `${proxy_file_dir_loc}/dash-app_${app_name}.conf`;
        var proxy_file_link_loc = `${nginx_root}/sites-enabled/dash-app_${app_name}.conf`;
        // var proxy_file_rel_path = path.relative(proxy_file_dir_loc, proxy_file_location);
        try {
            if (fs.existsSync(proxy_file_link_loc)) {
                fs.unlink(proxy_file_link_loc, (err1) => {
                    if (err1) {
                        resolve(false, `failed to remove proxy link ${proxy_file_link_loc}`);
                        throw err1;
                    }
                    if (fs.existsSync(proxy_file_location)) {
                        fs.unlink(proxy_file_location, (err2) => {
                            if (err2) {
                                resolve(false, `failed to remove proxy file ${proxy_file_location}`);
                                throw err2;
                            }
                            pm.nginx_reload(resolve, "Proxy removed");
                        });
                    }
                });
            }
        } catch(err) { app.err(err); }
    },
    refresh_ecosystem: (ecosystem) => {
        app.log("refreshing ecosystem");
        for (var e in db.ecosystem) {
            if (db.ecosystem.hasOwnProperty(e)) {
                if (ecosystem.hasOwnProperty(e)) {
                    app.log(`refreshing application "${e}"`);
                    var ecosystem_old = JSON.parse(JSON.stringify(db.ecosystem[e]));
                    var ecosystem_new = JSON.parse(JSON.stringify(ecosystem[e]));
                    if (ecosystem_new.name != ecosystem_old.name) {
                        pm.delete_process(ecosystem_old, e, (success) => {
                            db.ecosystem[e] = ecosystem_new;
                        });
                    }
                    db.ecosystem[e] = ecosystem_new;
                } else {
                    app.log(`removing application "${e}"`);
                    // stop and remove the application
                    // pm.stop_process(db.ecosystem[e], e, (success) => {
                    // stop_process is commented out because pm2's delete command does stop the app first
                    pm.delete_process(db.ecosystem[e], e, (success) => {
                        db.ecosystem[e] = null;
                        delete db.ecosystem[e];
                    });
                    // });
                }
            }
        }
        for (var e in ecosystem) {
            if (ecosystem.hasOwnProperty(e)) {
                if (!db.ecosystem.hasOwnProperty(e)) {
                    app.log(`adding application "${e}"`);
                    db.ecosystem[e] = JSON.parse(JSON.stringify(ecosystem[e]));
                }
            }
        }
        // console.log(db.ecosystem);
    },

    // module infra
    ws: null, pm: null,
    link: resolve => {
        app.ws = ws; app.pm = pm;
        if (resolve) resolve();
    },
    log: utils.logger('main'),
    err: utils.logger('main', true),
    exit: resolve => {
        app.log("exit");
        app.ws.exit(_ => {
            app.pm.exit(_ => {
                if (resolve) resolve();
                process.exit(0);
            });
        });
    }
};

// websocket client
const ws = {
    url: null,
    socket: null,
    online: false,
    reconnect_interval: app.config.ws_reconnect_interval,
    encode_msg: (e, d) => {  // encode event+data to JSON
        return JSON.stringify({
            event: e,
            data: d
        });
    },
    decode_msg: (m) => {  // decode event+data from JSON
        try {
            m = JSON.parse(m);
        } catch (e) {
            ws.log("invalid json msg", e);
            m = null;
        }
        return m;
    },
    send: (event, data, silent = false) => {
        if (!silent) ws.log("sending:", event, data);
        ws.socket.send(ws.encode_msg(event, data));
    },
    connect: resolve => {
        ws.initialize_client(_ => {
            utils.delay(ws.api.login, 500);
            if (resolve) resolve();
        });
    },
    reconnect: _ => {
        ws.log(`reconnecting in ${ws.reconnect_interval / 1000} sec`);
        setTimeout(ws.connect, ws.reconnect_interval);
    },
    handle: (event, data) => {
        const success = data && data.hasOwnProperty('success') && data.success;
        if (data && data.hasOwnProperty('data')) data = data.data;
        switch (event) {
            case 'sync_daemon_res':
                if (success === true) {
                    ws.log(`identified with dash cloud as resource "${data.resource.name}" (${data.id})`);
                } else ws.err("failed to identify with dash cloud");
                break;
            case 'ecosystem':
                ws.log('received ecosystem update');
                app.refresh_ecosystem(data.ecosystem);
                break;
            case 'signal':
                ws.log(`received signal "${data.signal}" for application "${data.application}"`);
                app.process_signal(data.application, data.signal, (success, message) => {
                    ws.api.signal_respond(data.application, success, message);
                });
                break;
            case 'get_application_status':
                ws.log(`server requested process status for application "${data.application}"`);
                // app.process_signal(data.application, data.signal, (success, message) => {
                //     ws.api.signal_respond(data.application, success, message);
                // });
                var application_id = data.application;
                if (db.ecosystem.hasOwnProperty(application_id)) {
                    app.log(`found application ${application_id}`);
                    var app_ecosystem = db.ecosystem[application_id];
                    pm.describe_process(app_ecosystem, application_id, (success, status, timestamp) => {
                        app.log('describe_process', success, status, timestamp);
                        ws.api.return_application_status(application_id, success, status, timestamp);
                    });
                }
                break;
            case 'proxy_config':
                var remove = data.hasOwnProperty('remove') && data.remove === true;
                if (remove) {
                    ws.log(`removing nginx proxy config for application "${data.application}"`);
                    app.remove_proxy_config(data.application, data.nginx_root, (success, message) => {
                        ws.api.proxy_config_respond(data.application, success, message);
                    });
                } else {
                    ws.log(`received nginx proxy config for application "${data.application}"`);
                    app.process_proxy_config(data.application, data.nginx_root, data.nginx_config, data.proxy_settings, (success, message) => {
                        ws.api.proxy_config_respond(data.application, success, message);
                    });
                }
                break;
            case 'hb':
                ws.api.hb_respond();
                break;
            default:
                ws.log(`unknown event ${event}`);
                break;
        }
    },
    api: {
        login: _ => {
            ws.send('sync_daemon', { daemon_key: app.config.resource_key });
        },
        hb_respond: _ => {
            ws.send('hb_daemon', {}, global.config.ws_heartbeat_log === false);
        },
        signal_respond: (application_id, success, message) => {
            ws.send('signal_application_res_daemon', {
                application_id: application_id,
                success: success, message: message
            });
        },
        proxy_config_respond: (application_id, success, message) => {
            ws.send('push_application_proxy_res_daemon', {
                application_id: application_id,
                success: success, message: message
            });
        },
        tail_application_stream: (application_id, log_line, now_ts) => {
            ws.send('tail_application_stream', {
                app_id: application_id,
                log_line: log_line,
                now_ts: now_ts
            });
        },
        tail_application_stream_intro: (application_id, log_lines) => {
            // console.log(application_id, log_lines);
            ws.send('tail_application_stream_intro', {
                app_id: application_id,
                log_lines: log_lines,
            });
        },
        return_application_status: (application_id, success, status, timestamp) => {
            ws.send('return_application_status', {
                application_id: application_id,
                success: success, timestamp: timestamp,
                status: status
            });
        }
    },
    initialize_client: resolve => {
        ws.url = `ws${app.secure ? 's' : ''}://${app.config.cloud_socket}`;
        ws.socket = new websocket(ws.url);
        ws.socket.addEventListener('open', e => {
            ws.log("socket connected");
            ws.online = true;
            if (resolve) resolve();
        });
        ws.socket.addEventListener('error', e => {
            ws.err("socket error ", e.message);
        });
        ws.socket.addEventListener('message', e => {
            var d = ws.decode_msg(e.data);
            if (d != null) {
                if (d.event != 'hb' || global.config.ws_heartbeat_log === true)
                    ws.log("socket received:", d.event, d.data);
                ws.handle(d.event, d.data);
            } else {
                ws.log("socket received:", "invalid message", e.data);
            }
        });
        ws.socket.addEventListener('close', e => {
            ws.log("socket disconnected");
            ws.online = false;
            ws.reconnect();
        });
    },
    init: resolve => {
        ws.log("initializing");
        ws.connect(resolve);
    },
    // module infra
    log: utils.logger('ws'),
    err: utils.logger('ws', true),
    exit: resolve => {
        ws.log("exit");
        ws.socket.close();
        if (resolve) resolve();
    }
};

// process manager
const pm = {
    init: resolve => {
        pm.log("initializing");
        pm2.connect(!(global.config.pm2_daemon_mode), resolve);
    },
    start_process: (ecosystem, app_id, resolve = null) => {
        console.log(ecosystem);
        pm2.start(ecosystem, (error, env) => {
            if (error) console.error(error);
            // console.log('env', env);
            var status = "";
            if (!error && env[0]) status = env[0].pm2_env.status;
            ws.api.return_application_status(app_id, error == null, status, Date.now());
            if (resolve) resolve(error == null);
        });
    },
    stop_process: (ecosystem, app_id, resolve = null) => {
        pm2.stop(ecosystem.name, (error, env) => {
            if (error) console.error(error);
            // console.log('env', env);
            var status = "";
            if (!error && env[0]) status = env[0].pm2_env.status;
            ws.api.return_application_status(app_id, error == null, status, Date.now());
            if (resolve) resolve(error == null);
        });
    },
    restart_process: (ecosystem, app_id, resolve = null) => {
        pm2.restart(ecosystem.name, (error, env) => {
            if (error) console.error(error);
            // console.log('env', env);
            var status = "";
            if (!error && env[0]) status = env[0].pm2_env.status;
            ws.api.return_application_status(app_id, error == null, status, Date.now());
            if (resolve) resolve(error == null);
        });
    },
    delete_process: (ecosystem, app_id, resolve = null) => {
        pm2.delete(ecosystem.name, (error, env) => {
            if (error) console.error(error);
            // console.log('env', env);
            var status = "";
            if (!error) status = "removed";
            ws.api.return_application_status(app_id, error == null, status, Date.now());
            if (resolve) resolve(error == null);
        });
    },
    describe_process: (ecosystem, app_id, resolve = null) => {
        pm2.describe(ecosystem.name, (error, env) => {
            if (error) console.error(error);
            // console.log('env', env);
            var status = "";
            if (!error && env[0]) status = env[0].pm2_env.status;
            if (resolve) resolve(error == null, status, Date.now());
        });
    },
    tail_process_context: {},
    tail_process: (ecosystem, app_id, resolve = null) => {
        const output_log_path = path.join(ecosystem.cwd, ecosystem.out_file);
        const error_log_path = path.join(ecosystem.cwd, ecosystem.error_file);
        fs.readFile(output_log_path, 'utf8', (err, data) => {
            if (err) { console.error(err); return; }
            var lines = data.split('\n');
            var line_lim = lines.length - global.config.log_tf_load_lines;
            if (line_lim < 0) line_lim = 0;
            lines = lines.slice(line_lim);
            ws.api.tail_application_stream_intro(app_id, lines.join('\n'));
            pm.untail_process(ecosystem, app_id);
            pm.tail_process_context[app_id] = new tf(output_log_path);
            pm.tail_process_context[app_id]
                .on('tail_error', (err) => {
                    pm.error('error tailing file', err);
                    throw err;
                })
                .start()
                .catch((err) => {
                    console.error('error tailing file - cannot start, check file exists', err);
                    throw err;
                });
            pm.tail_process_context[app_id]
                .pipe(split2())
                .on('data', (line) => {
                    const now_ts = Date.now();
                    ws.api.tail_application_stream(app_id, line, now_ts);
                });
        });
        if (output_log_path != error_log_path) {
            // TODO: also tail the error log if its a different file
        }
    },
    untail_process: (ecosystem, app_id, resolve = null) => {
        if (pm.tail_process_context.hasOwnProperty(app_id) && pm.tail_process_context[app_id] != null) {
            pm.tail_process_context[app_id].quit();
            pm.tail_process_context[app_id] = null;
            delete pm.tail_process_context[app_id];
        }
    },
    nginx_reload: (resolve, msg) => {
        var reload_command = "sudo /usr/sbin/service nginx reload";
        pm.log(`running command: \`${reload_command}\``);
        cproc.exec(`${reload_command}`, (error, stdout, stderr) => {
            if (error) { app.log(`error: ${error.message}`); return resolve(false, `Failed NGINX reload: ${error.message}`); }
            if (stderr) { app.log(`stderr: ${stderr}`); return resolve(false `Failed NGINX reload: ${stderr.toString()}`); }
            pm.log(`stdout: ${stdout}`);
            return resolve(true, `${msg}`);
        });
    },
    // module infra
    log: utils.logger('pm'),
    err: utils.logger('pm', true),
    exit: resolve => {
        pm.log("exit");
        pm2.disconnect()
        if (resolve) resolve();
    }
};

// command line interface
const cli = {
    init: resolve => {
        cli.log("initializing");
        utils.input.on('line', (line) => {
            var line_text = '';
            line = line.trim();
            if (line != '') {
                line_text = line;
                line = line.split(' ');
                if (line[0] == "db" || line[0] == "database") {
                    if (line[1] == "save") {
                        // database.save(line[2] && line[2] == "pretty");
                    }
                } else if (line[0] == "test") {
                    cli.log('running tests');
                } else if (line[0] == "code") {
                    if (line.length > 1 && line[1] != "") {
                        line_text = line_text.substring(4);
                        var ret = eval(line_text);
                        if (ret !== undefined) cli.log(ret);
                    }
                } else if (line[0] == "clear" || line[0] == "c") {
                    console.clear();
                } else if (line[0] == "exit" || line[0] == "quit" || line[0] == "q") {
                    app.exit(_ => {
                        cli.log("bye");
                    }, 0);
                }
            }
        });
        if (resolve) resolve();
    },
    log: utils.logger('cli'),
    err: utils.logger('cli', true),
    exit: resolve => {
        cli.log("exit");
        if (resolve) resolve();
    }
};

/* MAIN */
console.log("DASHBOARD");
console.log("[svc] daemon");
process.on('exit', _ => {
    console.log('[process] exit');
});
process.on('SIGINT', _ => {
    console.log('[process] interrupt');
    app.exit();
});
process.on('SIGUSR1', _ => {
    console.log('[process] restart 1');
    app.exit();
});
process.on('SIGUSR2', _ => {
    console.log('[process] restart 2');
    app.exit();
});

// entry point
app.link(app.main);