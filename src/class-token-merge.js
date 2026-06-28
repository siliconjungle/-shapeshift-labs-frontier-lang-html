import { hashSemanticValue } from '@shapeshift-labs/frontier-lang-kernel';

function classTokenMergePlan(input = {}) {
  const base = classTokenInfo(input.baseValue);
  const worker = classTokenInfo(input.workerValue);
  const head = classTokenInfo(input.headValue);
  const duplicateSides = [
    duplicateSide('base', base),
    duplicateSide('worker', worker),
    duplicateSide('head', head)
  ].filter(Boolean);
  if (duplicateSides.length) return blocked('html-class-token-duplicate-conflict', { duplicateSides });

  const workerOrderOnly = sameTokenSet(base.tokens, worker.tokens) && base.normalized !== worker.normalized;
  const headOrderOnly = sameTokenSet(base.tokens, head.tokens) && base.normalized !== head.normalized;
  if ((workerOrderOnly || headOrderOnly) && worker.normalized !== head.normalized) {
    return blocked('html-class-token-order-conflict', { workerOrderOnly, headOrderOnly });
  }

  const baseSet = new Set(base.tokens);
  const workerSet = new Set(worker.tokens);
  const headSet = new Set(head.tokens);
  const workerAddedTokens = worker.tokens.filter((token) => !baseSet.has(token));
  const headAddedTokens = head.tokens.filter((token) => !baseSet.has(token));
  const workerRemovedTokens = base.tokens.filter((token) => !workerSet.has(token));
  const headRemovedTokens = base.tokens.filter((token) => !headSet.has(token));
  const removed = new Set([...workerRemovedTokens, ...headRemovedTokens]);
  const mergedTokens = [
    ...head.tokens.filter((token) => !removed.has(token)),
    ...workerAddedTokens.filter((token) => !headSet.has(token))
  ];
  const outputValue = mergedTokens.length ? mergedTokens.join(' ') : undefined;
  const evidence = {
    kind: 'frontier.lang.htmlClassTokenMergeEvidence',
    version: 1,
    sourcePath: input.sourcePath,
    recordKey: input.recordKey,
    attributeName: 'class',
    parserBackedClassList: true,
    tokenSetSemantics: 'html-class-space-separated-tokens',
    mergePolicy: 'head-order-plus-worker-additions-minus-either-side-removals',
    baseTokens: base.tokens,
    workerTokens: worker.tokens,
    headTokens: head.tokens,
    mergedTokens,
    workerAddedTokens,
    workerRemovedTokens,
    headAddedTokens,
    headRemovedTokens,
    outputValue,
    autoMergeClaim: false,
    semanticEquivalenceClaim: false,
    browserRuntimeEquivalenceClaim: false,
    browserRenderEquivalenceClaim: false
  };
  return {
    status: 'merged',
    value: outputValue,
    evidence: {
      ...evidence,
      evidenceHash: hashSemanticValue(evidence)
    }
  };
}

function classTokenInfo(value) {
  if (value === undefined || value === null || value === true) {
    return { value, normalized: '', tokens: [], duplicateTokens: [] };
  }
  const tokens = String(value).trim().split(/\s+/).filter(Boolean);
  return {
    value,
    normalized: tokens.join(' '),
    tokens,
    duplicateTokens: duplicateTokens(tokens)
  };
}

function duplicateSide(side, info) {
  return info.duplicateTokens.length ? { side, duplicateTokens: info.duplicateTokens } : undefined;
}

function duplicateTokens(tokens) {
  const seen = new Set();
  const duplicates = new Set();
  for (const token of tokens) {
    if (seen.has(token)) duplicates.add(token);
    seen.add(token);
  }
  return [...duplicates];
}

function sameTokenSet(left = [], right = []) {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((token) => rightSet.has(token));
}

function blocked(reasonCode, details = {}) {
  return { status: 'blocked', reasonCode, details };
}

export { classTokenMergePlan };
