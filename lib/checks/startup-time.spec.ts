import { verifyStartupTime } from "./startup-time";

class WrappedError {
    error: string;
}

describe("Start up time verification", () => {
    describe("iOS", () => {
        const maxTime = 5000;
        const platform = "ios";
        const tolerance = 1;

        describe("when valid log is provided", () => {
            const getLog = time => `
                    Successfully installed on device with identifier 'randomidentifier'.
                    Skipping node_modules folder! Use the syncAllFiles option to sync files from this folder.
                    Refreshing application...
                    Successfully synced application org.nativescript.leiosapp on device 6e329ecc0d1f6b80efa7ace9010f816c2ad1a760.
                    CONSOLE LOG: Timeline: Modules: Displayed in 10ms  (26389695.232375ms. - 26395309.500375ms.)
                    CONSOLE LOG file:///app/tns_modules/tns-core-modules/profiling/profiling.js:10:16: Timeline: Modules: Displayed in ${time}ms  (26389695.232375ms. - 26395309.500375ms.)
                    CONSOLE LOG: Timeline: Modules: Displayed in 10ms  (26389695.232375ms. - 26395309.500375ms.)
                    CONSOLE LOG file:///app/tns_modules/tns-core-modules/profiling/profiling.js:10:16: Timeline: Modules: Displayed in ${time}ms  (26389695.232375ms. - 26395309.500375ms.)
                    random text after
                    random text after
                `;
            let result;

            it("should parse the start up time", async () => {
                const time = maxTime - 1;
                const log = [getLog(time)];
                const numberOfRuns = 1;
                const result: any = await verifyStartupTime(maxTime, maxTime, platform, log, numberOfRuns, tolerance);
                expect(result.actual).toEqual(time);
            });

            describe("and the start up time is within the limits", () => {
                it("should not have errors", async () => {
                    const time = maxTime - 1;
                    const log = [getLog(time)];
                    const numberOfRuns = 1;
                    const result: any = await verifyStartupTime(maxTime, maxTime, platform, log, numberOfRuns, tolerance);

                    expect(result.error).not.toBeDefined;
                });
            });

            describe("and the startup time is not within the limits", () => {
                it("should return error", async () => {
                    const time = maxTime + 1;
                    const log = [getLog(time)];
                    const numberOfRuns = 1;
                    const result: any = await verifyStartupTime(maxTime, maxTime, platform, log, numberOfRuns, tolerance);

                    expect(result.error).toBeDefined();
                });
            });
        });

        describe("when invalid log is provided", () => {
            it("should return error the log is empty", async () => {
                const result: any = await verifyStartupTime(maxTime, maxTime, platform, [""], 1, tolerance);
                expect(result.error).toBeDefined();
            });

            it("should return error when the displayed event haven't logged", async () => {
                const log = [`
                    Successfully installed on device with identifier 'randomidentifier'.
                    Skipping node_modules folder! Use the syncAllFiles option to sync files from this folder.
                    Refreshing application...
                `];

                const result: any = await verifyStartupTime(maxTime, maxTime, platform, log, 1, tolerance);
                expect(result.error).toBeDefined();
            });

            it("should return error when the logged time is not a number", async () => {
                const log = [(time => `
                    random text before
                    CONSOLE LOG file:///app/tns_modules/tns-core-modules/profiling/profiling.js:10:16: Timeline: Modules: Displayed in ${time}ms  (26389695.232375ms. - 26395309.500375ms.)
                    random text after
                `)("non-numeric string")];

                const result: any = await verifyStartupTime(maxTime, maxTime, platform, log, 1, tolerance);
                expect(result.error).toBeDefined();
            });
        });
    });
});
