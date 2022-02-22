/* DASHBOARD */
// web client

var app = {
    ui: {
        block: Block('div', 'app'),
        colors: {
            primary: "rgba(20, 125, 252, 0.94)", //"rgba(0, 123, 255, 0.9)", // "rgba(67, 133, 243, 0.99)", // rgba(219, 43, 58, 0.85)
            background: "#f1f1f1",
            status: {
                new: "#dddddd",
                online: "rgba(85, 196, 110, 1)",
                offline: "rgba(237, 69, 61, 1)",
                desync: "#f7bb0a",
                override: "rgba(40, 124, 246, 1)",
                default: "#dddddd",
                stopped: "rgba(237, 69, 61, 1)",
                removed: "rgba(237, 69, 61, 1)",
            }
        },
        ui_interval: null,
        ui_interval_length: 5,
        run_ui_intervals: _ => {
            app.ui.block.child('main/content/projects/content').on('status_update');
            app.ui.block.child('main/content/resources/content').on('status_update');
            app.ui.block.child('main/content/resources/detail').on('status_update');
            app.ui.block.child('main/content/applications/detail').on('status_update');
        },
        register_ui_intervals: _ => {
            if (app.ui.ui_interval != null) clearInterval(app.ui.ui_interval);
            app.ui.ui_interval = setInterval(app.ui.run_ui_intervals, app.ui.ui_interval_length * 1000);
        },
        get_status_color: (status) => {
            if (app.ui.colors.status.hasOwnProperty(status))
                return app.ui.colors.status[status];
            return app.ui.colors.status.default;
        },
        display_modal: {
            disconnected: _ => {
                bootbox.hideAll();
                setTimeout(_ => {
                    bootbox.confirm({
                        centerVertical: true,
                        title: "Disconnected",
                        message: "Refresh page?",
                        callback: (result) => {
                            if (result) window.location.reload();
                        }
                    });
                }, 200);
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
            new_resource: _ => {
                bootbox.confirm({
                    centerVertical: true,
                    title: '<span class="modal_title">Create Resource</span>',
                    message: `<div id='new_resource_display_modal'>` +
                        `<div style="margin: 3px 0;"><span class="modal_text_input_label">Name:</span>&nbsp;` +
                        `<input placeholder="Resource Zero" class="modal_text_input" id="nr_modal_name_input" type='text' name='nr_modal_name'/></div>` +
                        `<div style="margin: 3px 0;"><span class="modal_text_input_label">Identifier:</span>&nbsp;` +
                        `<input placeholder="resource-zero" class="modal_text_input" id="nr_modal_slug_input" type='text' name='nr_modal_slug'/></div>` +
                        `<div style="margin: 3px 0;"><span class="modal_text_input_label">External IP:</span>&nbsp;` +
                        `<input placeholder="142.250.189.174" class="modal_text_input" id="nr_modal_ip_input" type='text' name='nr_modal_ip'/></div>` +
                        `<div style="margin: 3px 0;"><span class="modal_text_input_label">Console:</span>&nbsp;` +
                        `<input placeholder="https://console.aws.amazon.com/ec2/v2/home?..." class="modal_text_input" id="nr_modal_link_input" type='text' name='nr_modal_link'/></div>` +
                        `<div style="height: 8px"></div></div>`,
                    callback: (result) => {
                        if (result) {
                            var slug = (`${$('#new_resource_display_modal #nr_modal_slug_input')[0].value}`).trim();
                            var name = (`${$('#new_resource_display_modal #nr_modal_name_input')[0].value}`).trim();
                            var link = (`${$('#new_resource_display_modal #nr_modal_link_input')[0].value}`).trim();
                            var ip = (`${$('#new_resource_display_modal #nr_modal_ip_input')[0].value}`).trim();
                            if (slug == "" || name == "") return false;
                            app.ws.api.new_resource(slug, name, link, ip);
                        }
                        return true;
                    }
                });
            },
            new_resource_res: (message) => {
                bootbox.confirm({
                    centerVertical: true,
                    title: '<span class="modal_title">Create Resource</span>',
                    message: (`${message}`),
                    callback: (result) => {
                        if (result) {
                            setTimeout(_ => {
                                app.ws.api.get_resources();
                            }, 100);
                            return true;
                        }
                    }
                })
            },
            new_application: _ => {
                bootbox.confirm({
                    centerVertical: true,
                    title: '<span class="modal_title">Create Application</span>',
                    message: `<div id='new_application_display_modal'>` +
                        `<div style="margin: 3px 0;"><span class="modal_text_input_label">Name:</span>&nbsp;` +
                        `<input placeholder="Application Zero" class="modal_text_input" id="na_modal_name_input" type='text' name='na_modal_name'/></div>` +
                        `<div style="margin: 3px 0;"><span class="modal_text_input_label">Identifier:</span>&nbsp;` +
                        `<input placeholder="application-zero" class="modal_text_input" id="na_modal_slug_input" type='text' name='na_modal_slug'/></div>` +
                        `<div style="margin: 3px 0;"><span class="modal_text_input_label">Description:</span>&nbsp;` +
                        `<input placeholder="Lorem ipsum dolor sit amet..." class="modal_text_input" id="na_modal_desc_input" type='text' name='na_modal_desc'/></div>` +
                        `<div style="height: 8px"></div></div>`,
                    callback: (result) => {
                        if (result) {
                            var slug = (`${$('#new_application_display_modal #na_modal_slug_input')[0].value}`).trim();
                            var name = (`${$('#new_application_display_modal #na_modal_name_input')[0].value}`).trim();
                            var desc = (`${$('#new_application_display_modal #na_modal_desc_input')[0].value}`).trim();
                            if (slug == "" || name == "") return false;
                            app.ws.api.new_application(slug, name, desc);
                        }
                        return true;
                    }
                });
            },
            new_application_res: (message) => {
                bootbox.confirm({
                    centerVertical: true,
                    title: '<span class="modal_title">Create Application</span>',
                    message: (`${message}`),
                    callback: (result) => {
                        if (result) {
                            setTimeout(_ => {
                                app.ws.api.get_applications();
                            }, 100);
                            return true;
                        }
                    }
                })
            },
            associate_project_app: (project_id, apps_list = []) => {
                apps_list = apps_list.sort(util.sort_compare_newest_first);
                var apps_options = '';
                for (var a in apps_list)
                    apps_options += `<option value="${apps_list[a]._id}">${apps_list[a].name}</option>`;
                bootbox.confirm({
                    centerVertical: true,
                    title: '<span class="modal_title">Update Project</span>',
                    message: `<div id='update_project_display_modal'>` +
                        `<div style="margin: 3px 0;"><span class="modal_text_input_label">Application:</span>&nbsp;` +
                        `<select class="modal_select_input" id="up_modal_app_input" name='ip_modal_app'/>` +
                        `<option value="none" selected>None</option>` +
                        `${apps_options}` +
                        `</select</div><div style="height: 8px"></div></div>`,
                    callback: (result) => {
                        if (result) {
                            var new_app_id = (`${$('#update_project_display_modal #up_modal_app_input')[0].value}`).trim();
                            if (new_app_id == "" || new_app_id == "none") return false;
                            app.ws.api.associate_project_app(project_id, new_app_id);
                        }
                        return true;
                    }
                });
            },
            new_domain: _ => {
                bootbox.confirm({
                    centerVertical: true,
                    title: '<span class="modal_title">Create Domain</span>',
                    message: `<div id='create_domain_display_modal'>` +
                        `<div style="margin: 3px 0;"><span class="modal_text_input_label">Domain:</span>&nbsp;` +
                        `<input placeholder="domainzero.com" class="modal_text_input" id="cd_modal_domain_input" type='text' name='cd_modal_domain'/></div>` +
                        `<div style="height: 8px"></div></div>`,
                    callback: (result) => {
                        if (result) {
                            var domain = (`${$('#create_domain_display_modal #cd_modal_domain_input')[0].value}`).trim();
                            if (domain == "") return false;
                            app.ws.api.new_domain(domain);
                        }
                        return true;
                    }
                });
            },
            new_domain_res: (message) => {
                bootbox.confirm({
                    centerVertical: true,
                    title: '<span class="modal_title">Create Domain</span>',
                    message: (`${message}`),
                    callback: (result) => {
                        if (result) {
                            setTimeout(_ => {
                                app.ws.api.get_domains();
                            }, 100);
                            return true;
                        }
                    }
                })
            },
            associate_resource_domain: (resource_id, domains_list = []) => {
                domains_list = domains_list.sort(util.sort_compare_newest_first);
                var domains_options = '';
                for (var d in domains_list)
                    domains_options += `<option value="${domains_list[d]._id}">${domains_list[d].domain}</option>`;
                bootbox.confirm({
                    centerVertical: true,
                    title: '<span class="modal_title">Update Resource</span>',
                    message: `<div id='update_resource_display_modal'>` +
                        `<div style="margin: 3px 0;"><span class="modal_text_input_label">Domain:</span>&nbsp;` +
                        `<select class="modal_select_input" id="ur_modal_domain_input" name='ur_modal_domain'/>` +
                        `<option value="none" selected>None</option>` +
                        `${domains_options}` +
                        `</select</div><div style="height: 8px"></div></div>`,
                    callback: (result) => {
                        if (result) {
                            var new_domain_id = (`${$('#update_resource_display_modal #ur_modal_domain_input')[0].value}`).trim();
                            if (new_domain_id == "" || new_domain_id == "none") return false;
                            app.ws.api.associate_resource_domain(resource_id, new_domain_id);
                        }
                        return true;
                    }
                });
            },
            associate_application_domain: (application_id, domains_list = []) => {
                domains_list = domains_list.sort(util.sort_compare_newest_first);
                var domains_options = '';
                for (var d in domains_list)
                    domains_options += `<option value="${domains_list[d]._id}">${domains_list[d].domain}</option>`;
                bootbox.confirm({
                    centerVertical: true,
                    title: '<span class="modal_title">Update Application</span>',
                    message: `<div id='update_application_display_modal'>` +
                        `<div style="margin: 3px 0;"><span class="modal_text_input_label">Domain:</span>&nbsp;` +
                        `<select class="modal_select_input" id="ua_modal_domain_input" name='ua_modal_domain'/>` +
                        `<option value="none" selected>None</option>` +
                        `${domains_options}` +
                        `</select</div><div style="height: 8px"></div></div>`,
                    callback: (result) => {
                        if (result) {
                            var new_domain_id = (`${$('#update_application_display_modal #ua_modal_domain_input')[0].value}`).trim();
                            if (new_domain_id == "" || new_domain_id == "none") return false;
                            app.ws.api.associate_application_domain(application_id, new_domain_id);
                        }
                        return true;
                    }
                });
            },
        },
        display_cert_renewal_info: _ => {
            
        },
        init: (callback) => {
            app.ui.block.fill(document.body);
            Block.queries();
            setTimeout(_ => {
                app.ui.block.css('opacity', '1');
                app.ui.block.on('ready');
                setTimeout(app.ui.register_ui_intervals, 50);
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
            (document.domain == 'localhost' ? ':3001' : ((location.protocol === 'https:' ? ':443' : ':80') + '/socket')),
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
            associate_project_app: (project_id, application_id) => {
                app.ws.send('associate_project_application', {
                    project_id: project_id,
                    application_id: application_id
                });
            },
            deassociate_project_app: (project_id, application_id) => {
                app.ws.send('deassociate_project_application', {
                    project_id: project_id,
                    application_id: application_id
                });
            },
            link_project_demo: (project_id, application_id) => {
                app.ws.send('link_project_demo', {
                    project_id: project_id,
                    application_id: application_id
                });
            },
            update_project_tech: (project_id, tech_item, tech_section) => {
                app.ws.send('update_project_tech', {
                    id: project_id, tech_item: tech_item, tech_section: tech_section
                });
            },
            remove_project_tech: (project_id, tech_item, tech_section) => {
                app.ws.send('remove_project_tech', {
                    id: project_id, tech_item: tech_item, tech_section: tech_section
                });
            },
            // domains
            get_domains: (launch = null, associate_resource = null, associate_application = null) => {
                var data = {};
                if (launch != null) data.launch = launch;
                if (associate_resource != null) data.associate_resource = associate_resource;
                if (associate_application != null) data.associate_application = associate_application;
                app.ws.send('get_domains', data);
            },
            new_domain: (domain) => {
                app.ws.send('new_domain', {
                    domain: domain
                });
            },
            update_domain: (id, update) => {
                app.ws.send('update_domain', {
                    id: id,
                    update: update
                });
            },
            delete_domain: (id) => {
                app.ws.send('delete_domain', {
                    id: id
                });
            },
            update_domain_subdomains: (id, new_subdomain) => {
                app.ws.send('update_domain_subdomains', {
                    id: id, new_subdomain: new_subdomain
                });
            },
            remove_domain_subdomain: (id, remove_subdomain) => {
                app.ws.send('remove_domain_subdomain', {
                    id: id, remove_subdomain: remove_subdomain
                });
            },
            add_domain_certificate: (id) => {
                app.ws.send('add_domain_certificate', {
                    id: id,
                });
            },
            remove_domain_certificate: (id, cert_idx) => {
                app.ws.send('remove_domain_certificate', {
                    id: id, cert_index: cert_idx
                });
            },
            update_domain_certificate: (id, cert_idx, update) => {
                app.ws.send('update_domain_certificate', {
                    id: id, cert_idx: cert_idx, update: update
                });
            },
            // resources
            get_resources: () => {
                app.ws.send('get_resources', {});
            },
            get_resource: (id) => {
                app.ws.send('get_resource', {
                    id: id,
                });
            },
            new_resource: (slug, name, link, ip) => {
                app.ws.send('new_resource', {
                    slug: slug,
                    name: name,
                    link: link,
                    ip: ip
                });
            },
            update_resource: (id, update) => {
                app.ws.send('update_resource', {
                    id: id,
                    update: update
                });
            },
            delete_resource: (id) => {
                app.ws.send('delete_resource', {
                    id: id
                });
            },
            associate_resource_domain: (resource_id, domain_string) => {
                app.ws.send('associate_resource_domain', {
                    resource_id: resource_id,
                    domain_string: domain_string
                });
            },
            deassociate_resource_domain: (resource_id, domain_string) => {
                app.ws.send('deassociate_resource_domain', {
                    resource_id: resource_id,
                    domain_string: domain_string
                });
            },
            // applications
            get_applications: (launch = null, associate = null) => {
                var data = {};
                if (launch != null) data.launch = launch;
                if (associate != null) data.associate = associate;
                app.ws.send('get_applications', data);
            },
            new_application: (slug, name, desc, ip) => {
                app.ws.send('new_application', {
                    slug: slug,
                    name: name,
                    description: desc
                });
            },
            update_application: (id, update) => {
                app.ws.send('update_application', {
                    id: id,
                    update: update
                });
            },
            delete_application: (id) => {
                app.ws.send('delete_application', {
                    id: id
                });
            },
            signal_application: (id, signal) => {
                app.ws.send('signal_application', {
                    id: id,
                    signal: signal
                });
            },
            get_application_status: (id) => {
                app.ws.send('get_application_status', {
                    id: id,
                });
            },
            associate_application_domain: (application_id, domain_string) => {
                app.ws.send('associate_application_domain', {
                    application_id: application_id,
                    domain_string: domain_string
                });
            },
            deassociate_application_domain: (application_id, domain_string) => {
                app.ws.send('deassociate_application_domain', {
                    application_id: application_id,
                    domain_string: domain_string
                });
            },
            push_application_proxy: (id) => {
                app.ws.send('push_application_proxy', {
                    id: id,
                });
            },
            remove_application_proxy: (id) => {
                app.ws.send('push_application_proxy', {
                    id: id,
                    remove: true
                });
            },
            pull_application_repo: id => {
                 app.ws.send('pull_application_repo', {
                    id: id,
                });
            },
            remove_application_repo: (id) => {
                app.ws.send('pull_application_repo', {
                    id: id,
                    remove: true
                });
            },
            // ideas
            get_ideas: () => {
                app.ws.send('get_ideas', {});
            },
            // sitemap
            get_sitemap: () => {
                app.ws.send('get_sitemap', {});
            }
        }
    },
    main: {
        config: {},
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
            }, 10);
        },
        test: _ => {
            console.log("[main] testing...");
            setTimeout(_ => {
                // $('#manage_project_button_62044d639dedbb1fda4748a0')[0].click();

                // app.ui.block.child('main/menu/applications').node().click();
                // setTimeout(_ => {
                //     $('#manage_application_button_6213eb0c1ba7767605cc7483')[0].click();
                // }, 300);

                // app.ui.block.child('main/menu/domains').node().click();
                // setTimeout(_ => {
                //     $('#manage_domain_button_62084a7ddb1f7411ede8d588')[0].click();
                // }, 300);
            }, 200);
        },
        test_delay: 100,
    }
};

$(document).ready(app.main.init);