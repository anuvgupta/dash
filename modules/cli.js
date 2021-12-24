/* MODULE – CLI */
// command line interface

/* IMPORTS */
const _util = require("util");
const readline = require("readline");

/* INFRA */
var m = null;
var log = null;
var err = null;



/* MODULE */
var input = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
var init = _ => {
    input.on('line', (line) => {
        line = line.trim();
        if (line != '') {
            var line_text = `${line}`;
            line = line.split(' ');
            if (line[0] == "testing") {
                console.log("123");
            } else if (line[0] == "db") {
                if (line.length > 1 && line[1] == "table") {
                    // if (line.length > 2) {
                    //     m.db.example(line[2], result => {
                    //         log(result);
                    //     });
                    // }
                }
            } else if (line[0] == "modules") {
                var output = _util.inspect(m, {
                    showHidden: false, depth: 2, colors: true, compact: false
                });
                log(`modules\n${output}`);
            } else if (line[0] == "code" || line[0] == "eval") {
                if (line.length > 1 && line[1] != "") {
                    line_text = line_text.substring(4);
                    var ret = eval(line_text);
                    if (ret !== undefined) console.log(ret);
                }
            } else if (line[0] == "clear" || line[0] == 'c') {
                console.clear();
            } else if (line[0] == "exit" || line[0] == "quit" || line[0] == 'q') {
                m.main.exit(0);
            }
        }
    });
};
var api = {};



/* EXPORT */
module.exports = {
    id: null,
    init: id => {
        module.exports.id = id;
        m = global.m;
        log = m.utils.logger(id, false);
        err = m.utils.logger(id, true);
        log("initializing");
        init();
    },
    api: api
};