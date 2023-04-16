// import Log from "./backend/utils/Log";

// const log = new Log("main");

// log.info("some info", "abc");

// log.warn("warning 1");
// log.warn(new Error("error 2 details"));
// log.warn(new Error("error 3 details"), "warning 3");

// log.error("error 4");
// log.error(new Error("error 5 details"));
// log.error(new Error("error 6 details"), "error 6");

import * as Util from "util";

import Log from "../../src/utils/Log";

describe("Log utility class tests", () => {
    let log;
    let logMock;
    let warnMock;
    let errorMock;
    const logName = "test";
    const logObject = {
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
        const logOutput = `[${logName}] [INFO] `;
        expect(logMock).toHaveBeenCalledWith(logOutput);
    });
    test("info-number", () => {
        const logNum = 42;
        log.info(logNum);
        const logOutput = `[${logName}] [INFO] ${logNum}`;
        expect(logMock).toHaveBeenCalledWith(logOutput);
    });
    test("info-string", () => {
        const logWord = "hello";
        log.info(logWord);
        const logOutput = `[${logName}] [INFO] ${logWord}`;
        expect(logMock).toHaveBeenCalledWith(logOutput);
    });
    test("info-strings", () => {
        const logWord1 = "hello";
        const logWord2 = "world";
        log.info(logWord1, logWord2);
        const logOutput = `[${logName}] [INFO] ${logWord1} ${logWord2}`;
        expect(logMock).toHaveBeenCalledWith(logOutput);
    });
    test("info-string-number", () => {
        const logWord = "num";
        const logNum = 42;
        log.info(logWord, logNum);
        const logOutput = `[${logName}] [INFO] ${logWord} ${logNum}`;
        expect(logMock).toHaveBeenCalledWith(logOutput);
    });
    test("info-array", () => {
        const logArray = [1, 2, 3];
        log.info(logArray);
        const logInspectArray = Util.inspect(logArray, log.inspectProps);
        const logOutput = `[${logName}] [INFO] ${logInspectArray}`;
        expect(logMock).toHaveBeenCalledWith(logOutput);
    });
    test("info-object", () => {
        log.info(logObject);
        const logInspectObject = Util.inspect(logObject, log.inspectProps);
        const logOutput = `[${logName}] [INFO] ${logInspectObject}`;
        expect(logMock).toHaveBeenCalledWith(logOutput);
    });
    test("info-object-depth", () => {
        const logDepth = new Log(logName, 0);
        logDepth.info(logObject);
        const logInspectObject = Util.inspect(logObject, logDepth.inspectProps);
        const logOutput = `[${logName}] [INFO] ${logInspectObject}`;
        expect(logMock).toHaveBeenCalledWith(logOutput);
    });

    // warn
    test("warn-default", () => {
        const warnError = new Error("warning details");
        log.warn(warnError);
        const logOutput = `[${logName}] [WARN] `;
        expect(warnMock).toHaveBeenCalledWith(logOutput);
        expect(warnMock).toHaveBeenCalledWith(warnError.stack);
    });
    test("warn-strings", () => {
        const logWord1 = "hello";
        const logWord2 = "world";
        const warnError = new Error("warning details");
        log.warn(warnError, logWord1, logWord2);
        const logOutput = `[${logName}] [WARN] ${logWord1} ${logWord2}`;
        expect(warnMock).toHaveBeenCalledWith(logOutput);
        expect(warnMock).toHaveBeenCalledWith(warnError.stack);
    });
    test("warn-noError", () => {
        const logWord1 = "hello";
        const logWord2 = "world";
        log.warn(logWord1, logWord2);
        const logOutput = `[${logName}] [WARN] ${logWord1} ${logWord2}`;
        expect(warnMock).toHaveBeenCalledWith(logOutput);
    });

    // error
    test("error-default", () => {
        const fullError = new Error("error details");
        log.error(fullError);
        const logOutput = `* [${logName}] [ERROR] `;
        expect(errorMock).toHaveBeenCalledWith(logOutput);
        expect(errorMock).toHaveBeenCalledWith(fullError.stack);
    });
    test("error-strings", () => {
        const logWord1 = "hello";
        const logWord2 = "world";
        const fullError = new Error("error details");
        log.error(fullError, logWord1, logWord2);
        const logOutput = `* [${logName}] [ERROR] ${logWord1} ${logWord2}`;
        expect(errorMock).toHaveBeenCalledWith(logOutput);
        expect(errorMock).toHaveBeenCalledWith(fullError.stack);
    });
    test("error-noError", () => {
        const logWord1 = "hello";
        const logWord2 = "world";
        log.error(logWord1, logWord2);
        const logOutput = `* [${logName}] [ERROR] ${logWord1} ${logWord2}`;
        expect(errorMock).toHaveBeenCalledWith(logOutput);
    });
});
