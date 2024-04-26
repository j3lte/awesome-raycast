import { emptyDir } from "@std/fs";
import updateText from "./utils/update-text.ts";

const README_FILE = import.meta.resolve("../README.md").replace("file://", "");
const readme = await Deno.readTextFile(README_FILE);

let updatedReadMe = updateText("SECTIONS", readme, "\n");
updatedReadMe = updateText("TABLE_OF_CONTENTS", updatedReadMe, "");
updatedReadMe = updateText("STATISTICS", updatedReadMe, "");
updatedReadMe = updateText("UPDATETIME", updatedReadMe, "");

await Deno.writeTextFile(README_FILE, updatedReadMe);

const iconsFolder = import.meta.resolve("../icons").replace("file://", "");
await emptyDir(iconsFolder);
await Deno.writeTextFile(`${iconsFolder}/.gitkeep`, "");
