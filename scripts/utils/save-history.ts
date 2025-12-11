import { HistoryItem } from "../types/index.ts";

export const saveHistory = async (dataFile: string, historyItem: HistoryItem) => {
  const dataText = await Deno.readTextFile(dataFile);
  const data = JSON.parse(dataText) as HistoryItem[];
  const lastItem = data.length > 0 ? data[data.length - 1] : null;

  if (lastItem && lastItem.timestamp === historyItem.timestamp) {
    return;
  }

  data.push(historyItem);
  await Deno.writeTextFile(
    dataFile,
    `[${data.map((item) => `  ${JSON.stringify(item)}`).join(",\n")}]`,
  );
};
