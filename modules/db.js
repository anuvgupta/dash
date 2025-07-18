/* MODULE – DATABASE */
// database API wrapper

/* IMPORTS */
const mongodb = require('mongodb');

/* INFRA */
var m = null;
var log = null;
var err = null;



/* MODULE */
var mongo_port = null;
var mongo_dbname = null;
var mongo_client = null;
var mongo_api = null;
var mongo_oid = mongodb.ObjectId;
var init = _ => { };
var api = {
    // projects
    create_project: (slug, name, repo, desc, public, resolve) => {
        const timestamp = Date.now();
        mongo_api.collection('project').insertOne({
            slug: slug,
            name: name,
            repo: repo,
            docs: '',
            public: public,
            img: null,
            img_invert: false,  // why was this missing? take it out again if needed
            icon: null,
            featured: false,
            applications: [],
            link: '',
            demo_pass: '',
            demo_pass_show: false,
            major: false,
            complete: false,
            type: 'none',
            platform: 'none',
            category: 'none',
            purpose: 'none',
            tech: {
                primary: [],
                secondary: [],
                languages: []
            },
            tagline: (`${desc.split(' ').splice(0, 5).join(' ')}...`),
            description: desc,
            ts_created: timestamp,
            ts_updated: timestamp,
        }, (e, result1) => {
            if (e) {
                err(`error creating project with name ${domain}`, e.message ? e.message : e);
                resolve(false, e);
            } else resolve(true, result1.insertedId);
        });
    },
    get_project: (id, slug, resolve) => {
        var _find = {};
        if (id != null) _find['_id'] = mongo_oid(id);
        else if (slug != null) _find['slug'] = slug;
        else {
            err("get_project requires either id or slug");
            return resolve(false, { message: "get_project requires either id or slug" });
        }
        mongo_api.collection('project').findOne(_find, (e, result1) => {
            if (e) {
                err(`error finding project ${id} | ${slug}`, e.message ? e.message : e);
                resolve(false, e);
            } else {
                if (result1) resolve(true, result1);
                else resolve(null, result1);
            }
        });
    },
    get_projects: (resolve) => {
        mongo_api.collection('project').find({}).toArray((e, result1) => {
            if (e) {
                err("error finding projects", e.message ? e.message : e);
                resolve(false, e);
            } else {
                if (result1) resolve(true, result1);
                else resolve(null, result1);
            }
        });
    },
    delete_project_by_identifier: (id, slug, resolve) => {
        var _find = {};
        if (id != null) _find['_id'] = mongo_oid(id);
        else if (slug != null) _find['slug'] = slug;
        else return resolve(false, { message: "delete_project requires either id or slug" });
        mongo_api.collection('project').deleteOne(_find, (e, result1) => {
            if (e) {
                err(`error deleting project ${id} | ${slug}`, e.message ? e.message : e);
                resolve(false, e);
            } else resolve(result1.deletedCount == 1, result1);
        });
    },
    update_project: (id, update, resolve) => {
        var ts_now = (new Date()).getTime();
        mongo_api.collection('project').findOne({ _id: mongo_oid(id) }, (e, result1) => {
            if (e) {
                err(`error finding project ${id}`, e.message ? e.message : e);
                resolve(false, e);
            } else {
                if (!result1) resolve(null, result1);
                else {
                    if (!update.hasOwnProperty('ts_updated')) {
                        update.ts_updated = ts_now;
                    }
                    mongo_api.collection('project').updateOne({ _id: mongo_oid(id) }, {
                        $set: update
                    }, (e2, result2) => {
                        if (e2) {
                            err(`error updating project ${id}`, e2.message ? e2.message : e2);
                            resolve(false, e2);
                        } else {
                            mongo_api.collection('project').findOne({ _id: mongo_oid(id) }, (e3, result3) => {
                                if (e3) {
                                    err(`error finding project ${id} after update`, e3.message ? e3.message : e3);
                                    resolve(false, e3);
                                } else {
                                    if (!result3) resolve(null, result3);
                                    else resolve(true, result3);
                                }
                            });
                        }
                    });
                }
            }
        });
    },
    delete_project: (id, resolve) => {
        mongo_api.collection('project').deleteOne({ _id: mongo_oid(id) }, (e, coll1) => {
            if (e) {
                err(`error finding project ${id}`, e.message ? e.message : e);
                resolve(false, e);
            } else {
                if (!coll1 || coll1.result.n != 1)
                    resolve(null, coll1);
                else resolve(true, coll1);
            }
        });
    },
    toggle_star_project: (id, resolve) => {
        var ts_now = (new Date()).getTime();
        mongo_api.collection('project').findOne({ _id: mongo_oid(id) }, (e, result1) => {
            if (e) {
                err(`error finding project ${id}`, e.message ? e.message : e);
                resolve(false, e);
            } else {
                if (!result1) resolve(null, result1);
                else {
                    var new_val = !(result1.featured);
                    mongo_api.collection('project').updateOne({ _id: mongo_oid(id) }, {
                        $set: {
                            featured: new_val,
                            ts_updated: ts_now
                        }
                    }, (e2, result2) => {
                        if (e2) {
                            err(`error toggling star for project ${id}`, e2.message ? e2.message : e2);
                            resolve(false, e2);
                        } else {
                            resolve(true, new_val);
                        }
                    });
                }
            }
        });
    },
    project_summary: (resolve) => {
        mongo_api.collection('project').find({
            public: true,
        }).toArray((e, result1) => {
            if (e) {
                err("error summarizing projects", e.message ? e.message : e);
                resolve(false, e);
            } else {
                if (result1) {
                    //console.log(result1);
                    var app_ids = [];
                    for (var p in result1)
                        app_ids = app_ids.concat(result1[p].applications);
                    for (var a in app_ids)
                        app_ids[a] = mongo_oid(app_ids[a]);
                    mongo_api.collection('application').find({
                        _id: { $in: app_ids },
                    }).toArray((e2, result2) => {
                        //console.log(result2);
                        if (e2) {
                            err("error summarizing projects - retrieving applications", e2.message ? e2.message : e2);
                            resolve(false, e2);
                        } else {
                            if (result2) {
                                resolve(true, {
                                    projects: result1,
                                    applications: result2
                                });
                            } else resolve(null, result2);
                        }
                    });
                } else resolve(null, result2);
            }
        });
    },
    // domains
    create_domain: (domain, sld, tld, resolve) => {
        // domain/full name (google.com), second-level domain (google), tld (com)
        const timestamp = Date.now();
        mongo_api.collection('domain').insertOne({
            domain: domain,
            twoLevel: sld,
            topLevel: tld,
            subdomains: [],
            certificates: [],
            ts_created: timestamp,
            ts_updated: timestamp
        }, (e, result1) => {
            if (e) {
                err(`error creating domain with name ${domain}`, e.message ? e.message : e);
                resolve(false, e);
            } else resolve(true, result1.insertedId);
        });
    },
    get_domain: (id, domain, resolve) => {
        var _find = {};
        if (id != null) _find['_id'] = mongo_oid(id);
        else if (domain != null) _find['domain'] = domain;
        else return resolve(false, { message: "get_domain requires either id or domain" });
        mongo_api.collection('domain').findOne(_find, (e, result1) => {
            if (e) {
                err(`error finding domain ${id} | ${domain}`, e.message ? e.message : e);
                resolve(false, e);
            } else {
                if (result1) resolve(true, result1);
                else resolve(null, result1);
            }
        });
    },
    get_domains: (resolve) => {
        mongo_api.collection('domain').find({}).toArray((e, result1) => {
            if (e) {
                err("error finding domains", e.message ? e.message : e);
                resolve(false, e);
            } else {
                if (result1) resolve(true, result1);
                else resolve(null, result1);
            }
        });
    },
    get_domains_by_ids: (ids, resolve) => {
        for (var i in ids) ids[i] = mongo_oid(ids[i]);
        mongo_api.collection('domain').find({
            _id: { $in: ids }
        }).toArray((e, result1) => {
            if (e) {
                err("error finding domains", e.message ? e.message : e);
                resolve(false, e);
            } else {
                if (result1) resolve(true, result1);
                else resolve(null, result1);
            }
        });
    },
    update_domain: (id, update, resolve) => {
        var ts_now = (new Date()).getTime();
        mongo_api.collection('domain').findOne({ _id: mongo_oid(id) }, (e, result1) => {
            if (e) {
                err(`error finding domain ${id}`, e.message ? e.message : e);
                resolve(false, e);
            } else {
                if (!result1) resolve(null, result1);
                else {
                    if (!update.hasOwnProperty('ts_updated')) {
                        update.ts_updated = ts_now;
                    }
                    mongo_api.collection('domain').updateOne({ _id: mongo_oid(id) }, {
                        $set: update
                    }, (e2, result2) => {
                        if (e2) {
                            err(`error updating domain ${id}`, e2.message ? e2.message : e2);
                            resolve(false, e2);
                        } else {
                            mongo_api.collection('domain').findOne({ _id: mongo_oid(id) }, (e3, result3) => {
                                if (e3) {
                                    err(`error finding domain ${id} after update`, e3.message ? e3.message : e3);
                                    resolve(false, e3);
                                } else {
                                    if (!result3) resolve(null, result3);
                                    else resolve(true, result3);
                                }
                            });
                        }
                    });
                }
            }
        });
    },
    delete_domain: (id, domain, resolve) => {
        var _find = {};
        if (id != null) _find['_id'] = mongo_oid(id);
        else if (domain != null) _find['domain'] = domain;
        else return resolve(false, { message: "delete_domain requires either id or domain" });
        mongo_api.collection('domain').deleteOne(_find, (e, result1) => {
            if (e) {
                err(`error deleting domain ${id} | ${domain}`, e.message ? e.message : e);
                resolve(false, e);
            } else resolve(result1.deletedCount == 1, result1);
        });
    },
    // resources
    create_resource: (slug, name, link, ip, resolve) => {
        const timestamp = Date.now();
        mongo_api.collection('resource').insertOne({
            slug: slug,
            name: name,
            link: link,
            ip: ip,
            provider: "none",
            type: "none",
            private_ip: "",
            daemon_key: m.utils.rand_id(5),
            specs: {
                cpu: 0,
                memory: 0,
                storage: 0,
                location: "",
            },
            software: {
                app_root: "",
                nginx_root: "",
                apache_root: "",
                www_root: "",
                nginx_port: "",
                apache_port: "",
            },
            primary_domain: '',
            domains: [],
            status: "new",
            status_time: -1,
            ts_created: timestamp,
            ts_updated: timestamp,
        }, (e, result1) => {
            if (e) {
                err(`error creating resource with name ${name}`, e.message ? e.message : e);
                resolve(false, e);
            } else resolve(true, result1.insertedId);
        });
    },
    get_resource: (id, slug, resolve) => {
        var _find = {};
        if (id != null) _find['_id'] = mongo_oid(id);
        else if (slug != null) _find['slug'] = slug;
        else return resolve(false, { message: "get_resource requires either id or slug" });
        mongo_api.collection('resource').findOne(_find, (e, result1) => {
            if (e) {
                err(`error finding resource ${id} | ${slug}`, e.message ? e.message : e);
                resolve(false, e);
            } else {
                if (result1) resolve(true, result1);
                else resolve(null, result1);
            }
        });
    },
    get_resources: (resolve) => {
        mongo_api.collection('resource').find({}).toArray((e, result1) => {
            if (e) {
                err("error finding resources", e.message ? e.message : e);
                resolve(false, e);
            } else {
                if (result1) resolve(true, result1);
                else resolve(null, result1);
            }
        });
    },
    get_resources_by_primary_domain: (domain_id, resolve) => {
        mongo_api.collection('resource').find({
            primary_domain: { $regex: `${domain_id}` }
        }).toArray((e, result1) => {
            if (e) {
                err("error finding resources", e.message ? e.message : e);
                resolve(false, e);
            } else {
                if (result1) resolve(true, result1);
                else resolve(null, result1);
            }
        });
    },
    get_resources_by_domain: (domain_id, resolve) => {
        mongo_api.collection('resource').find({
            domains: { $regex: `${domain_id}` }
        }).toArray((e, result1) => {
            if (e) {
                err("error finding resources", e.message ? e.message : e);
                resolve(false, e);
            } else {
                if (result1) resolve(true, result1);
                else resolve(null, result1);
            }
        });
    },
    get_resource_by_key: (daemon_key, resolve) => {
        mongo_api.collection('resource').findOne({
            daemon_key: daemon_key
        }, (e, result1) => {
            if (e) {
                err(`error finding resource by key "${daemon_key}"`, e.message ? e.message : e);
                resolve(false, e);
            } else {
                if (result1) resolve(true, result1);
                else resolve(null, result1);
            }
        });
    },
    get_online_resources: (resolve) => {
        mongo_api.collection('resource').find({
            status: {
                $in: ['online', 'desync']
            }
        }).toArray((e, result1) => {
            if (e) {
                err("error finding resources", e.message ? e.message : e);
                resolve(false, e);
            } else {
                if (result1) resolve(true, result1);
                else resolve(null, result1);
            }
        });
    },
    update_resource: (id, update, resolve) => {
        var ts_now = (new Date()).getTime();
        mongo_api.collection('resource').findOne({ _id: mongo_oid(id) }, (e, result1) => {
            if (e) {
                err(`error finding resource ${id}`, e.message ? e.message : e);
                resolve(false, e);
            } else {
                if (!result1) resolve(null, result1);
                else {
                    if (!update.hasOwnProperty('ts_updated')) {
                        update.ts_updated = ts_now;
                    }
                    mongo_api.collection('resource').updateOne({ _id: mongo_oid(id) }, {
                        $set: update
                    }, (e2, result2) => {
                        if (e2) {
                            err(`error updating resource ${id}`, e2.message ? e2.message : e2);
                            resolve(false, e2);
                        } else {
                            mongo_api.collection('resource').findOne({ _id: mongo_oid(id) }, (e3, result3) => {
                                if (e3) {
                                    err(`error finding resource ${id} after update`, e3.message ? e3.message : e3);
                                    resolve(false, e3);
                                } else {
                                    if (!result3) resolve(null, result3);
                                    else resolve(true, result3);
                                }
                            });
                        }
                    });
                }
            }
        });
    },
    delete_resource: (id, slug, resolve) => {
        var _find = {};
        if (id != null) _find['_id'] = mongo_oid(id);
        else if (slug != null) _find['slug'] = slug;
        else return resolve(false, { message: "delete_resource requires either id or slug" });
        mongo_api.collection('resource').deleteOne(_find, (e, result1) => {
            if (e) {
                err(`error deleting resource ${id} | ${slug}`, e.message ? e.message : e);
                resolve(false, e);
            } else resolve(result1.deletedCount == 1, result1);
        });
    },
    set_resource_status: (resource_id, status_text, status_time, resolve) => {
        mongo_api.collection('resource').updateOne({ _id: mongo_oid(resource_id) }, {
            $set: {
                status: status_text,
                status_time: status_time !== null ? status_time : (new Date()).getTime()
            }
        }, (error1, result1) => {
            if (error1) {
                err(`error - update resource status for resource ${resource_id}`, error1);
                resolve(false);
            } else {
                if (result1.matchedCount < 1) {
                    err(`error - update resource status for resource ${resource_id} (not found)`);
                    resolve(false);
                } else resolve(result1);
            }
        });
    },
    update_resource_status: (resource_ids, status, resolve) => {
        mongo_api.collection('resource').updateMany({ _id: { $in: resource_ids } }, { $set: { status: status } }, (error1, result1) => {
            if (error1) {
                err(`failed to update resource status to ${status} for resources ${resource_ids}`, error1);
                if (resolve) resolve(false, error1);
            } else {
                if (resolve) resolve(true, result1);
            }
        });
    },
    // applications
    create_application: (slug, name, description, resolve) => {
        const timestamp = Date.now();
        mongo_api.collection('application').insertOne({
            slug: slug,
            name: name,
            description: description,
            host: "none",
            port: "",
            code: {
                repo: "",
                branch: "",
                path: ""
            },
            environment: {},
            ecosystem: {
                name: `${slug}`,
                script: "",
                cwd: "",
                static_dir: "",
                error_file: `${slug}.log`,
                out_file: `${slug}.log`,
                interpreter: "",
                args: "",
                max_memory_restart: "100M",
                restart_delay: "3000",
                cluster_mode: true
            },
            proxy: {
                enable: false,
                path: "",
                www: false,
                htaccess_deny: false,
                https_enable: false,
                https_force: false,
                ws_enable: false,
                ws_enable_path: "socket",
                nginx_config_export: "",
                apache_vhost: false
            },
            primary_domain: '',
            domains: [],
            memory: 0,
            status: "new",
            status_time: -1,
            ts_created: timestamp,
            ts_updated: timestamp,
        }, (e, result1) => {
            if (e) {
                err(`error creating application with name ${name}`, e.message ? e.message : e);
                resolve(false, e);
            } else resolve(true, result1.insertedId);
        });
    },
    get_application: (id, slug, resolve) => {
        var _find = {};
        if (id != null) _find['_id'] = mongo_oid(id);
        else if (slug != null) _find['slug'] = slug;
        else return resolve(false, { message: "get_application requires either id or slug" });
        mongo_api.collection('application').findOne(_find, (e, result1) => {
            if (e) {
                err(`error finding application ${id} | ${slug}`, e.message ? e.message : e);
                resolve(false, e);
            } else {
                if (result1) resolve(true, result1);
                else resolve(null, result1);
            }
        });
    },
    get_applications: (resolve) => {
        mongo_api.collection('application').find({}).toArray((e, result1) => {
            if (e) {
                err("error finding applications", e.message ? e.message : e);
                resolve(false, e);
            } else {
                if (result1) resolve(true, result1);
                else resolve(null, result1);
            }
        });
    },
    get_applications_by_primary_domain: (domain_id, resolve) => {
        mongo_api.collection('application').find({
            primary_domain: { $regex: `${domain_id}` }
        }).toArray((e, result1) => {
            if (e) {
                err("error finding applications", e.message ? e.message : e);
                resolve(false, e);
            } else {
                if (result1) resolve(true, result1);
                else resolve(null, result1);
            }
        });
    },
    get_applications_by_domain: (domain_id, resolve) => {
        mongo_api.collection('application').find({
            domains: { $regex: `${domain_id}` }
        }).toArray((e, result1) => {
            if (e) {
                err("error finding applications", e.message ? e.message : e);
                resolve(false, e);
            } else {
                if (result1) resolve(true, result1);
                else resolve(null, result1);
            }
        });
    },
    update_application: (id, update, resolve) => {
        var ts_now = (new Date()).getTime();
        mongo_api.collection('application').findOne({ _id: mongo_oid(id) }, (e, result1) => {
            if (e) {
                err(`error finding application ${id}`, e.message ? e.message : e);
                resolve(false, e);
            } else {
                if (!result1) resolve(null, result1);
                else {
                    if (update.hasOwnProperty('slug'))
                        update['ecosystem.name'] = `${update.slug}`;
                    if (!update.hasOwnProperty('ts_updated'))
                        update.ts_updated = ts_now;
                    mongo_api.collection('application').updateOne({ _id: mongo_oid(id) }, {
                        $set: update
                    }, (e2, result2) => {
                        if (e2) {
                            err(`error updating application ${id}`, e2.message ? e2.message : e2);
                            resolve(false, e2);
                        } else {
                            mongo_api.collection('application').findOne({ _id: mongo_oid(id) }, (e3, result3) => {
                                if (e3) {
                                    err(`error finding application ${id} after update`, e3.message ? e3.message : e3);
                                    resolve(false, e3);
                                } else {
                                    if (!result3) resolve(null, result3);
                                    else resolve(true, result3);
                                }
                            });
                        }
                    });
                }
            }
        });
    },
    delete_application: (id, slug, resolve) => {
        var _find = {};
        if (id != null) _find['_id'] = mongo_oid(id);
        else if (slug != null) _find['slug'] = slug;
        else return resolve(false, { message: "delete_application requires either id or slug" });
        mongo_api.collection('application').deleteOne(_find, (e, result1) => {
            if (e) {
                err(`error deleting application ${id} | ${slug}`, e.message ? e.message : e);
                resolve(false, e);
            } else resolve(result1.deletedCount == 1, result1);
        });
    },
    get_daemon_ecosystem: (resource_id, get_environment, resolve) => {
        mongo_api.collection('application').find({
            host: resource_id
        }).toArray((e, result1) => {
            if (e) {
                err(`error finding applications with resource id ${resource_id}`, e.message ? e.message : e);
                resolve(false, e);
            } else {
                if (result1) {
                    var ecosystems = {};
                    for (var r in result1) {
                        var _key = result1[r]._id.toString();
                        ecosystems[_key] = JSON.parse(JSON.stringify(result1[r].ecosystem));
                        delete ecosystems[_key]['static_dir'];
                        var port = result1[r].port;
                        try {
                            if (port.trim().length > 0 && port.includes('/')) {
                                port = port.split('/');
                                for (var p in port)
                                    port[p] = parseInt(port[p]);
                            } else port = [ parseInt(port) ];
                        } catch (e) { port = []; }
                        //ecosystems[_key]['ports'] = port;
                        if (get_environment) {
                            var app_environment = JSON.parse(JSON.stringify(result1[r].environment));
                            if (port.length > 0) app_environment['PORT'] = port[0];
                            if (port.length > 1) app_environment['PORT_SCK'] = port[1];
                            ecosystems[_key]['env'] = app_environment;
                        }
                    }
                    resolve(true, ecosystems);
                } else resolve(null, result1);
            }
        });
    },
    get_applications_by_resource: (resource_id, resolve) => {
        mongo_api.collection('application').find({
            host: resource_id
        }).toArray((e, result1) => {
            if (e) {
                err(`error finding applications with resource id ${resource_id}`, e.message ? e.message : e);
                resolve(false, e);
            } else {
                if (result1) {
                    resolve(true, result1);
                } else resolve(null, result1);
            }
        });
    }
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
        mongo_port = global.mdb_port;
        mongo_dbname = global.mdb_db;
        mongo_client = mongodb.MongoClient;
        mongo_client.connect("mongodb://localhost:" + mongo_port, { useUnifiedTopology: true }, (e, client) => {
            if (e) err("connection error", e);
            else {
                log("connected to", mongo_port, `(db=${mongo_dbname})`);
                mongo_api = client.db(mongo_dbname);
            }
        });
        init();
    },
    api: api
};