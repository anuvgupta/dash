/* DASHBOARD */
// web client

var app = {
    ui: {
        block: Block('div', 'app'),
        colors: {
            primary: "rgba(67, 133, 243, 0.99)", // rgba(219, 43, 58, 0.85)
            background: "#f1f1f1"
        },
        display_modal: {
            new_project: _ => {
                bootbox.confirm({
                    centerVertical: true,
                    title: '<span class="modal_title">New Project</span>',
                    message: `<div id='new_project_display_modal'>` +
                        // `<h3 style="padding-left: 5px;">New Project</h3>` +
                        `<div style="margin: 3px 0;"><span class="modal_text_input_label">ID:</span>&nbsp;` +
                        `<input placeholder="project-abc" class="modal_text_input id="np_modal_slug_input" type='text' name='np_modal_slug'/></div>` +
                        `<div style="margin: 3px 0;"><span class="modal_text_input_label">Name:</span>&nbsp;` +
                        `<input placeholder="Project ABC" class="modal_text_input id="np_modal_name_input" type='text' name='np_modal_name'/></div>` +
                        `<div style="margin: 3px 0;"><span class="modal_text_input_label">Name:</span>&nbsp;` +
                        `<input placeholder="Project ABC" class="modal_text_input id="np_modal_name_input" type='text' name='np_modal_name'/></div>` +
                        `<div style="height: 8px"></div></div>`,
                    callback: (result) => {
                        console.log(result);
                        if (result) {
                            var slug = (`${$('#new_project_display_modal #np_modal_slug_input')[0].value}`).trim();
                            var name = (`${$('#new_project_display_modal #np_modal_name_input')[0].value}`).trim();
                            var repo = (`${$('#new_project_display_modal #np_modal_repo_input')[0].value}`).trim();
                            if (slug == "" || name == "" || repo == "") return false;
                            // cont...
                            console.log(slug, name, repo);
                        }
                        return true;
                    }
                });
            }
        },
        init: (callback) => {
            app.ui.block.fill(document.body);
            Block.queries();
            setTimeout(_ => {
                app.ui.block.css('opacity', '1');
                app.ui.block.on('ready');
            }, 100);
            setTimeout(_ => {
                Block.queries();
                setTimeout(_ => {
                    Block.queries();
                }, 200);
            }, 50);
            callback();
        },
    },
    ws: {
        id: 0,
        socket: null,
        url:
            (location.protocol === 'https:'
                ? 'wss://'
                : 'ws://') +
            document.domain +
            (document.domain == 'localhost' ? ':8080' : ((location.protocol === 'https:' ? ':443' : ':80') + '/socket')),
        encode_msg: (e, d, a = "") => {
            return JSON.stringify({
                event: e,
                data: d,
                auth: a
            });
        },
        decode_msg: (m) => {
            try {
                m = JSON.parse(m);
            } catch (e) {
                console.log('[ws] invalid json ', e);
                m = null;
            }
            return m;
        },
        connect: callback => {
            var socket = new WebSocket(app.ws.url);
            socket.addEventListener('open', e => {
                console.log('[ws] socket connected');
                callback();
            });
            socket.addEventListener('error', e => {
                console.log('[ws] socket error ', e.data);
            });
            socket.addEventListener('message', e => {
                var d = app.ws.decode_msg(e.data);
                if (d != null) {
                    console.log('[ws] socket received:', d.event, d.data);
                    var data = {};
                    data[d.event] = d.data;
                    app.ui.block.data(data);
                } else {
                    console.log('[ws] socket received:', 'invalid message', e.data);
                }
            });
            socket.addEventListener('close', e => {
                console.log('[ws] socket disconnected');
                // alert('disconnected from server');
            });
            window.addEventListener('beforeunload', e => {
                // socket.close(1001);
            });
            app.ws.socket = socket;
        },
        send: (event, data, auth = true) => {
            var token = null;
            if (auth) token = app.ws.api.get_token_cookie();
            console.log('[ws] sending:', event, data, token);
            app.ws.socket.send(app.ws.encode_msg(event, data, token));
        },
        api: {
            cookie_login_flag: false,
            cookie_login: _ => {
                app.ws.api.cookie_login_flag = true;
                var token_cookie = app.ws.api.get_token_cookie();
                if (token_cookie != null) app.ws.send('auth', {}, true);
            },
            get_token_cookie: _ => {
                var token = util.cookie('token');
                if (token && token != null && (`${token}`).trim() != "")
                    return token;
                return null;
            },
            login: password => {
                util.sha256(`${password}`, hash => {
                    app.ws.send('sign_in', {
                        password: `${hash}`
                    }, false);
                    // util.cookie('token', `${token}`, '__indefinite__');
                });
            },
            logout: _ => {
                util.delete_cookie('token');
                window.location.reload();
            }
        }
    },
    main: {
        init: _ => {
            console.clear();
            console.log('[main] loading...');
            setTimeout(_ => {
                app.ui.block.load(_ => {
                    app.ui.block.load(_ => {
                        console.log('[main] blocks loaded');
                        console.log('[main] socket connecting');
                        app.ws.connect(_ => {
                            app.ui.init(_ => {
                                console.log('[main] ready');
                                setTimeout(app.ws.api.cookie_login, 100);
                            });
                        });
                    }, 'app', 'jQuery');
                }, 'blocks', 'jQuery');
            }, 300);
        }
    }
};

$(document).ready(app.main.init);