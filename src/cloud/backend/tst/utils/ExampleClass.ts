import Log from "@dash/utils/Log";

/**
 * Example class for utility tests
 */
@Log.Inject
export default class ExampleClass {
    log: Log;
    exampleField: string;
    exampleMessage: string;
    constructor(exampleValue: string) {
        this.exampleField = exampleValue;
        this.exampleMessage = "Example message";
    }

    logExampleMessage(): void {
        this.log.info(`${this.exampleMessage}: ${this.exampleField}`);
    }

    chainLogPrefix(prefix: string): void {
        this.log.chain(prefix);
    }
}
