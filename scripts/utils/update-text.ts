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
): string => {
  const snippetIdentifier = `<!-- START ${blockID} -->`;
  const startSnippetPos = text.indexOf(snippetIdentifier);
  const endSnippetPos = text.indexOf(`<!-- END ${blockID} -->`);

  const startSnippet = text.slice(
    0,
    startSnippetPos + snippetIdentifier.length,
  );
  const endSnippet = text.slice(endSnippetPos);

  const updatedText = `${startSnippet}\n${update}\n${endSnippet}`;

  return updatedText;
};

export default updateText;
