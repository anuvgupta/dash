import Is from "@dash/utils/Is";

describe("Is utility class tests", () => {
    // undefined
    test("undefined-true", () => {
        let undefinedVariable = undefined;
        expect(Is.undefined(undefinedVariable)).toBe(true);
    });
    test("undefined-false", () => {
        let definedVariable = "abc";
        expect(Is.undefined(definedVariable)).toBe(false);
    });
    test("undefined-true-func", () => {
        let someFunc = (optionalParameter?: string) => {
            expect(Is.undefined(optionalParameter)).toBe(true);
        };
        someFunc();
    });
    test("undefined-false-func", () => {
        let someFunc = (optionalParameter?: string) => {
            expect(Is.undefined(optionalParameter)).toBe(false);
        };
        someFunc("abc");
    });

    // defined
    test("defined-true", () => {
        let undefinedVariable = undefined;
        expect(Is.defined(undefinedVariable)).toBe(false);
    });
    test("defined-false", () => {
        let definedVariable = "abc";
        expect(Is.defined(definedVariable)).toBe(true);
    });
    test("defined-true-func", () => {
        let someFunc = (optionalParameter?: string) => {
            expect(Is.defined(optionalParameter)).toBe(true);
        };
        someFunc("abc");
    });
    test("defined-false-func", () => {
        let someFunc = (optionalParameter?: string) => {
            expect(Is.defined(optionalParameter)).toBe(false);
        };
        someFunc();
    });

    // null
    test("null-true", () => {
        let nullVariable = null;
        expect(Is.null(nullVariable)).toBe(true);
    });
    test("null-false", () => {
        let nonnullVariable = "abc";
        expect(Is.null(nonnullVariable)).toBe(false);
    });

    // nonnull
    test("nonnull-true", () => {
        let nonnullVariable = "abc";
        expect(Is.nonnull(nonnullVariable)).toBe(true);
    });
    test("nonnull-false", () => {
        let nullVariable = null;
        expect(Is.nonnull(nullVariable)).toBe(false);
    });

    // error
    test("error-true", () => {
        let errorVariable = new Error("abc");
        expect(Is.error(errorVariable)).toBe(true);
    });
    test("error-false", () => {
        let notErrorVariable = "abc";
        expect(Is.error(notErrorVariable)).toBe(false);
    });
    test("error-inheritance-true", () => {
        let errorVariable = new SyntaxError("abc");
        expect(Is.error(errorVariable)).toBe(true);
    });

    // notError
    test("notError-true", () => {
        let notErrorVariable = "abc";
        expect(Is.notError(notErrorVariable)).toBe(true);
    });
    test("notError-false", () => {
        let errorVariable = new Error("abc");
        expect(Is.notError(errorVariable)).toBe(false);
    });
    test("notError-inheritance-false", () => {
        let errorVariable = new SyntaxError("abc");
        expect(Is.notError(errorVariable)).toBe(false);
    });
});
