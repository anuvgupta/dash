/**
 * Utilities & general-purpose convenience functions
 */
export default class Utilities {
    /**
     * Default identifier length
     */
    static defaultIdLength: number = 10;

    /**
     * Alphanumeric character list
     */
    static alphanumericChars: string =
        "abcdefghijklmnopqrstuvwxyz" +
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
        "0123456789";

    /**
     * Non-blocking delayed callback
     */
    static delay(callback: () => void, timeout: number): void {
        setTimeout((): void => {
            process.nextTick(callback);
        }, timeout);
    }

    /**
     * Generate random alphanumeric key
     */
    static randomId(length: number = Utilities.defaultIdLength): string {
        let randomId: string = "";
        for (let i: number = 0; i < length; i++) {
            randomId +=
                Utilities.alphanumericChars[
                    Utilities.randomInteger(
                        0,
                        Utilities.alphanumericChars.length - 1
                    )
                ];
        }
        return randomId;
    }

    /**
     * Generate random integer
     */
    static randomInteger(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * Split domain string
     */
    static splitDomain(domain: string): object {
        const domainList = domain.split(".");
        const sld = domainList.slice(0, domainList.length - 1).join(".");
        const tld = domainList[domainList.length - 1];
        return { sld, tld };
    }

    /**
     * Slice initial arguments (node path & script path) from argument list
     * Also converts arguments (specical list) type into normal list type
     */
    static getArguments(args: any[]): any[] {
        return Array.from(args).slice(2);
    }
}
