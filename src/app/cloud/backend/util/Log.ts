const Util = require("util");

/**
 * Logging utility class
 */

namespace Log {
    export enum Level {
        LOG,
        WARN,
        ERROR,
    }
}

class Log {
    id: string;
    depth: number;
    inspectProps: object;

    constructor(id: string);
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

    log(...args): void {
        this.print(Log.Level.LOG, ...args);
    }

    warn(...args): void {
        this.print(Log.Level.WARN, ...args);
    }

    error(...args): void {
        this.print(Log.Level.ERROR, ...args);
    }

    private print(level: Log.Level, ...args): void {
        let msg = "";
        for (let i = 0; i < args.length; i++) {
            let arg = args[i];
            if (typeof arg === "object" && arg !== null) {
                arg = Util.inspect(arg, this.inspectProps);
            }
            msg += `${arg}`;
            msg += `${i < args.length - 1 ? " " : ""}`;
        }
        msg = `[${id}] [${level}] ${msg}`;
        switch (level) {
            case Log.Level.LOG:
                console.log(msg);
                break;
            case Log.Level.WARN:
                console.warn(msg);
                break;
            case Log.Level.ERROR:
                console.error(`* ${msg}`);
                break;
            default:
                console.log(msg);
                break;
        }
    }
}

export default Log;
