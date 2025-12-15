import { HistoryItem } from "../types/external.ts";

export const saveHistory = async (dataFile: string, historyItem: HistoryItem) => {
  const dataText = await Deno.readTextFile(dataFile);
  const data = JSON.parse(dataText) as HistoryItem[];
  const lastItem = data.length > 0 ? data[data.length - 1] : null;

  if (
    lastItem && lastItem.packages === historyItem.packages &&
    lastItem.authors === historyItem.authors &&
    lastItem.contributors === historyItem.contributors &&
    lastItem.onlyContributors === historyItem.onlyContributors &&
    lastItem.noPlatformSelected === historyItem.noPlatformSelected &&
    lastItem.macOnly === historyItem.macOnly && lastItem.withWindows === historyItem.withWindows &&
    lastItem.windowsOnly === historyItem.windowsOnly
  ) {
    return;
  }

  data.push(historyItem);
  await Deno.writeTextFile(
    dataFile,
    `[\n${data.map((item) => `  ${JSON.stringify(item)}`).join(",\n")}\n]`,
  );
};
