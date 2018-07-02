import { IOSDeviceLib } from "ios-device-lib";
import { resolve } from "path";
import { execute } from "./command";
import { PROJECT_DIR } from "./constants";
let deviceId;
let runner;
const ANDROID_HOME_PATH = process.env["ANDROID_HOME"];
const ADB_PATH = resolve(ANDROID_HOME_PATH, "platform-tools", "adb");
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function runApp(appId: string, platform: "ios" | "android", ) {
    if (platform === "ios") {
        await Promise.all(runner.start([{ "ddi": undefined, "appId": appId, "deviceId": deviceId }]));
    }
    else {
        const command = ADB_PATH + " -s " + deviceId + " shell monkey -p " + appId + " -c android.intent.category.LAUNCHER 1";
        await execute(command, PROJECT_DIR, true, true);
        await sleep(15000);
    }
    await sleep(10000);
}

export async function stopApp(appId: string, platform: "ios" | "android", ) {
    if (platform === "ios") {
        await Promise.all(runner.stop([{ "ddi": undefined, "appId": appId, "deviceId": deviceId }]));
    }
    else {
        const command = ADB_PATH + " -s " + deviceId + " shell am force-stop " + appId;
        await execute(command, PROJECT_DIR, true, true);
        await sleep(2000);
    }
    await sleep(3000);
}

export async function uninstallApp(appId: string, platform: "ios" | "android", ) {
    if (platform === "ios") {
        try {
            await Promise.all(runner.uninstall(appId, [deviceId]));
        }
        catch{
            console.log("Unable to uninstall " + appId + " !");
        }
    }
    else {
        const command = ADB_PATH + " -s " + deviceId + " uninstall " + appId;
        await execute(command, PROJECT_DIR, true, true);
        await sleep(3000);
    }
    await sleep(2000);
}

export async function installApp(appPath: string, platform: "ios" | "android") {
    if (platform === "ios") {
        await Promise.all(runner.install(appPath, [deviceId])).then(function (response) {
            console.log("INSTALL PASSED!", response);
        }).catch(err => {
            console.log("An error occurred !", err);
        });
    }
    else {
        const command = ADB_PATH + " -s " + deviceId + " install -r " + appPath;
        await execute(command, PROJECT_DIR, true, true);
        await sleep(5000);
    }
    await sleep(3000);
}

export async function getDevice(platform: "ios" | "android") {
    if (platform === "ios") {
        runner = new IOSDeviceLib(d => {
            console.log("Device found!", d);
            deviceId = d.deviceId;
        }, device => {
            console.log("Device LOST!");
        });
    }
    else {
        const command = ADB_PATH + " devices -l";
        let log;
        await execute(command, PROJECT_DIR, true, true).then(function (logs) {
            log = logs.log;
        });
        log = log.replace("\n", " regex ");
        let matches = log.match("regex .+ device ");
        let deviceIdString = matches.pop().toString();
        deviceIdString = deviceIdString.replace("device", "");
        deviceIdString = deviceIdString.replace("regex", "");
        deviceId = deviceIdString.replace(" ", "");
        console.log("Device found! With id: ", deviceId);
    }
}

