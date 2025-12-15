import { emptyDir } from "@std/fs";
import { makeBadge } from "badge-maker";

import type { Icon } from "../types/internal.ts";

const iconsFolder = import.meta.resolve("../../icons").replace("file://", "");

export async function generateIcons(icons: Icon[], cleanDir = false) {
  try {
    if (cleanDir) {
      await emptyDir(iconsFolder);
      await Deno.writeTextFile(`${iconsFolder}/.gitkeep`, "");
    }
    for (const icon of icons) {
      const svg = makeBadge(icon.format);
      await Deno.writeTextFile(`${iconsFolder}/${icon.fileName}`, svg);
    }
  } catch (error) {
    console.error(error);
  }
}
