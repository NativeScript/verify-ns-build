import { VERY_LONG_WAIT, SHORT_WAIT } from "./constants";
import { DeviceController, IDevice, AndroidController, AndroidKeyEvent } from "mobile-devices-controller";
import { Platform, DeviceType, Status } from "mobile-devices-controller/lib/enums";
let deviceObject: IDevice;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function runApp(appId: string) {
    await sleep(SHORT_WAIT);
    await DeviceController.startApplication(deviceObject, null, appId);
    console.log("Run ", appId);
    await sleep(VERY_LONG_WAIT);
}

export async function stopApp(appId: string) {
    await DeviceController.stopApplication(deviceObject, appId);
    console.log("Stop ", appId);
    await sleep(SHORT_WAIT);
}

export async function uninstallApp(appId: string) {
    await DeviceController.uninstallAppWithBundle(deviceObject, appId);
    console.log("uninstallApp ", appId);
    await sleep(SHORT_WAIT);
}

export async function installApp(appPath: string, appId: string) {
    await DeviceController.installApplication(deviceObject, appPath, appId);
    console.log("installApp ", appPath);
    await sleep(SHORT_WAIT);
}

export async function warmUpDevice(platform: Platform, warmUpTimeout: number = 10000, app: string, appPath: string) {
    if (platform == Platform.IOS) {
        await uninstallApp(app);
        await installApp(appPath, app);
        await runApp(app);
        await stopApp(app);
        await uninstallApp(app);
    }
    else {
        AndroidController.executeKeyEvent(deviceObject, AndroidKeyEvent.KEYCODE_HOME);
    }
    sleep(warmUpTimeout);
}

export async function getDevice(platform: Platform) {
    deviceObject = (await DeviceController.getDevices({ platform: platform, type: DeviceType.DEVICE, status: Status.BOOTED }))[0];
}
