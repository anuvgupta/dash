import Log from "../utils/Log";
import Resolve from "../utils/Resolve";
import TableRecord from "../model/table/TableRecord";

/**
 * Accessor for tables within DatabaseAccessor
 */
@Log.Inject
export default class TableAccessor {
    /**
     * TableAccessor constructor
     */
    db: any;
    name: string;
    log: Log;
    constructor(name: string, db: any) {
        this.db = db;
        this.name = name;
        this.log.chain(name);
    }

    get(id: string, resolve: Resolve): void {
        this.log.info("get", id);
    }

    create(record: TableRecord, resolve: Resolve): void {
        this.log.info("create", record, record as object);
    }

    update(id: string, update: object, resolve: Resolve): void {
        this.log.info("update", id, update);
    }

    delete(id: string): void {
        this.log.info("delete", id);
    }

    query(query: object): void {
        this.log.info(query);
    }
}
