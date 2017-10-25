import { promisify } from "util";
import * as fs from "fs";

export const readFile = promisify(fs.readFile);
export const writeFile = promisify(fs.writeFile);
export const mkdir = promisify(fs.mkdir);
export const rename = promisify(fs.rename);

