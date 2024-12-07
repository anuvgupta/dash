import * as MongoDb from "mongodb";

import Log from "@dash/utils/Log";
import Resolve from "@dash/utils/Resolve";
import Table from "@dash/model/table/Table";
import MongoConfig from "@dash/config/MongoConfig";
import TableAccessor from "@dash/database/TableAccessor";
import DatabaseConnectionException from "@dash/exception/DatabaseConnectionException";

type TableMap = { [key: Table]: TableAccessor };

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
    constructor(mongoConfig: MongoConfig) {
        this.db = null;
        this.client = null;
        this.name = mongoConfig.database;
        this.host = mongoConfig.host;
        this.port = mongoConfig.port;
        this.uri = `mongodb://${this.host}:${this.port}`;
        this.tables = {} as TableMap;
    }

    load(resolve: Resolve): void {
        this.log.info(`Connecting to DB ${this.name}@${this.uri}`);
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

    table(key: Table): TableAccessor {
        if (this.tables.hasOwnProperty(key)) {
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
