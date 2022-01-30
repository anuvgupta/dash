/* DASHBOARD */
// project dashboard – resource daemon

/* IMPORTS */
const fs = require("fs");
const ws = require("ws");
const path = require("path");
const readline = require("readline");
const body_parser = require("body-parser");

/* ENVIRONMENT */
global.args = process.argv.slice(2);
global.env = global.args[0] == "prod" ? "prod" : "dev";
global.config = JSON.parse(fs.readFileSync('./config-daemon.json', { encoding: 'utf8', flag: 'r' }));

/* MODULES */
// TODO: process management, ws client, report heartbeats

/* MAIN */
console.log("DASHBOARD");
console.log("[svc] daemon");
process.on('exit', _ => {
    console.log('[process] exit');
});
process.on('SIGINT', _ => {
    console.log('[process] interrupt');
    // modules.main.api.exit();
});
process.on('SIGUSR1', _ => {
    console.log('[process] restart 1');
    // modules.main.api.exit();
});
process.on('SIGUSR2', _ => {
    console.log('[process] restart 2');
    // modules.main.api.exit();
});
// modules.utils.delay(modules.main.main, 500);