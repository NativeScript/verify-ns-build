import { VERY_LONG_WAIT, SHORT_WAIT } from "./constants";
import { DeviceController, IDevice, DeviceType, AndroidController, AndroidKeyEvent } from "mobile-devices-controller";
let deviceObject: IDevice;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function runApp(appId: string) {
    await sleep(SHORT_WAIT);
    await DeviceController.startApplication(deviceObject, null, appId);
    console.log("Run ",appId);
    await sleep(VERY_LONG_WAIT);
}

export async function stopApp(appId: string ) {
    await DeviceController.stopApplication(deviceObject, appId);
    console.log("Stop ",appId);
    await sleep(SHORT_WAIT);
}

export async function uninstallApp(appId: string ) {
    await DeviceController.uninstallAppWithBundle(deviceObject, appId);
    console.log("uninstallApp ",appId);
    await sleep(SHORT_WAIT);
}

export async function installApp(appPath: string) {
    await DeviceController.installApplication(deviceObject, appPath);
    console.log("installApp ",appPath);
    await sleep(SHORT_WAIT);
}

export async function warmUpDevice(platform: "ios" | "android", warmUpTimeout: number = 10000) {
    const apps = await DeviceController.getInstalledApplication(deviceObject);
    let app:string[];
    if (platform === "ios") {
        app = await apps.filter(app => {
            return app.includes("Keynote")
        });
        await runApp(app[0]);
        await stopApp(app[0]);
    }
    else {
        AndroidController.executeKeyevent(deviceObject, AndroidKeyEvent.KEYCODE_HOME);
    }
    sleep(warmUpTimeout);
}

export async function getDevice(platform: "ios" | "android") {
    const devices = await DeviceController.getDevices({ platform: platform, type: DeviceType.DEVICE });
    deviceObject = devices[0];
}
