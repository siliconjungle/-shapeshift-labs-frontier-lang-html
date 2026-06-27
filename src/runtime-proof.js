function admitHtmlRuntimeProofs({ id, sourcePath, input, proofGaps, binding, hash }) {
  const proofs = htmlRuntimeProofCandidates(input, sourcePath);
  const admitted = [];
  const conflicts = [];
  for (const item of proofGaps) {
    const proof = proofs.find((candidate) => isHtmlRuntimeProofForGap(candidate, item, sourcePath, binding, hash));
    if (proof) admitted.push(htmlRuntimeProofRecord(proof, item, sourcePath, binding, hash));
    else conflicts.push(conflict(id, sourcePath, 'html-proof-gap-blocked', item.gap.code, {
      recordKey: item.change.key,
      boundary: item.boundary,
      attributeName: item.attributeName,
      boundaryAttributes: item.boundaryAttributes,
      proofGap: item.gap
    }));
  }
  return { proofs: admitted, conflicts };
}

function htmlRuntimeProofCandidates(input = {}, sourcePath) {
  return [
    input.htmlBrowserRuntimeProof,
    input.htmlBrowserRuntimeProofs,
    input.htmlBrowserRuntimeProofsByPath?.[sourcePath],
    input.htmlSourceBoundRuntimeProof,
    input.htmlSourceBoundRuntimeProofs,
    input.htmlSourceBoundRuntimeProofsByPath?.[sourcePath],
    input.htmlRuntimeBoundaryProof,
    input.htmlRuntimeBoundaryProofs,
    input.htmlRuntimeBoundaryProofsByPath?.[sourcePath],
    input.htmlSourceBoundRuntimeBoundaryProof,
    input.htmlSourceBoundRuntimeBoundaryProofs,
    input.htmlSourceBoundRuntimeBoundaryProofsByPath?.[sourcePath],
    input.browserRuntimeProof,
    input.browserRuntimeProofs,
    input.browserRuntimeProofsByPath?.[sourcePath],
    input.sourceBoundRuntimeProof,
    input.sourceBoundRuntimeProofs,
    input.sourceBoundRuntimeProofsByPath?.[sourcePath]
  ].flatMap(asArray).filter(Boolean);
}

function isHtmlRuntimeProofForGap(proof, item, sourcePath, binding, hash) {
  return Boolean(proof && typeof proof === 'object') &&
    HtmlRuntimeProofKinds.has(proof.kind) &&
    proof.status === 'passed' &&
    proof.sourcePath === sourcePath &&
    proofCoversValue(proof.reasonCode, proof.reasonCodes, item.gap.code) &&
    proofCoversValue(proof.side, proof.sides, item.change.side) &&
    proofCoversRecordOrBoundary(proof, item) &&
    proofCoversOptionalBoundary(proof.boundary, proof.boundaries, item.boundary) &&
    proofCoversOptionalValue(proof.attributeName, proof.attributeNames ?? proof.boundaryAttributes ?? proof.changedBoundaryAttributes, item.attributeName) &&
    htmlProofSourceMatches(proof, 'base', binding.base, hash) &&
    htmlProofSourceMatches(proof, 'worker', binding.worker, hash) &&
    htmlProofSourceMatches(proof, 'head', binding.head, hash) &&
    htmlProofSourceMatches(proof, 'output', binding.output, hash);
}

function htmlProofSourceMatches(proof, role, sourceText, hash) {
  if (typeof sourceText !== 'string') return false;
  const sourceHash = hash?.(sourceText);
  const textFields = role === 'output' ? ['outputSourceText', 'mergedSourceText'] : [`${role}SourceText`];
  const hashFields = role === 'output' ? ['outputSourceHash', 'mergedSourceHash'] : [`${role}SourceHash`];
  const aliases = role === 'output' ? ['output', 'merged'] : [role];
  return textFields.some((field) => proof[field] === sourceText) ||
    aliases.some((alias) => proof.sourceTexts?.[alias] === sourceText || proof.sources?.[alias] === sourceText) ||
    hashFields.some((field) => sourceHash !== undefined && proof[field] === sourceHash) ||
    aliases.some((alias) => sourceHash !== undefined && (proof.sourceHashes?.[alias] === sourceHash || proof.hashes?.[alias] === sourceHash));
}

function htmlRuntimeProofRecord(proof, item, sourcePath, binding, hash) {
  return {
    id: proof.id,
    kind: proof.kind,
    status: 'passed',
    proofLevel: proof.proofLevel ?? 'html-browser-runtime-source-bound',
    reasonCode: item.gap.code,
    side: item.change.side,
    recordKey: item.change.key,
    boundary: item.boundary,
    attributeName: item.attributeName,
    boundaryAttributes: item.boundaryAttributes,
    sourcePath,
    baseSourceHash: hash?.(binding.base),
    workerSourceHash: hash?.(binding.worker),
    headSourceHash: hash?.(binding.head),
    outputSourceHash: hash?.(binding.output)
  };
}

function conflict(id, sourcePath, code, reasonCode, details = {}) {
  return { code, gateId: 'html-semantic-merge', sourcePath, details: { reasonCode, conflictKey: `html#${id}#${reasonCode}#${details.recordKey ?? sourcePath ?? 'source'}`, ...details } };
}

function proofCoversRecordOrBoundary(proof, item) {
  return proofCoversValue(proof.recordKey ?? proof.boundaryKey, proof.recordKeys ?? proof.boundaryKeys, item.change.key) ||
    (item.boundary !== undefined && proofCoversValue(proof.boundary, proof.boundaries, item.boundary));
}

function proofCoversOptionalValue(value, values, expected) {
  return expected === undefined || proofCoversValue(value, values, expected);
}

function proofCoversOptionalBoundary(value, values, expected) {
  if (expected === undefined) return true;
  if (value === undefined && values === undefined) return true;
  return proofCoversValue(value, values, expected);
}

function proofCoversValue(value, values, expected) { return value === expected || (Array.isArray(values) && values.includes(expected)); }
function asArray(value) { return Array.isArray(value) ? value : value === undefined ? [] : [value]; }

const HtmlRuntimeProofKinds = new Set(['html-browser-runtime-proof', 'html-source-bound-browser-runtime-proof', 'html-source-bound-runtime-proof', 'html-runtime-boundary-proof', 'html-source-bound-runtime-boundary-proof']);

export { admitHtmlRuntimeProofs };
