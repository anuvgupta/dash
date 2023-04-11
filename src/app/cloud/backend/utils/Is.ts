/**
 * Type checking utility class
 */

class Is {
    // check undefined
    static undefined(value: any): boolean {
        return typeof value === "undefined" && value === undefined;
    }

    // check defined
    static defined(value: any): boolean {
        return !Is.undefined(value);
    }

    // check null
    static null(value: any): boolean {
        return value === null;
    }

    // check nonnull
    static nonnull(value: any): boolean {
        return !Is.null(value);
    }

    // check error
    static error(value: any): boolean {
        return value instanceof Error;
    }

    // check not error
    static notError(value: any): boolean {
        return !Is.error(value);
    }
}

export default Is;
