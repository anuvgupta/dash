import * as Util from "util";

import Log from "../../src/utils/Log";
import ExampleClass from "./ExampleClass";

describe("Log utility class tests", () => {
    let log: Log;
    let logMock: any;
    let warnMock: any;
    let errorMock: any;
    const logName: string = "test";
    const logObject: object = {
        a: 1,
        b: 2,
        c: 3,
        d: {
            e: 4,
            f: 5,
        },
    };

    beforeEach(() => {
        logMock = jest.spyOn(console, "log");
        warnMock = jest.spyOn(console, "warn");
        errorMock = jest.spyOn(console, "error");
        log = new Log(logName);
    });

    // info
    test("info-default", () => {
        log.info("");
        const logOutput: string = `[INFO] [${logName}] `;
        expect(logMock).toHaveBeenCalledWith(logOutput);
    });
    test("info-number", () => {
        const logNum: number = 42;
        log.info(logNum);
        const logOutput: string = `[INFO] [${logName}] ${logNum}`;
        expect(logMock).toHaveBeenCalledWith(logOutput);
    });
    test("info-string", () => {
        const logWord: string = "hello";
        log.info(logWord);
        const logOutput: string = `[INFO] [${logName}] ${logWord}`;
        expect(logMock).toHaveBeenCalledWith(logOutput);
    });
    test("info-strings", () => {
        const logWord1: string = "hello";
        const logWord2: string = "world";
        log.info(logWord1, logWord2);
        const logOutput: string = `[INFO] [${logName}] ${logWord1} ${logWord2}`;
        expect(logMock).toHaveBeenCalledWith(logOutput);
    });
    test("info-string-number", () => {
        const logWord: string = "num";
        const logNum: number = 42;
        log.info(logWord, logNum);
        const logOutput: string = `[INFO] [${logName}] ${logWord} ${logNum}`;
        expect(logMock).toHaveBeenCalledWith(logOutput);
    });
    test("info-array", () => {
        const logArray: number[] = [1, 2, 3];
        log.info(logArray);
        const logInspectArray: string = Util.inspect(
            logArray,
            log.inspectProps
        );
        const logOutput: string = `[INFO] [${logName}] ${logInspectArray}`;
        expect(logMock).toHaveBeenCalledWith(logOutput);
    });
    test("info-object", () => {
        log.info(logObject);
        const logInspectObject: string = Util.inspect(
            logObject,
            log.inspectProps
        );
        const logOutput: string = `[INFO] [${logName}] ${logInspectObject}`;
        expect(logMock).toHaveBeenCalledWith(logOutput);
    });
    test("info-object-depth", () => {
        const logDepth: Log = new Log(logName, 0);
        logDepth.info(logObject);
        const logInspectObject: string = Util.inspect(
            logObject,
            logDepth.inspectProps
        );
        const logOutput: string = `[INFO] [${logName}] ${logInspectObject}`;
        expect(logMock).toHaveBeenCalledWith(logOutput);
    });

    // warn
    test("warn-default", () => {
        const warnError = new Error("warning details");
        log.warn(warnError);
        const logOutput: string = `[WARN] [${logName}] `;
        expect(warnMock).toHaveBeenCalledWith(logOutput);
        expect(warnMock).toHaveBeenCalledWith(warnError.stack);
    });
    test("warn-strings", () => {
        const logWord1: string = "hello";
        const logWord2: string = "world";
        const warnError: Error = new Error("warning details");
        log.warn(warnError, logWord1, logWord2);
        const logOutput: string = `[WARN] [${logName}] ${logWord1} ${logWord2}`;
        expect(warnMock).toHaveBeenCalledWith(logOutput);
        expect(warnMock).toHaveBeenCalledWith(warnError.stack);
    });
    test("warn-noError", () => {
        const logWord1: string = "hello";
        const logWord2: string = "world";
        log.warn(logWord1, logWord2);
        const logOutput: string = `[WARN] [${logName}] ${logWord1} ${logWord2}`;
        expect(warnMock).toHaveBeenCalledWith(logOutput);
    });

    // error
    test("error-default", () => {
        const fullError: Error = new Error("error details");
        log.error(fullError);
        const logOutput: string = `* [ERROR] [${logName}] `;
        expect(errorMock).toHaveBeenCalledWith(logOutput);
        expect(errorMock).toHaveBeenCalledWith(fullError.stack);
    });
    test("error-strings", () => {
        const logWord1: string = "hello";
        const logWord2: string = "world";
        const fullError: Error = new Error("error details");
        log.error(fullError, logWord1, logWord2);
        const logOutput: string = `* [ERROR] [${logName}] ${logWord1} ${logWord2}`;
        expect(errorMock).toHaveBeenCalledWith(logOutput);
        expect(errorMock).toHaveBeenCalledWith(fullError.stack);
    });
    test("error-noError", () => {
        const logWord1: string = "hello";
        const logWord2: string = "world";
        log.error(logWord1, logWord2);
        const logOutput: string = `* [ERROR] [${logName}] ${logWord1} ${logWord2}`;
        expect(errorMock).toHaveBeenCalledWith(logOutput);
    });

    // injection
    test("inject-info", () => {
        const exampleValue: string = "abc";
        const exampleMessage: string = "Example message";
        const exampleObject: ExampleClass = new ExampleClass(exampleValue);
        exampleObject.logExampleMessage();
        const logOutput: string = `[INFO] [ExampleClass] ${exampleMessage}: ${exampleValue}`;
        expect(logMock).toHaveBeenCalledWith(logOutput);
    });
});
