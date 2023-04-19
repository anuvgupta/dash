import * as MongoDb from "mongodb";

import Is from "../utils/Is";
import Log from "../utils/Log";
import Resolve from "../utils/Resolve";
import Table from "../model/Table";
import TableAccessor from "./TableAccessor";
import DatabaseConnectionException from "../exception/DatabaseConnectionException";

/**
 * Accessor for MongoDB database
 */
@Log.Inject
export default class DatabaseAccessor {
    /**
     * DatabaseAccessor constructor
     */
    db: any;
    client: any;
    name: string;
    host: string;
    port: number;
    tables: { [key in Table]: TableAccessor };
    log: Log;
    constructor(name: string, host: string, port: number) {
        this.db = null;
        this.client = null;
        this.name = name;
        this.host = host;
        this.port = port;
    }

    connect(resolve: Resolve) {
        this.log.info(
            `Connecting to database ${this.name} at ${this.host}:${this.port}`
        );
        const mongoURI: string = `mongodb://${this.host}:${this.port}`;
        const mongoClient: MongoDb.MongoClient = new MongoDb.MongoClient(
            mongoURI
        );
        mongoClient
            .connect()
            .then((client) => {
                this.client = client;
                this.db = this.client.db(this.name);
                this.initializeTables();
                this.log.info(
                    `Connected to database ${this.name} at ${this.host}:${this.port}`
                );
                resolve(null);
            })
            .catch((exception) => {
                resolve(
                    null,
                    new DatabaseConnectionException(
                        `Failed connecting to database ${this.name} at ${this.host}:${this.port}`,
                        exception
                    )
                );
            });
    }

    table(key: Table): TableAccessor {
        if (Table.hasOwnProperty(key)) {
            return this.tables[key];
        }
    }

    private initializeTables(): void {
        const tableMap: object = {};
        for (const tableKey in Table) {
            if (Table.hasOwnProperty(tableKey)) {
                const tableName: string = Table[tableKey].toString();
                tableMap[tableKey] = new TableAccessor(tableName, this.db);
            }
        }
        this.tables = tableMap as typeof this.tables;
    }
}
