import * as Util from "util";
import * as RandomNumber from "random-number";

/**
 * Utilities & general-purpose convenience functions
 */

class Utilities {
    static alphanumericChars: string =
        "0123456789" +
        "abcdefghijklmnopqrstuvwxyz" +
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    // non-blocking delayed callback
    static delay(callback: () => void, timeout: number): void {
        setTimeout((_): void => {
            process.nextTick(callback);
        }, timeout);
    }

    // generate random alphanumeric key
    static randomId(length: number = 10): string {
        let key: string = "";
        for (let i: number = 0; i < length; i++) {
            key +=
                Utilities.alphanumericChars[
                    Utilities.randomNumber(
                        0,
                        Utilities.alphanumericChars.length - 1
                    )
                ];
        }
        return key;
    }

    // generate random number
    static randomNumber(min: number, max: number): number;
    static randomNumber(min: number, max: number, integer?: boolean): number {
        return RandomNumber({
            min,
            max,
            integer: integer ?? true,
        });
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
