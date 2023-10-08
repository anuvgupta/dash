/**
 * JsonWebToken configuration
 */
export default class JwtConfig {
    /**
     * JwtConfig constructor
     */
    secret: string;
    algorithm: string;
    expiration: string;
    constructor(map: {
        algorithm: string;
        secret: string;
        expiration: string;
    }) {
        this.secret = map.secret;
        this.algorithm = map.algorithm;
        this.expiration = map.expiration;
    }
}
