import { hashSemanticValue } from '@shapeshift-labs/frontier-lang-kernel';

function classTokenMergePlan(input = {}) {
  return htmlTokenListMergePlan({
    ...input,
    attributeName: 'class',
    tokenSetSemantics: 'html-class-space-separated-tokens',
    evidenceKind: 'frontier.lang.htmlClassTokenMergeEvidence',
    duplicateReasonCode: 'html-class-token-duplicate-conflict',
    orderReasonCode: 'html-class-token-order-conflict'
  });
}

function htmlTokenListMergePlan(input = {}) {
  const attributeName = String(input.attributeName ?? '').toLowerCase();
  if (!isHtmlTokenListMergeAttribute(attributeName)) {
    return blocked('html-token-list-attribute-unsupported', { attributeName });
  }
  const base = tokenListInfo(input.baseValue);
  const worker = tokenListInfo(input.workerValue);
  const head = tokenListInfo(input.headValue);
  const duplicateSides = [
    duplicateSide('base', base),
    duplicateSide('worker', worker),
    duplicateSide('head', head)
  ].filter(Boolean);
  const duplicateReasonCode = input.duplicateReasonCode ?? 'html-token-list-duplicate-conflict';
  if (duplicateSides.length) return blocked(duplicateReasonCode, { attributeName, duplicateSides });

  const workerOrderOnly = sameTokenSet(base.tokens, worker.tokens) && base.normalized !== worker.normalized;
  const headOrderOnly = sameTokenSet(base.tokens, head.tokens) && base.normalized !== head.normalized;
  const orderReasonCode = input.orderReasonCode ?? 'html-token-list-order-conflict';
  if ((workerOrderOnly || headOrderOnly) && worker.normalized !== head.normalized) {
    return blocked(orderReasonCode, { attributeName, workerOrderOnly, headOrderOnly });
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
    kind: input.evidenceKind ?? 'frontier.lang.htmlTokenListMergeEvidence',
    version: 1,
    sourcePath: input.sourcePath,
    recordKey: input.recordKey,
    attributeName,
    parserBackedTokenList: true,
    parserBackedClassList: attributeName === 'class' ? true : undefined,
    tokenSetSemantics: input.tokenSetSemantics ?? `html-${attributeName}-space-separated-tokens`,
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
    attributeName,
    value: outputValue,
    evidence: {
      ...evidence,
      evidenceHash: hashSemanticValue(evidence)
    }
  };
}

function isHtmlTokenListMergeAttribute(attributeName) {
  return SafeHtmlTokenListMergeAttributes.has(String(attributeName ?? '').toLowerCase());
}

function tokenListInfo(value) {
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

const SafeHtmlTokenListMergeAttributes = new Set([
  'class',
  'part',
  'itemprop'
]);

export { classTokenMergePlan, htmlTokenListMergePlan, isHtmlTokenListMergeAttribute };
