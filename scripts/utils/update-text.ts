export type TextUpdate = {
  blockID: string;
  update: string;
};

export type SingleTextUpdate = TextUpdate & {
  text: string;
};

export type SingleTextUpdateResult = {
  updatedText: string;
  hasChanges: boolean;
};

/**
 * @param blockID {string} block to update (e.g. `<!-- START blockID -->`)
 * @param text {string} text to update
 * @param update {string} text to insert between blockID
 * @returns
 */
export const updateText = ({ blockID, text, update }: SingleTextUpdate): SingleTextUpdateResult => {
  const snippetIdentifier = `<!-- START ${blockID} -->`;
  const startSnippetPos = text.indexOf(snippetIdentifier);
  const endSnippetPos = text.indexOf(`<!-- END ${blockID} -->`);

  const startSnippet = text.slice(
    0,
    startSnippetPos + snippetIdentifier.length,
  );
  const endSnippet = text.slice(endSnippetPos);

  const currentText = text.slice(
    startSnippetPos + snippetIdentifier.length,
    endSnippetPos,
  );
  // console.log(currentText);
  const updatedText = `${startSnippet}\n${update}\n${endSnippet}`;
  const compared = currentText.trim().localeCompare(update.trim());

  if (compared === 0) {
    if (blockID !== "UPDATETIME") {
      console.log(`[update-text] No changes detected for ${blockID}`);
    }
  } else {
    console.log(`[update-text] Changes detected for ${blockID}`);
  }

  return {
    updatedText,
    hasChanges: compared !== 0,
  };
};

export const updateTexts = (
  originalText: string,
  updates: TextUpdate[],
): SingleTextUpdateResult => {
  let text = originalText;
  let hasChanges = false;
  for (const item of updates) {
    const { updatedText, hasChanges: itemHasChanges } = updateText({
      blockID: item.blockID,
      text,
      update: item.update,
    });
    text = updatedText;
    hasChanges = hasChanges || itemHasChanges;
  }
  return {
    updatedText: text,
    hasChanges: hasChanges,
  };
};
