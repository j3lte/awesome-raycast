import { emptyDir } from "@std/fs";
import updateText from "./utils/update-text.ts";

const README_FILE = import.meta.resolve("../README.md").replace("file://", "");
const readme = await Deno.readTextFile(README_FILE);

const { updatedText: stage1 } = updateText("SECTIONS", readme, "\n");
const { updatedText: stage2 } = updateText("TABLE_OF_CONTENTS", stage1, "");
const { updatedText: stage3 } = updateText("STATISTICS", stage2, "");
const { updatedText: stageFinal } = updateText("UPDATETIME", stage3, "");

await Deno.writeTextFile(README_FILE, stageFinal);

const iconsFolder = import.meta.resolve("../icons").replace("file://", "");
await emptyDir(iconsFolder);
await Deno.writeTextFile(`${iconsFolder}/.gitkeep`, "");
