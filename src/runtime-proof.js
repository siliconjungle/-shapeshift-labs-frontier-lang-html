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
    htmlProofSourceMatches(proof, 'output', binding.output, hash) &&
    htmlRuntimeEvidenceMetadata(proof, item.gap.code, item.boundary) !== undefined;
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
  const runtimeEvidence = htmlRuntimeEvidenceMetadata(proof, item.gap.code, item.boundary);
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
    outputSourceHash: hash?.(binding.output),
    runtimeCommand: runtimeEvidence?.command,
    runtimeProbeId: runtimeEvidence?.probeId,
    runtimeEvidenceHash: runtimeEvidence?.evidenceHash,
    runtimeSignals: runtimeEvidence?.signals,
    requiredRuntimeSignals: runtimeEvidence?.requiredSignals,
    runtimeEvidenceBound: runtimeEvidence !== undefined,
    browserRuntimeEquivalenceClaim: true,
    browserRenderEquivalenceClaim: false,
    semanticEquivalenceClaim: false,
    autoMergeClaim: false
  };
}

function htmlRuntimeEvidenceMetadata(proof, reasonCode, boundary) {
  const requiredSignals = requiredHtmlRuntimeSignals(reasonCode, boundary);
  const signals = runtimeSignals(proof);
  const command = firstString(
    proof.runtimeCommand,
    proof.browserCommand,
    proof.command,
    proof.commandId,
    proof.probeCommand,
    proof.evidence?.command,
    proof.runtimeEvidence?.command,
    proof.browserEvidence?.command
  );
  const probeId = firstString(
    proof.runtimeProbeId,
    proof.browserProbeId,
    proof.probeId,
    proof.probe?.id,
    proof.evidence?.probeId,
    proof.runtimeEvidence?.probeId,
    proof.browserEvidence?.probeId
  );
  const evidenceHash = firstString(
    proof.runtimeEvidenceHash,
    proof.browserEvidenceHash,
    proof.evidenceHash,
    proof.domEvidenceHash,
    proof.renderEvidenceHash,
    proof.hydrationEvidenceHash,
    proof.resourceEvidenceHash,
    proof.evidence?.hash,
    proof.evidence?.evidenceHash,
    proof.runtimeEvidence?.hash,
    proof.runtimeEvidence?.evidenceHash,
    proof.browserEvidence?.hash,
    proof.browserEvidence?.evidenceHash
  );
  const hasRequiredSignal = requiredSignals.some((signal) => signals.includes(signal));
  if (!command || !probeId || !evidenceHash || !hasRequiredSignal) return undefined;
  return { command, probeId, evidenceHash, signals, requiredSignals };
}

function runtimeSignals(proof) {
  return uniqueStrings([
    ...signalsFromValue(proof.runtimeSignals),
    ...signalsFromValue(proof.browserSignals),
    ...signalsFromValue(proof.evidenceSignals),
    ...signalsFromValue(proof.probeSignals),
    ...signalsFromValue(proof.evidence?.signals),
    ...signalsFromValue(proof.runtimeEvidence?.signals),
    ...signalsFromValue(proof.browserEvidence?.signals)
  ]);
}

function signalsFromValue(value) {
  if (typeof value === 'string' && value.length > 0) return [value];
  if (Array.isArray(value)) return value.filter((item) => typeof item === 'string' && item.length > 0);
  if (value && typeof value === 'object') return Object.keys(value).filter((key) => value[key] === true || value[key] === 'passed');
  return [];
}

function requiredHtmlRuntimeSignals(reasonCode, boundary) {
  const text = `${reasonCode ?? ''} ${boundary ?? ''}`.toLowerCase();
  if (text.includes('iframe-srcdoc')) return ['html-iframe-srcdoc-runtime', 'iframe-srcdoc-runtime'];
  if (text.includes('iframe')) return ['html-iframe-runtime', 'iframe-runtime'];
  if (text.includes('event-handler')) return ['html-event-handler-runtime', 'event-handler-runtime'];
  if (text.includes('inline-style') || text.includes('style')) return ['html-inline-style-runtime', 'html-style-runtime', 'css-cascade-runtime'];
  if (text.includes('form-submitter')) return ['html-form-submitter-runtime', 'form-submitter-runtime', 'html-form-runtime'];
  if (text.includes('form-control')) return ['html-form-control-runtime', 'form-control-runtime', 'html-form-runtime'];
  if (text.includes('form')) return ['html-form-runtime', 'form-runtime'];
  if (text.includes('document-base')) return ['html-document-base-runtime', 'document-base-runtime'];
  if (text.includes('document-metadata')) return ['html-document-metadata-runtime', 'document-metadata-runtime'];
  if (text.includes('resource-loading')) return ['html-resource-loading-runtime', 'resource-loading-runtime'];
  if (text.includes('template')) return ['html-template-runtime', 'template-runtime'];
  if (text.includes('slot')) return ['html-slot-runtime', 'slot-runtime'];
  if (text.includes('custom-element')) return ['html-custom-element-runtime', 'custom-element-runtime'];
  if (text.includes('framework-directive')) return ['html-framework-directive-runtime', 'framework-directive-runtime'];
  if (text.includes('script')) return ['html-script-runtime', 'script-runtime', 'browser-script-runtime'];
  return ['html-browser-runtime', 'browser-runtime'];
}

function firstString(...values) {
  return values.find((value) => typeof value === 'string' && value.length > 0);
}

function uniqueStrings(values) {
  return [...new Set(values)];
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
