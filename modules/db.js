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
            icon: null,
            featured: false,
            domains: [],
            link: '',
            tagline: (`${desc.split(' ').splice(0, 8).join(' ')}...`),
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
    delete_project: (id, slug, resolve) => {
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
    project_summary: (resolve) => {
        mongo_api.collection('project').find({
            public: true,
        }).toArray((e, result1) => {
            if (e) {
                err("error summarizing projects", e.message ? e.message : e);
                resolve(false, e);
            } else {
                if (result1) resolve(true, result1);
                else resolve(null, result1);
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
            provider: "",
            private_ip: "",
            specs: {
                cpu: 0,
                memory: 0,
                storage: 0,
                location: ""
            },
            domains: [],
            status: "new",
            status_time: -1,
            ts_created: timestamp,
            ts_updated: timestamp,
        }, (e, result1) => {
            if (e) {
                err(`error creating resource with name ${domain}`, e.message ? e.message : e);
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