/**
 * MongoDb configuration
 */
export default class MongoConfig {
    /**
     * MongoConfig constructor
     */
    host: string;
    port: number;
    database: string;
    constructor(map: { host: string; port: number; database: string }) {
        this.host = map.host;
        this.port = map.port;
        this.database = map.database;
    }
}
