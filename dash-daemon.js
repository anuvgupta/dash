/* DASHBOARD */
// project dashboard – resource daemon

/* IMPORTS */
const fs = require("fs");
const pm2 = require("pm2");
const path = require("path");
const debug = require('debug');
const websocket = require("ws");
const split2 = require('split2');
const git = require('simple-git');
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
            global.config.github_token = (`${fs.readFileSync(global.config.github_token_path)}`).trim();
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
            return resolve(false, `App ${application_id} not in ecosystem`);
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
            return resolve(false, `App ${application_id} not in ecosystem`);
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
    process_vhost_config: (application_id, apache_root, www_root, vhost_config, proxy_settings, resolve) => {
        app.log(`processing vhost config for app ${application_id}`);
        if (!db.ecosystem.hasOwnProperty(application_id))
            return resolve(false, `App ${application_id} not in ecosystem`);
        app.log(`found application ${application_id}`);
        var app_ecosystem = db.ecosystem[application_id];
        var app_name = app_ecosystem.name;
        var vhost_file_dir_loc = `${apache_root}/sites-available`;
        var vhost_file_location = `${vhost_file_dir_loc}/dash-app_${app_name}.conf`;
        var vhost_file_link_loc = `${apache_root}/sites-enabled/dash-app_${app_name}.conf`;
        var vhost_app_loc = `${app_ecosystem.cwd}`;
        var vhost_app_link_loc = `${www_root}/${app_name}`;
        var vhost_file_content = `# ${app_name} (dash managed application) virtual host configuration\n${vhost_config}\n`;
        app.log(`writing config for app "${app_name}" (${application_id}) to location ${vhost_file_location}`);
        fs.writeFile(vhost_file_location, vhost_file_content, (err) => {
            if (err) { console.error(err); return resolve(false, "Failed writing vhost file"); }
            app.log(`wrote file, linking to location ${vhost_file_link_loc}`);
            _next = _ => {
                // app.log(fs.readFileSync(vhost_file_link_loc, 'utf8'));
                fs.symlink(vhost_app_loc, vhost_app_link_loc, 'dir', (err) => {
                    if (err) { console.error(err); return resolve(false, `Failed symlinking ${vhost_app_link_loc}`); }
                    app.log(`symlink ${vhost_app_link_loc} created`);
                    pm.apache_reload(resolve, "VHost pushed & linked");
                });
            };
            if (fs.existsSync(vhost_file_link_loc)) {
                app.log('symlink exists');
                _next();
            } else {
                fs.symlink(vhost_file_location, vhost_file_link_loc, 'file', (err) => {
                    if (err) { console.error(err); return resolve(false, "Failed symlinking vhost file"); }
                    app.log("symlink created");
                    _next();
                });
            }
        });
        
    },
    remove_vhost_config: (application_id, apache_root, www_root, resolve) => {
        app.log(`removing vhost config for app ${application_id}`);
        if (!db.ecosystem.hasOwnProperty(application_id))
            return resolve(false, `App ${application_id} not in ecosystem`);
        app.log(`found application ${application_id}`);
        var app_ecosystem = db.ecosystem[application_id];
        var app_name = app_ecosystem.name;
        var vhost_file_dir_loc = `${apache_root}/sites-available`;
        var vhost_file_location = `${vhost_file_dir_loc}/dash-app_${app_name}.conf`;
        var vhost_file_link_loc = `${apache_root}/sites-enabled/dash-app_${app_name}.conf`;
        var vhost_app_link_loc = `${www_root}/${app_name}`;
        try {
            if (fs.existsSync(vhost_file_link_loc)) {
                fs.unlink(vhost_file_link_loc, (err1) => {
                    if (err1) {
                        resolve(false, `failed to remove vhost link ${vhost_file_link_loc}`);
                        throw err1;
                    }
                    if (fs.existsSync(vhost_file_location)) {
                        fs.unlink(vhost_file_location, (err2) => {
                            if (err2) {
                                resolve(false, `failed to remove vhost file ${vhost_file_location}`);
                                throw err2;
                            }
                            if (fs.existsSync(vhost_app_link_loc)) {
                                fs.unlink(vhost_app_link_loc, (err3) => {
                                    if (err3) {
                                        resolve(false, `failed to remove www app dir link ${vhost_app_link_loc}`);
                                        throw err3;
                                    }
                                    pm.apache_reload(resolve, "VHost removed");
                                });
                            }
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
    pull_app_code: (application_id, app_root, code, tail, resolve) => {
        app.log(`pulling repo for app ${application_id}`);
        if (app_root == '') return resolve(false, "No resource app root");
        if (code.repo == '') return resolve(false, "No app repo remote");
        if (!db.ecosystem.hasOwnProperty(application_id))
            return resolve(false, `App ${application_id} not in ecosystem`);
        app.log(`found application ${application_id}`);
        var app_ecosystem = db.ecosystem[application_id];
        var app_name = app_ecosystem.name;
        var app_repo_loc = `${app_root}/${app_name}`;
        var repo_name = code.repo.split('/');
        repo_name = repo_name[repo_name.length - 1];
        var output_log_path = path.join(app_ecosystem.cwd, app_ecosystem.out_file);
        var error_log_path = path.join(app_ecosystem.cwd, app_ecosystem.error_file);
        var app_repo_package_path = `${app_repo_loc}${code.path == '.' || code.path.trim() == '' ? '' : ('/' + code.path)}`;
        var package_command = "ls";
        var second_package_command = "";
        if (!fs.existsSync(app_root)) fs.mkdirSync(app_root);
        var _next = (resolve = null) => {
            app_ecosystem.cwd = `${app_repo_package_path}`;
            output_log_path = path.join(app_ecosystem.cwd, app_ecosystem.out_file);
            error_log_path = path.join(app_ecosystem.cwd, app_ecosystem.error_file);
            if (!fs.existsSync(`${output_log_path}`))
                fs.closeSync(fs.openSync(output_log_path, 'w'));
            var _next_again = _ => {
                var out_desc = fs.openSync(`${output_log_path}`, "a");
                var err_desc = out_desc;
                if (output_log_path != error_log_path) 
                    err_desc = fs.openSync(`${error_log_path}`, "a"); 
                if (fs.existsSync(`${path.join(app_repo_package_path, 'package.json')}`)) {
                    package_command = "npm install";
                    var package_full_json = JSON.parse(fs.readFileSync(`${path.join(app_repo_package_path, 'package.json')}`));
                    if (package_full_json.hasOwnProperty('scripts') && package_full_json.scripts.hasOwnProperty('build') && package_full_json.scripts.build != '')
                        second_package_command = "npm run build";
                }
                else if (fs.existsSync(`${path.join(app_repo_package_path, 'requirements.txt')}`)){
                    package_command = `python3 -m venv ${path.join(app_repo_package_path, 'venv')}`;
                    second_package_command = `${path.join(app_repo_package_path, 'venv/bin/python3')} -m pip install -r ${path.join(app_repo_package_path, 'requirements.txt')}`;
                }
                fs.appendFileSync(`${output_log_path}`, "=====DASH:PKG=====\n");
                fs.appendFileSync(`${output_log_path}`, `[dash] ${package_command}\n`);
                var package_command_process = cproc.spawn(package_command.split(' ')[0], package_command.split(' ').slice(1), {
                    cwd: `${app_repo_package_path}`,
                    stdio: [process.stdin, out_desc, err_desc]
                });
                var resolved = false;
                package_command_process.on('error', (error) => {
                    console.error(`error: ${error.message}`);
                    if (resolve && resolved === false) {
                        resolved = true;
                        resolve(false);
                    }
                });
                package_command_process.on('close', (code) => {
                    app.log(`package process exited: ${code}`);
                    fs.appendFileSync(`${output_log_path}`, `[dash] package process exited: ${code}\n`);
                    var _next_third = _ => {
                        fs.appendFileSync(`${output_log_path}`, "=====DASH:RDY=====\n");
                        // fs.appendFileSync(`${output_log_path}`, `[dash] application "${app_name}" code repository & package ready\n`);
                        if (resolve && resolved === false) {
                            resolved = true;
                            resolve(true);
                        }
                        setTimeout(_ => {
                            fs.closeSync(out_desc);
                            if (output_log_path != error_log_path)
                                fs.closeSync(err_desc);
                        }, 20);
                    };
                    if (second_package_command == '') _next_third();
                    else {
                        fs.appendFileSync(`${output_log_path}`, `[dash] ${second_package_command}\n`);
                        var second_package_command_process = cproc.spawn(second_package_command.split(' ')[0], second_package_command.split(' ').slice(1), {
                            cwd: `${app_repo_package_path}`,
                            stdio: [process.stdin, out_desc, err_desc]
                        });
                        second_package_command_process.on('error', (error) => {
                            console.error(`error: ${error.message}`);
                            if (resolve && resolved === false) {
                                resolved = true;
                                resolve(false);
                            }
                        });
                        second_package_command_process.on('close', (code) => {
                            app.log(`second package process exited: ${code}`);
                            fs.appendFileSync(`${output_log_path}`, `[dash] second package process exited: ${code}\n`);
                            _next_third();
                        });
                    }
                });
            };
            if (tail || pm.tail_process_context.hasOwnProperty(application_id)) 
                pm.tail_process(app_ecosystem, application_id, _ => {
                    setTimeout(_next_again, 100);
                });
            else _next_again();
        };
        var repo_alt = code.repo;
        if (repo_alt.includes('github.com'))
            repo_alt = repo_alt.replace('github.com', `${global.config.github_token}@github.com`);
        var log_ts = Date.now();
        var msg_a = "=====DASH:GIT=====";
        var msg_b = "";
        if (!fs.existsSync(app_repo_loc)) {
            app.log(`cloning repo "${repo_name}" for app "${app_name}" to location ${app_repo_loc}`);
            msg_b = `[dash] cloning repo "${repo_name}" into ${app_repo_loc}`;
            if (fs.existsSync(output_log_path)) {
                fs.appendFileSync(`${output_log_path}`, `${msg_a}\n`);
                fs.appendFileSync(`${output_log_path}`, `${msg_b}\n`);
            } else {
                app.ws.api.tail_application_stream(application_id, msg_a, log_ts);
                app.ws.api.tail_application_stream(application_id, msg_b, log_ts + 1);
            }
            var remote_source_name = 'origin';
            git()
                .clone(repo_alt, app_repo_loc, ['-b', `${code.branch}`, '--single-branch'])
                // .checkout(`${code.branch}`)
                // .checkoutBranch(`${code.branch}`)
                .then(result => {
                    _next(s => {
                        resolve(s, `<b>${app_name}</b> cloned`);
                    });
                })
                .catch(error => {
                    console.error(error);
                    resolve(false, `failed to clone to ${app_repo_loc}`);
                })
            ;
        } else {
            app.log(`syncing repo "${repo_name}" for app "${app_name}" to location ${app_repo_loc}`);
            msg_b = `[dash] syncing repo "${repo_name}" in ${app_repo_loc}`;
            if (fs.existsSync(output_log_path)) {
                fs.appendFileSync(`${output_log_path}`, `${msg_a}\n`);
                fs.appendFileSync(`${output_log_path}`, `${msg_b}\n`);
            } else {
                app.ws.api.tail_application_stream(application_id, msg_a, log_ts);
                app.ws.api.tail_application_stream(application_id, msg_b, log_ts + 1);
            }
            git(app_repo_loc)
                .pull(repo_alt)
                // .checkout(`${code.branch}`)
                // .checkoutBranch(`${code.branch}`)
                .then(result => {
                    _next(_ => {
                        resolve(true, `<b>${app_name}</b> synced`);
                    });
                })
                .catch(error => {
                    console.error(error);
                    resolve(false, `failed to sync to ${app_repo_loc}`);
                })
            ;
        }
        
    },
    remove_app_code: (application_id, app_root, code, resolve) => {
        app.log(`removing repo for app ${application_id}`);
        if (app_root == '') return resolve(false, "No resource app root");
        if (code.repo == '') return resolve(false, "No app repo remote");
        if (!db.ecosystem.hasOwnProperty(application_id))
            return resolve(false, `App ${application_id} not in ecosystem`);
        app.log(`found application ${application_id}`);
        var app_ecosystem = db.ecosystem[application_id];
        var app_name = app_ecosystem.name;
        var app_base_loc = `${app_root}/${app_name}`;
        if (!fs.existsSync(app_root)) return resolve(false, "No app root directory");
        if (!fs.existsSync(app_base_loc)) return resolve(true, "No repo directory");
        fs.rmdir(app_base_loc, { recursive: true }, (err1) => {
            if (err1) {
                resolve(false, `failed to remove directory ${app_base_loc}`);
                throw err1;
            }
            app.ws.api.tail_application_stream(application_id, "=====DASH:RM=====", Date.now());
            // app.ws.api.tail_application_stream(application_id, `[dash] application "${app_name}" code repository & package `, Date.now() + 1);
            resolve(true, `<b>${app_name}</b> removed`);
        });
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
            case 'vhost_config':
                var remove = data.hasOwnProperty('remove') && data.remove === true;
                if (remove) {
                    ws.log(`removing apache vhost config for application "${data.application}"`);
                    app.remove_vhost_config(data.application, data.apache_root, data.www_root, (success, message) => {
                        ws.api.vhost_config_respond(data.application, success, message);
                    });
                } else {
                    ws.log(`received apache vhost config for application "${data.application}"`);
                    app.process_vhost_config(data.application, data.apache_root, data.www_root, data.vhost_config, data.proxy_settings, (success, message) => {
                        ws.api.vhost_config_respond(data.application, success, message);
                    });
                }
                break;
            case 'application_repo':
                var remove = data.hasOwnProperty('remove') && data.remove === true;
                if (remove) {
                    ws.log(`removing application code repository for app "${data.application}"`);
                    app.remove_app_code(data.application, data.app_root, data.code, (success, message) => {
                        ws.api.pull_app_code_respond(data.application, success, message);
                    });
                } else {
                    ws.log(`pulling application code repository for app "${data.application}"`);
                    app.pull_app_code(data.application, data.app_root, data.code, data.tail, (success, message) => {
                        ws.api.pull_app_code_respond(data.application, success, message);
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
        vhost_config_respond: (application_id, success, message) => {
            ws.send('push_application_vhost_res_daemon', {
                application_id: application_id,
                success: success, message: message
            });
        },
        pull_app_code_respond: (application_id, success, message) => {
            ws.send('pull_application_repo_res_daemon', {
                application_id: application_id,
                success: success, message: message,
                updated_cwd: db.ecosystem[application_id] && db.ecosystem[application_id].cwd
            });
        },
        tail_application_stream: (application_id, log_line, now_ts, error = false) => {
            ws.send('tail_application_stream', {
                app_id: application_id,
                log_line: log_line,
                now_ts: now_ts,
                error: error
            }, global.config.log_tf_stream_log === false);
        },
        tail_application_stream_intro: (application_id, log_lines, error = false) => {
            // console.log(application_id, log_lines);
            ws.send('tail_application_stream_intro', {
                app_id: application_id,
                log_lines: log_lines,
                error: error
            }, global.config.log_tf_stream_log === false);
        },
        return_application_status: (application_id, success, status, timestamp) => {
            ws.send('return_application_status', {
                application_id: application_id,
                success: success, timestamp: timestamp,
                status: status
            });
        },
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
        pm2.delete(ecosystem.name, (error1, env1) => {
            if (error1) console.error(error1);
            // console.log('env1', env1);
            var status = "";
            if (!error1) status = "removed";
            pm2.start(ecosystem, (error2, env2) => {
                if (error2) console.error(error2);
                // console.log('env', env);
                if (!error2 && env2[0]) status = env2[0].pm2_env.status;
                ws.api.return_application_status(app_id, error2 == null, status, Date.now());
                if (resolve) resolve(error2 == null);
            });
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
        if (!fs.existsSync(output_log_path)) return;
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
            if (output_log_path != error_log_path) {
                if (!fs.existsSync(error_log_path)) {
                    if (resolve) resolve();
                }
                fs.readFile(error_log_path, 'utf8', (err2, data2) => {
                    if (err2) { console.error(err2); return; }
                    var lines = data2.split('\n');
                    var line_lim = lines.length - global.config.log_tf_load_lines;
                    if (line_lim < 0) line_lim = 0;
                    lines = lines.slice(line_lim);
                    ws.api.tail_application_stream_intro(`${app_id}_err`, lines.join('\n'), true);
                    pm.untail_process(ecosystem, `${app_id}_err`);
                    pm.tail_process_context[`${app_id}_err`] = new tf(error_log_path);
                    pm.tail_process_context[`${app_id}_err`]
                        .on('tail_error', (err2) => {
                            pm.error('error tailing file', err2);
                            throw err2;
                        })
                        .start()
                        .catch((err2) => {
                            console.error('error tailing file - cannot start, check file exists', err2);
                            throw err2;
                        });
                    pm.tail_process_context[`${app_id}_err`]
                        .pipe(split2())
                        .on('data', (line) => {
                            const now_ts = Date.now();
                            ws.api.tail_application_stream(app_id, line, now_ts, true);
                        });
                    if (resolve) resolve();
                });
            } else if (resolve) resolve();
        });
    },
    untail_process: (ecosystem, app_id, resolve = null) => {
        if (pm.tail_process_context.hasOwnProperty(app_id) && pm.tail_process_context[app_id] != null) {
            pm.tail_process_context[app_id].quit();
            pm.tail_process_context[app_id] = null;
            delete pm.tail_process_context[app_id];
        }
        var err_log_id = `${app_id}_err`;
        if (pm.tail_process_context.hasOwnProperty(err_log_id) && pm.tail_process_context[err_log_id] != null) {
            pm.tail_process_context[err_log_id].quit();
            pm.tail_process_context[err_log_id] = null;
            delete pm.tail_process_context[err_log_id];
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
    apache_reload: (resolve, msg) => {
        var reload_command = "sudo /usr/sbin/service apache2 reload";
        pm.log(`running command: \`${reload_command}\``);
        cproc.exec(`${reload_command}`, (error, stdout, stderr) => {
            if (error) { app.log(`error: ${error.message}`); return resolve(false, `Failed Apache2 reload: ${error.message}`); }
            if (stderr) { app.log(`stderr: ${stderr}`); return resolve(false `Failed Apache2 reload: ${stderr.toString()}`); }
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
        if (global.config['simple-git_log'] === true)
            debug.enable('simple-git,simple-git:*');
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