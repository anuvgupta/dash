import Is from "../utils/Is";

/**
 * Exception when configuration file data is invalid or not found
 */
class InvalidConfigException extends Error {
    constructor(message: string, cause: Error = null) {
        super(message, Is.nonnull(cause) ? { cause } : undefined);
        // need to set prototype for custom errors, arrays, maps
        Object.setPrototypeOf(this, InvalidConfigException.prototype);
        // source: https://github.com/microsoft/TypeScript-wiki/blob/81fe7b91664de43c02ea209492ec1cea7f3661d0/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
    }
}

export default InvalidConfigException;
