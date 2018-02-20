export function verifyLogs(expectedLogs: string[], actualLog: string) {
    const result = expectedLogs.map(expected => {
        const isPresent = actualLog.includes(expected);
        return Object.assign({
            log: expected,
        }, !isPresent && { error: `String ${expected} not found in log!` });
    });

    console.dir(result);

    return result;
}
