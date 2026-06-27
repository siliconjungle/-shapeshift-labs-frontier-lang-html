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
    recordCount: entries.reduce((sum, [, evidence]) => sum + evidence.recordCount, 0),
    sourceSpanRecordCount: entries.reduce((sum, [, evidence]) => sum + evidence.sourceSpanRecordCount, 0),
    sourceSpanMissingRecordCount: entries.reduce((sum, [, evidence]) => sum + evidence.sourceSpanMissingRecordCount, 0),
    attributeSpanElementCount: entries.reduce((sum, [, evidence]) => sum + evidence.attributeSpanElementCount, 0),
    attributeSpanMissingElementCount: entries.reduce((sum, [, evidence]) => sum + evidence.attributeSpanMissingElementCount, 0),
    structuralSpanRecordCount: entries.reduce((sum, [, evidence]) => sum + evidence.structuralSpanRecordCount, 0),
    structuralSpanMissingRecordCount: entries.reduce((sum, [, evidence]) => sum + evidence.structuralSpanMissingRecordCount, 0),
    leadingTriviaSpanRecordCount: entries.reduce((sum, [, evidence]) => sum + evidence.leadingTriviaSpanRecordCount, 0),
    sides: Object.fromEntries(entries)
  };
}

function treeParserEvidence(tree) {
  const records = tree.records ?? [];
  const sourceSpanRecordCount = records.filter(hasSourceSpan).length;
  const recordsWithAttributes = records.filter((record) => record.kind === 'element' && Object.keys(record.attributes ?? {}).length);
  const attributeSpanElementCount = recordsWithAttributes.filter(hasCompleteAttributeSpans).length;
  const structuralSpanRecordCount = records.filter(hasStructuralSpan).length;
  const leadingTriviaSpanRecordCount = records.filter((record) => hasSourceSpan(record) && hasStructuralSpan(record) && record.structuralSpan.startOffset !== record.sourceSpan.startOffset).length;
  return {
    parserName: tree.parser?.name ?? 'unknown',
    sourceCodeLocationInfo: tree.parser?.sourceCodeLocationInfo === true,
    parserBackedSourceSpans: records.some((record) => record.parser === 'parse5' && record.sourceSpan?.startOffset !== undefined),
    parserBackedAttributeSpans: records.some((record) => record.parser === 'parse5' && record.attributeSpans && Object.keys(record.attributeSpans).length),
    parserBackedTriviaSpans: records.some((record) => record.parser === 'parse5' && record.structuralSpan?.startOffset !== record.sourceSpan?.startOffset),
    parseErrors: tree.parser?.parseErrors?.length ?? 0,
    recordCount: records.length,
    sourceSpanRecordCount,
    sourceSpanMissingRecordCount: records.length - sourceSpanRecordCount,
    attributeSpanElementCount,
    attributeSpanMissingElementCount: recordsWithAttributes.length - attributeSpanElementCount,
    structuralSpanRecordCount,
    structuralSpanMissingRecordCount: records.length - structuralSpanRecordCount,
    leadingTriviaSpanRecordCount
  };
}

function hasSourceSpan(record) {
  return record.parser === 'parse5' && record.sourceSpan?.startOffset !== undefined && record.sourceSpan?.endOffset !== undefined;
}

function hasStructuralSpan(record) {
  return record.parser === 'parse5' && record.structuralSpan?.startOffset !== undefined && record.structuralSpan?.endOffset !== undefined;
}

function hasCompleteAttributeSpans(record) {
  const attributeNames = Object.keys(record.attributes ?? {});
  return Boolean(record.attributeSpans) && attributeNames.every((name) => record.attributeSpans[name]?.startOffset !== undefined && record.attributeSpans[name]?.endOffset !== undefined);
}

function unique(values) {
  return [...new Set(values.filter((value) => value !== undefined && value !== null && String(value)))];
}

export { mergeParserEvidence };
