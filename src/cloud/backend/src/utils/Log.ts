import * as Util from "util";

import Is from "./Is";

/**
 * Logging utility class
 */
export default class Log {
    /**
     * Log levels (info, warn, error)
     */
    static INFO: string = "INFO";
    static WARN: string = "WARN";
    static ERROR: string = "ERROR";

    /**
     * Default log depth
     */
    static DEPTH_DEFAULT = 2;

    /**
     * Log decorator factory generic for all classes
     * https://levelup.gitconnected.com/start-implementing-your-own-typescript-class-decorators-84a49f560dea
     */
    static Inject<T extends new (...args: any[]) => {}>(
        target: T,
        context: any
    ) {
        if (context.kind === "class") {
            return class extends target {
                log: Log = new Log(target.name, Log.DEPTH_DEFAULT);
                constructor(...args: any[]) {
                    super(...args);
                }
            };
        }
    }

    /**
     * Log constructor
     */
    id: string;
    depth: number | null;
    inspectProps: object;
    constructor(id: string, depth: number | null = null) {
        this.id = id;
        this.depth = depth;
        this.inspectProps = {
            showHidden: false,
            colors: true,
            compact: false,
            depth: this.depth,
        };
    }

    /**
     * Print informational message to logs
     */
    info(...args): void {
        this.print(Log.INFO, ...args);
    }

    /**
     * Print warning message & error to logs
     */
    warn(...args): void {
        const firstArg: any = args[0];
        if (Is.error(firstArg)) {
            const restArgs = Array.from(args).slice(1);
            this.print(Log.WARN, ...restArgs);
            this.printStackTrace(Log.WARN, firstArg);
        } else {
            this.print(Log.WARN, ...args);
        }
    }

    /**
     * Print exception message & error to logs
     */
    error(...args): void {
        const firstArg: any = args[0];
        if (Is.error(firstArg)) {
            const restArgs = Array.from(args).slice(1);
            this.print(Log.ERROR, ...restArgs);
            this.printStackTrace(Log.ERROR, firstArg);
        } else {
            this.print(Log.ERROR, ...args);
        }
    }

    /**
     * Print message and/or error to logs at specific level
     */
    private print(level: string, ...args): void {
        let msg: string = "";
        for (let i: number = 0; i < args.length; i++) {
            let arg: any = args[i];
            if (typeof arg === "object" && arg !== null) {
                arg = Util.inspect(arg, this.inspectProps);
            }
            msg += `${arg}`;
            msg += `${i < args.length - 1 ? " " : ""}`;
        }
        msg = `[${level.toString()}] [${this.id}] ${msg}`;
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

    /**
     * Print stack track or cause for an error at specific level
     */
    private printStackTrace(level: string, error: Error) {
        const stackTrace: any = error.stack;
        const stackTraceTitle: string = "Exception stack trace:";
        switch (level) {
            case Log.WARN:
                console.warn(error);
                this.info(stackTraceTitle);
                console.warn(stackTrace);
                break;
            case Log.ERROR:
                console.error(error);
                this.info(stackTraceTitle);
                console.error(stackTrace);
                break;
        }
    }
}
