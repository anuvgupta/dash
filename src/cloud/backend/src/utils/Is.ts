/**
 * Type checking utility class
 */
class Is {
    /**
     * Check if undefined
     */
    static undefined(value: any): boolean {
        return typeof value === "undefined" && value === undefined;
    }

    /**
     * Check if defined
     */
    static defined(value: any): boolean {
        return !Is.undefined(value);
    }

    /**
     * Check if null
     */
    static null(value: any): boolean {
        return value === null;
    }

    /**
     * Check if nonnull
     */
    static nonnull(value: any): boolean {
        return !Is.null(value);
    }

    /**
     * Check if error
     */
    static error(value: any): boolean {
        return value instanceof Error;
    }

    /**
     * Check if not error
     */
    static notError(value: any): boolean {
        return !Is.error(value);
    }
}

export default Is;
