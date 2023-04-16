/**
 * Utilities & general-purpose convenience functions
 */

class Utilities {
    // alphanumeric character list
    static defaultIdLength: number = 10;
    static alphanumericChars: string =
        "abcdefghijklmnopqrstuvwxyz" +
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
        "0123456789";

    // non-blocking delayed callback
    static delay(callback: () => void, timeout: number): void {
        setTimeout((_): void => {
            process.nextTick(callback);
        }, timeout);
    }

    // generate random alphanumeric key
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

    // generate random integer
    static randomInteger(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // split domain string
    static splitDomain(domain: string): object {
        const domainList = domain.split(".");
        const sld = domainList.slice(0, domainList.length - 1).join(".");
        const tld = domainList[domainList.length - 1];
        return { sld, tld };
    }
}

export default Utilities;
