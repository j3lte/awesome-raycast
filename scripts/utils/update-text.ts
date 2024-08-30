/**
 * @param blockID {string} block to update (e.g. `<!-- START blockID -->`)
 * @param text {string} text to update
 * @param update {string} text to insert between blockID
 * @returns
 */
const updateText = (
  blockID: string,
  text: string,
  update: string,
): {
  updatedText: string;
  hasChanges: boolean;
} => {
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
      console.log(`No changes detected for ${blockID}`);
    }
  } else {
    console.log(`Changes detected for ${blockID}`);
  }

  return {
    updatedText,
    hasChanges: compared !== 0,
  };
};

export default updateText;
