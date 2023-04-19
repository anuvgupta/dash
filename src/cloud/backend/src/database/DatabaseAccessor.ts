import * as MongoDb from "mongodb";

import Log from "../utils/Log";
import Resolve from "../utils/Resolve";
import Table from "../model/table/Table";
import TableAccessor from "./TableAccessor";
import DatabaseConnectionException from "../exception/DatabaseConnectionException";

type TableMap = { [key: string]: TableAccessor };

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
    uri: string;
    name: string;
    host: string;
    port: number;
    tables: TableMap;
    log: Log;
    constructor(name: string, host: string, port: number) {
        this.db = null;
        this.client = null;
        this.name = name;
        this.host = host;
        this.port = port;
        this.uri = `mongodb://${this.host}:${this.port}`;
        this.tables = {} as TableMap;
    }

    connect(resolve: Resolve) {
        this.log.info(`Connecting to database ${this.name}@${this.uri}`);
        const mongoClient: MongoDb.MongoClient = new MongoDb.MongoClient(
            this.uri
        );
        mongoClient
            .connect()
            .then((client) => {
                this.client = client;
                this.db = this.client.db(this.name);
                this.tables = this.initializeTables();
                this.log.info(`Connected to database ${this.name}@${this.uri}`);
                resolve(null);
            })
            .catch((exception) => {
                resolve(
                    null,
                    new DatabaseConnectionException(
                        `Failed connecting to database ${this.name}@${this.uri}`,
                        exception
                    )
                );
            });
    }

    table(key: string): TableAccessor {
        if (
            Object.keys(Table).hasOwnProperty(key) &&
            this.tables.hasOwnProperty(key)
        ) {
            return this.tables[key];
        }
        return null;
    }

    private initializeTables(): TableMap {
        const tableMap: TableMap = {} as TableMap;
        const tableKeys: string[] = Object.keys(Table);
        const tableNames: string[] = Object.values(Table);
        for (const t in tableKeys) {
            if (tableKeys.hasOwnProperty(t) && tableNames.hasOwnProperty(t)) {
                const tableKey: string = tableKeys[t];
                const tableName: string = tableNames[t];
                tableMap[tableKey] = new TableAccessor(tableName, this.db);
            }
        }
        return tableMap;
    }
}
