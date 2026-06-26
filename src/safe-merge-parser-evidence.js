function mergeParserEvidence(trees) {
  const entries = Object.entries(trees).map(([side, tree]) => [side, treeParserEvidence(tree)]);
  return {
    kind: 'frontier.lang.htmlSafeMergeParserEvidence',
    version: 1,
    parserNames: unique(entries.map(([, evidence]) => evidence.parserName)),
    sourceCodeLocationInfo: entries.every(([, evidence]) => evidence.sourceCodeLocationInfo === true),
    parserBackedSourceSpans: entries.every(([, evidence]) => evidence.parserBackedSourceSpans === true),
    parserBackedAttributeSpans: entries.every(([, evidence]) => evidence.parserBackedAttributeSpans === true),
    parserBackedTriviaSpans: entries.every(([, evidence]) => evidence.parserBackedTriviaSpans === true),
    parseErrors: entries.reduce((sum, [, evidence]) => sum + evidence.parseErrors, 0),
    sides: Object.fromEntries(entries)
  };
}

function treeParserEvidence(tree) {
  const records = tree.records ?? [];
  return {
    parserName: tree.parser?.name ?? 'unknown',
    sourceCodeLocationInfo: tree.parser?.sourceCodeLocationInfo === true,
    parserBackedSourceSpans: records.some((record) => record.parser === 'parse5' && record.sourceSpan?.startOffset !== undefined),
    parserBackedAttributeSpans: records.some((record) => record.parser === 'parse5' && record.attributeSpans && Object.keys(record.attributeSpans).length),
    parserBackedTriviaSpans: records.some((record) => record.parser === 'parse5' && record.structuralSpan?.startOffset !== record.sourceSpan?.startOffset),
    parseErrors: tree.parser?.parseErrors?.length ?? 0,
    recordCount: records.length
  };
}

function unique(values) {
  return [...new Set(values.filter((value) => value !== undefined && value !== null && String(value)))];
}

export { mergeParserEvidence };
