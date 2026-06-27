function mergeIdentityEvidence(trees) {
  const entries = Object.entries(trees).map(([side, tree]) => [side, treeIdentityEvidence(tree)]);
  return {
    kind: 'frontier.lang.htmlSafeMergeIdentityEvidence',
    version: 1,
    explicitIdentityAvailable: entries.every(([, evidence]) => evidence.explicitIdentityElementCount > 0 || evidence.elementCount === 0),
    parserBackedStructuralSpans: entries.every(([, evidence]) => evidence.parserBackedStructuralSpans === true),
    structuralAddressability: entries.every(([, evidence]) => evidence.structuralAddressableElementCount === evidence.explicitIdentityElementCount),
    pathOnlyIdentityElements: entries.reduce((sum, [, evidence]) => sum + evidence.pathOnlyIdentityElementCount, 0),
    duplicateExplicitIdentityElementCount: entries.reduce((sum, [, evidence]) => sum + evidence.duplicateExplicitIdentityElementCount, 0),
    duplicateExplicitIdentityKeys: unique(entries.flatMap(([, evidence]) => evidence.duplicateExplicitIdentityKeys)),
    runtimeBoundaryElements: entries.reduce((sum, [, evidence]) => sum + evidence.runtimeBoundaryElementCount, 0),
    frameworkBoundaryElements: entries.reduce((sum, [, evidence]) => sum + evidence.frameworkBoundaryElementCount, 0),
    sides: Object.fromEntries(entries)
  };
}

function treeIdentityEvidence(tree) {
  const records = tree.records ?? [];
  const elements = records.filter((record) => record.kind === 'element');
  const explicit = elements.filter((record) => record.explicitIdentity === true);
  const pathOnly = elements.filter((record) => record.explicitIdentity !== true);
  const structuralAddressable = explicit.filter((record) => record.startTagSpan?.startOffset !== undefined && record.structuralSpan?.startOffset !== undefined && record.fullSpan?.endOffset !== undefined);
  const gaps = elements.flatMap((record) => record.proofGaps ?? []);
  const duplicateGroups = duplicateExplicitIdentityGroups(explicit);
  return {
    elementCount: elements.length,
    explicitIdentityElementCount: explicit.length,
    pathOnlyIdentityElementCount: pathOnly.length,
    structuralAddressableElementCount: structuralAddressable.length,
    childOrderRecordCount: records.filter((record) => record.kind === 'child-order').length,
    parserBackedStructuralSpans: elements.every((record) => record.parser === 'parse5' && record.sourceSpan?.startOffset !== undefined && record.fullSpan?.endOffset !== undefined),
    explicitIdentityKeys: explicit.map((record) => record.key),
    duplicateExplicitIdentityElementCount: duplicateGroups.reduce((sum, group) => sum + group.records.length, 0),
    duplicateExplicitIdentityKeys: duplicateGroups.map((group) => group.key),
    runtimeBoundaryElementCount: gaps.filter((gap) => String(gap.code ?? '').endsWith('-runtime-boundary')).length,
    frameworkBoundaryElementCount: gaps.filter((gap) => gap.code === 'framework-directive-boundary' || gap.code === 'custom-element-runtime-boundary').length
  };
}

function duplicateExplicitIdentityGroups(records) {
  const groups = new Map();
  for (const record of records) {
    const key = record.key ?? `element#${record.identityKey}`;
    if (!key) continue;
    const group = groups.get(key) ?? { key, records: [] };
    group.records.push(record);
    groups.set(key, group);
  }
  return [...groups.values()].filter((group) => group.records.length > 1);
}

function unique(values) {
  return [...new Set(values.filter((value) => value !== undefined && value !== null && String(value)))];
}

export { mergeIdentityEvidence };
