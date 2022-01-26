/* DASHBOARD */
// web client

var app = {
    ui: {
        block: Block('div', 'app'),
        colors: {
            primary: "rgba(20, 125, 252, 0.94)", //"rgba(0, 123, 255, 0.9)", // "rgba(67, 133, 243, 0.99)", // rgba(219, 43, 58, 0.85)
            background: "#f1f1f1"
        },
        display_modal: {
            disconnected: _ => {
                bootbox.confirm({
                    centerVertical: true,
                    title: "Disconnected",
                    message: "Refresh page?",
                    callback: (result) => {
                        if (result) window.location.reload();
                    }
                })
            },
            generic_confirm: (title, message, callback) => {
                bootbox.confirm({
                    centerVertical: true,
                    title: `<span class="modal_title">${title}</span>`,
                    message: (`${message}`),
                    callback: callback
                })
            },
            new_project: _ => {
                bootbox.confirm({
                    centerVertical: true,
                    title: '<span class="modal_title">Create Project</span>',
                    message: `<div id='new_project_display_modal'>` +
                        `<div style="margin: 3px 0;"><span class="modal_text_input_label">Name:</span>&nbsp;` +
                        `<input placeholder="Project Zero" class="modal_text_input" id="np_modal_name_input" type='text' name='np_modal_name'/></div>` +
                        `<div style="margin: 3px 0;"><span class="modal_text_input_label">Identifier:</span>&nbsp;` +
                        `<input placeholder="project-zero" class="modal_text_input" id="np_modal_slug_input" type='text' name='np_modal_slug'/></div>` +
                        `<div style="margin: 3px 0;"><span class="modal_text_input_label">Repository:</span>&nbsp;` +
                        `<input placeholder="https://github.com/u/project-zero" class="modal_text_input" id="np_modal_repo_input" type='text' name='np_modal_repo'/></div>` +
                        `<div style="margin: 3px 0;"><span class="modal_text_input_label">Description:</span>&nbsp;` +
                        `<input placeholder="Lorem ipsum dolor sit amet..." class="modal_text_input" id="np_modal_desc_input" type='text' name='np_modal_desc'/></div>` +
                        `<div style="height: 8px"></div></div>`,
                    callback: (result) => {
                        if (result) {
                            var slug = (`${$('#new_project_display_modal #np_modal_slug_input')[0].value}`).trim();
                            var name = (`${$('#new_project_display_modal #np_modal_name_input')[0].value}`).trim();
                            var repo = (`${$('#new_project_display_modal #np_modal_repo_input')[0].value}`).trim();
                            var desc = (`${$('#new_project_display_modal #np_modal_desc_input')[0].value}`).trim();
                            if (slug == "" || name == "") return false;
                            app.ws.api.new_project(slug, name, repo, desc);
                        }
                        return true;
                    }
                });
            },
            new_project_res: (message) => {
                bootbox.confirm({
                    centerVertical: true,
                    title: '<span class="modal_title">Create Project</span>',
                    message: (`${message}`),
                    callback: (result) => {
                        if (result) {
                            setTimeout(_ => {
                                app.ws.api.get_projects();
                            }, 100);
                            return true;
                        }
                    }
                })
            },
            edit_project_image: (id, url, invert) => {
                bootbox.confirm({
                    centerVertical: true,
                    title: '<span class="modal_title">Update Project</span>',
                    message: `<div id='update_project_img_display_modal'>` +
                        `<div style="margin: 3px 0;"><span class="modal_text_input_label">Image URL:</span>&nbsp;` +
                        `<input value='${url}' placeholder="/img/projects/project-zero.png" class="modal_text_input" id="up_modal_imgurl_input" type='text' name='up_modal_imgurl'/></div>` +
                        `<div style="margin: 3px 0;"><span class="modal_text_input_label">Invert BG:</span>&nbsp;` +
                        `<input ${invert ? 'checked' : ''} value='invert' style="margin-left: 5px; position: relative; top: 2px;" class="modal_checkbox_input" id="up_modal_invertbg_input" type='checkbox' name='up_modal_invertbg'/>` +
                        `<label for="up_modal_invertbg">&nbsp;&nbsp;&nbsp;Invert image when used as a background</label></div>` +
                        `<div style="height: 8px"></div></div>`,
                    callback: (result) => {
                        if (result) {
                            var img_url = (`${$('#update_project_img_display_modal #up_modal_imgurl_input')[0].value}`).trim();
                            var invert_bg = $('#update_project_img_display_modal #up_modal_invertbg_input')[0].checked;
                            app.ws.api.update_project(id, {
                                img: img_url,
                                img_invert: invert_bg
                            });
                        }
                        return true;
                    }
                });
            },
        },
        init: (callback) => {
            app.ui.block.fill(document.body);
            Block.queries();
            setTimeout(_ => {
                app.ui.block.css('opacity', '1');
                app.ui.block.on('ready');
                setTimeout(_ => {
                    window.componentHandler.upgradeDom();
                }, 100);
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
                app.ui.display_modal.disconnected();
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
            // auth
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
            },
            // projects
            get_projects: () => {
                app.ws.send('get_projects', {});
            },
            new_project: (slug, name, repo, desc) => {
                app.ws.send('new_project', {
                    slug: slug,
                    name: name,
                    repo: repo,
                    desc: desc
                });
            },
            star_project: (id) => {
                app.ws.send('star_project', {
                    id: id
                });
            },
            update_project: (id, update) => {
                app.ws.send('update_project', {
                    id: id,
                    update: update
                });
            },
            delete_project: (id) => {
                app.ws.send('delete_project', {
                    id: id
                });
            },
            // domains
            get_domains: () => {
                app.ws.send('get_domains', {});
            },
            // resources
            get_resources: () => {
                app.ws.send('get_resources', {});
            },
            // applications
            get_applications: () => {
                app.ws.send('get_applications', {});
            },
            // ideas
            get_ideas: () => {
                app.ws.send('get_ideas', {});
            },
        }
    },
    main: {
        init: _ => {
            console.clear();
            console.log("[main] loading...");
            setTimeout(_ => {
                app.ui.block.load(_ => {
                    app.ui.block.load(_ => {
                        console.log("[main] blocks loaded");
                        console.log("[main] socket connecting");
                        app.ws.connect(_ => {
                            app.ui.init(_ => {
                                console.log("[main] ready");
                                setTimeout(app.ws.api.cookie_login, 100);
                                setTimeout(app.main.test, app.main.test_delay)
                            });
                        });
                    }, 'app', 'jQuery');
                }, 'blocks', 'jQuery');
            }, 300);
        },
        test: _ => {
            console.log("[main] testing...");
            setTimeout(_ => {
                $('#manage_project_button_61f07dcc4dfe93526f26155f')[0].click();
            }, 300);
        },
        test_delay: 100,
    }
};

$(document).ready(app.main.init);