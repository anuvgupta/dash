import * as Util from "util";
import * as Readline from "readline";

import Log from "../utils/Log";

/**
 * Command-line interface
 */
@Log.Inject
export default class CommandLineInterface {
    /**
     * Command-line interface constructor
     */
    input: Readline.Interface;
    log: Log;
    constructor() {
        this.input = Readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
    }

    /**
     * Initialize command-line interface
     */
    load(): CommandLineInterface {
        this.log.info("Loading CLI");
        this.input.on("line", (lineText) => {
            lineText = lineText.trim();
            if (lineText !== "") {
                const line = lineText.split(" ");
                if (line[0] === "testing") {
                    console.log("123");
                } else if (line[0] === "db") {
                    if (line.length > 1 && line[1] === "table") {
                        // if (line.length > 2) {
                        //     m.db.example(line[2], result => {
                        //         log(result);
                        //     });
                        // }
                    }
                } else if (line[0] === "code" || line[0] === "eval") {
                    if (line.length > 1 && line[1] !== "") {
                        lineText = lineText.substring(4);
                        const ret = Function(lineText)();
                        if (ret !== undefined) console.log(ret);
                    }
                } else if (line[0] === "clear" || line[0] === "c") {
                    console.clear();
                } else if (
                    line[0] === "exit" ||
                    line[0] === "quit" ||
                    line[0] === "q"
                ) {
                    process.exit(0);
                }
            }
        });
        return this;
    }
}
