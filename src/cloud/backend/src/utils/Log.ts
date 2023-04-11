import * as Util from "util";
import Is from "./Is";

/**
 * Logging utility class
 */

enum Level {
    INFO = "INFO",
    WARN = "WARN",
    ERROR = "ERROR",
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

    info(...args): void {
        this.print(Level.INFO, ...args);
    }

    warn(...args): void {
        const firstArg = args[0];
        if (Is.error(firstArg)) {
            const restArgs = Array.from(args).slice(1);
            this.print(Level.WARN, ...restArgs);
            this.printStackTrace(Level.WARN, firstArg);
        } else {
            this.print(Level.WARN, ...args);
        }
    }

    error(...args): void {
        const firstArg = args[0];
        if (Is.error(firstArg)) {
            const restArgs = Array.from(args).slice(1);
            this.print(Level.ERROR, ...restArgs);
            this.printStackTrace(Level.ERROR, firstArg);
        } else {
            this.print(Level.ERROR, ...args);
        }
    }

    private print(level: Level, ...args): void {
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
            case Level.INFO:
                console.log(msg);
                break;
            case Level.WARN:
                console.warn(msg);
                break;
            case Level.ERROR:
                console.error(`* ${msg}`);
                break;
            default:
                console.log(msg);
                break;
        }
    }

    private printStackTrace(level: Level, error: Error) {
        const msg = error.stack;
        switch (level) {
            case Level.WARN:
                console.warn(msg);
                break;
            case Level.ERROR:
                console.error(msg);
                break;
            default:
                console.log(msg);
                break;
        }
    }
}

export default Log;
