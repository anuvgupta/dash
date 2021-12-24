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
    create_project: (slug, name, repo, public, resolve) => {
        const timestamp = Date.now();
        mongo_api.collection('project').insertOne({
            slug: slug,
            name: name,
            repo: repo,
            public: public,
            domains: [],
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
        else return resolve(false, { message: "get_project requires either id or slug" });
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
    // resources
    create_resource: (slug, name, provider, resolve) => {
        const timestamp = Date.now();
        mongo_api.collection('resource').insertOne({
            slug: slug,
            name: name,
            repo: "",
            domains: [],
            provider: provider,
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