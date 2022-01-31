/* DASHBOARD */
// project dashboard – resource daemon

/* IMPORTS */
const fs = require("fs");
const path = require("path");
const websocket = require("ws");
const readline = require("readline");
const body_parser = require("body-parser");

/* ENVIRONMENT */
global.args = process.argv.slice(2);
global.env = global.args[0] == "prod" ? "prod" : "dev";
global.config = JSON.parse(fs.readFileSync('./config-daemon.json', { encoding: 'utf8', flag: 'r' }));

/* MODULES */
// TODO: process management, ws client, report heartbeats

// utilities
const utils = {
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
            args.unshift(`[${module}]`);
            target = err ? console.error : console.log;
            target.apply(null, args);
        }
    },
};

// main class
const app = {

    // constants
    config: global.config,
    name: "dash resource daemon",
    secure: global.config.secure,

    // main method
    main: _ => {
        // console.log(`${app.name.toUpperCase()}`);
        utils.delay(_ => {
            app.log("initializing");
            // web.init(_ => {
            ws.init(_ => {
                app.log("ready");
            });
            // });
        }, 50);
    },
    // module infra
    ws: null, web: null,
    link: resolve => {
        app.ws = ws;  // app.web = web;
        if (resolve) resolve();
    },
    log: utils.logger('main'),
    err: utils.logger('main', true),
    exit: resolve => {
        app.log("exit");
        app.ws.exit(_ => {
            // app.web.exit(_ => {
            if (resolve) resolve();
            process.exit(e);
            // });
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
                } else {
                    ws.err("failed to identify with dash cloud");
                }
                break;
            case 'phue_gateway_req':
                // ws.api.handle_phue_gateway_req(data.id, data.request);
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
            ws.send('hb_daemon', {});
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
            ws.log("socket error ", e.message);
        });
        ws.socket.addEventListener('message', e => {
            var d = ws.decode_msg(e.data);
            if (d != null) {
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
// modules.utils.delay(modules.main.main, 500);

// entry point
app.link(app.main);