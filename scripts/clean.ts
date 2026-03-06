import { emptyDir } from "@std/fs";
import { updateTexts } from "./utils/update-text.ts";

const README_FILE = import.meta.resolve("../README.md").replace("file://", "");
const readme = await Deno.readTextFile(README_FILE);

const { updatedText } = updateTexts(readme, [
  { blockID: "SECTIONS", update: "\n" },
  { blockID: "TABLE_OF_CONTENTS", update: "" },
  { blockID: "STATISTICS", update: "" },
  { blockID: "UPDATETIME", update: "" },
]);

await Deno.writeTextFile(README_FILE, updatedText);

const graphicsFolder = import.meta.resolve("../graphics").replace("file://", "");
await emptyDir(graphicsFolder);
await Deno.writeTextFile(`${graphicsFolder}/.gitkeep`, "");
