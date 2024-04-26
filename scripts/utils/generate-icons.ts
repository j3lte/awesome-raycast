import { emptyDir } from "@std/fs";
import { Format, makeBadge } from "badge-maker";

export type Icon = {
  fileName: string;
  format: Format;
};

const iconsFolder = import.meta.resolve("../../icons").replace("file://", "");

export default async function generateIcons(icons: Icon[], cleanDir = false) {
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
