import Is from "@dash/utils/Is";

/**
 * Exception when error occurs while connecting to database
 */
export default class DatabaseConnectionException extends Error {
    /**
     * DatabaseConnectionException constructor
     */
    constructor(message: string, cause: Error = null) {
        super(message, Is.nonnull(cause) ? { cause } : undefined);
        // need to set prototype for custom errors, arrays, maps
        Object.setPrototypeOf(this, DatabaseConnectionException.prototype);
        // source: https://github.com/microsoft/TypeScript-wiki/blob/81fe7b91664de43c02ea209492ec1cea7f3661d0/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
    }
}
