/**
 * Accessor for tables within DatabaseAccessor
 */
export default class TableAccessor {
    /**
     * TableAccessor constructor
     */
    db: any;
    name: string;
    constructor(name: string, db: any) {
        this.db = db;
        this.name = name;
    }
}
