import { emptyDir } from "@std/fs";
import { resolvePath } from "./utils/helpers.ts";
import { updateTexts } from "./utils/update-text.ts";

const README_FILE = resolvePath(import.meta.resolve("../README.md"));
const readme = await Deno.readTextFile(README_FILE);

const { updatedText } = updateTexts(readme, [
  { blockID: "SECTIONS", update: "\n" },
  { blockID: "TABLE_OF_CONTENTS", update: "" },
  { blockID: "STATISTICS", update: "" },
  { blockID: "UPDATETIME", update: "" },
]);

await Deno.writeTextFile(README_FILE, updatedText);

const graphicsFolder = resolvePath(import.meta.resolve("../graphics"));
await emptyDir(graphicsFolder);
await Deno.writeTextFile(`${graphicsFolder}/.gitkeep`, "");
