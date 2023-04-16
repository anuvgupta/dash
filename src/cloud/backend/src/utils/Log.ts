import * as Util from "util";

import Is from "./Is";

/**
 * Logging utility class
 */

class Log {
    static INFO: string = "INFO";
    static WARN: string = "WARN";
    static ERROR: string = "ERROR";

    id: string;
    depth: number;
    inspectProps: object;

    constructor(id: string);
    constructor(id: string, depth: number);
    constructor(id: string, depth?: number) {
        this.id = id;
        this.depth = depth ?? null;
        this.inspectProps = {
            showHidden: false,
            colors: true,
            compact: false,
            depth: this.depth,
        };
    }

    info(...args): void {
        this.print(Log.INFO, ...args);
    }

    warn(...args): void {
        const firstArg = args[0];
        if (Is.error(firstArg)) {
            const restArgs = Array.from(args).slice(1);
            this.print(Log.WARN, ...restArgs);
            this.printStackTrace(Log.WARN, firstArg);
        } else {
            this.print(Log.WARN, ...args);
        }
    }

    error(...args): void {
        const firstArg = args[0];
        if (Is.error(firstArg)) {
            const restArgs = Array.from(args).slice(1);
            this.print(Log.ERROR, ...restArgs);
            this.printStackTrace(Log.ERROR, firstArg);
        } else {
            this.print(Log.ERROR, ...args);
        }
    }

    private print(level: string, ...args): void {
        let msg = "";
        for (let i = 0; i < args.length; i++) {
            let arg = args[i];
            if (typeof arg === "object" && arg !== null) {
                arg = Util.inspect(arg, this.inspectProps);
            }
            msg += `${arg}`;
            msg += `${i < args.length - 1 ? " " : ""}`;
        }
        msg = `[${this.id}] [${level.toString()}] ${msg}`;
        switch (level) {
            case Log.INFO:
                console.log(msg);
                break;
            case Log.WARN:
                console.warn(msg);
                break;
            case Log.ERROR:
                console.error(`* ${msg}`);
                break;
        }
    }

    private printStackTrace(level: string, error: Error) {
        const msg = error.stack;
        switch (level) {
            case Log.WARN:
                console.warn(msg);
                break;
            case Log.ERROR:
                console.error(msg);
                break;
        }
    }
}

export default Log;
