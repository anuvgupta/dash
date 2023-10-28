import Utilities from "@dash/utils/Utilities";

describe("Utilities utility class tests", () => {
    // delay
    jest.useFakeTimers();
    const delayMillis: number = 500;
    test("delay-called", () => {
        const callback: () => void = jest.fn();
        Utilities.delay(callback, delayMillis);
        expect(callback).not.toBeCalled();
        jest.advanceTimersByTime(delayMillis + 1);
        expect(callback).toBeCalled();
        expect(callback).toHaveBeenCalledTimes(1);
    });
    test("delay-not-called", () => {
        const callback: () => void = jest.fn();
        Utilities.delay(callback, delayMillis);
        expect(callback).not.toBeCalled();
        jest.advanceTimersByTime(delayMillis / 2);
        expect(callback).not.toBeCalled();
    });

    // randomId
    const alphanumRegex = new RegExp("^[a-zA-Z0-9]+$");
    test("randomId-default", () => {
        const randomId: string = Utilities.randomId();
        expect(alphanumRegex.test(randomId)).toBe(true);
        expect(randomId.length).toBe(Utilities.defaultIdLength);
    });
    test("randomId-length", () => {
        const length: number = 25;
        const randomId: string = Utilities.randomId(length);
        expect(alphanumRegex.test(randomId)).toBe(true);
        expect(randomId.length).toBe(length);
    });

    // randomInteger
    test("randomInteger", () => {
        const maxInteger = 10;
        let resultMap: boolean[] = Array(maxInteger + 1).fill(false);
        while (true) {
            let randomInteger: number = Utilities.randomInteger(0, maxInteger);
            expect(randomInteger >= 0).toBe(true);
            expect(randomInteger <= maxInteger).toBe(true);
            resultMap[randomInteger] = true;
            let foundAll: boolean = true;
            for (let i: number = 0; i < maxInteger + 1; i++) {
                foundAll = foundAll && resultMap[i];
            }
            if (foundAll) {
                break;
            }
        }
    });

    // splitDomain
    test("splitDomain", () => {
        let secondLevelDomain: string = "example";
        let topLevelDomain: string = "com";
        let fullDomain: string = `${secondLevelDomain}.${topLevelDomain}`;
        let resultObject: any = Utilities.splitDomain(fullDomain);
        expect(resultObject.hasOwnProperty("sld")).toBe(true);
        expect(resultObject.hasOwnProperty("tld")).toBe(true);
        expect(resultObject.sld).toBe(secondLevelDomain);
        expect(resultObject.tld).toBe(topLevelDomain);
    });
});
