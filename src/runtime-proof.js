import { hashSemanticValue } from '@shapeshift-labs/frontier-lang-kernel';
import { normalizeRuntimeProofCapsule, runtimeEvidenceMetadataFromProof, runtimeProofBroadClaimFields, validateRuntimeProofAgainstProbe } from '@shapeshift-labs/frontier-runtime-proof';

function createHtmlRuntimeProof(input = {}) {
  const runtime = runtimeEvidenceInput(input);
  return compactRecord({
    id: input.id,
    kind: input.kind ?? 'html-source-bound-browser-runtime-proof',
    status: input.status ?? 'passed',
    proofLevel: input.proofLevel ?? 'html-browser-runtime-source-bound',
    sourcePath: input.sourcePath,
    reasonCode: input.reasonCode,
    reasonCodes: input.reasonCodes,
    side: input.side ?? 'worker',
    sides: input.sides,
    recordKey: input.recordKey,
    recordKeys: input.recordKeys,
    boundaryKey: input.boundaryKey,
    boundaryKeys: input.boundaryKeys,
    boundary: input.boundary,
    boundaries: input.boundaries,
    attributeName: input.attributeName,
    attributeNames: input.attributeNames,
    boundaryAttributes: input.boundaryAttributes,
    changedBoundaryAttributes: input.changedBoundaryAttributes,
    baseSourceHash: sourceHash(input, 'base'),
    workerSourceHash: sourceHash(input, 'worker'),
    headSourceHash: sourceHash(input, 'head'),
    outputSourceHash: sourceHash(input, 'output'),
    runtimeCommand: runtime.command,
    runtimeProbeId: runtime.probeId,
    runtimeEvidenceHash: runtime.evidenceHash,
    runtimeSignals: runtime.signals,
    ...runtimeProofCapsuleFields(runtime),
    runtimeEvidence: compactRecord({
      command: runtime.command,
      probeId: runtime.probeId,
      evidenceHash: runtime.evidenceHash,
      signals: runtime.signals,
      capsule: runtime.capsule
    }),
    runtimeEvidenceBound: Boolean(runtime.command && runtime.probeId && runtime.evidenceHash && runtime.signals.length),
    browserRuntimeEquivalenceClaim: false,
    browserRenderEquivalenceClaim: false,
    semanticEquivalenceClaim: false,
    autoMergeClaim: false
  });
}

function createHtmlRuntimeBoundaryProof(input = {}) {
  return createHtmlRuntimeProof({ ...input, kind: input.kind ?? 'html-source-bound-runtime-boundary-proof' });
}

function admitHtmlRuntimeProofs({ id, sourcePath, input, proofGaps, binding, hash }) {
  const proofs = htmlRuntimeProofCandidates(input, sourcePath);
  const admitted = [];
  const conflicts = [];
  for (const item of proofGaps) {
    const proof = proofs.find((candidate) => isHtmlRuntimeProofForGap(candidate, item, sourcePath, binding, hash));
    if (proof) admitted.push(htmlRuntimeProofRecord(proof, item, sourcePath, binding, hash));
    else {
      const broadClaimProof = proofs.find((candidate) => {
        return runtimeProofBroadClaimFields(candidate).length > 0 &&
          isHtmlRuntimeProofForGap(candidate, item, sourcePath, binding, hash, { rejectBroadClaims: false });
      });
      conflicts.push(broadClaimProof
        ? broadClaimConflict(id, sourcePath, broadClaimProof, item)
        : conflict(id, sourcePath, 'html-proof-gap-blocked', item.gap.code, {
          recordKey: item.change.key,
          boundary: item.boundary,
          attributeName: item.attributeName,
          boundaryAttributes: item.boundaryAttributes,
          proofGap: item.gap
        }));
    }
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

function isHtmlRuntimeProofForGap(proof, item, sourcePath, binding, hash, options = {}) {
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
    (options.rejectBroadClaims === false || runtimeProofBroadClaimFields(proof).length === 0) &&
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
    ...runtimeProofCapsuleFields(runtimeEvidence),
    runtimeEvidenceBound: runtimeEvidence !== undefined,
    browserRuntimeEquivalenceClaim: true,
    browserRenderEquivalenceClaim: false,
    semanticEquivalenceClaim: false,
    autoMergeClaim: false
  };
}

function htmlRuntimeEvidenceMetadata(proof, reasonCode, boundary) {
  const requiredSignals = requiredHtmlRuntimeSignals(reasonCode, boundary);
  const capsule = normalizeRuntimeProofCapsule(proof);
  if (capsule?.valid === false) return undefined;
  if (capsule?.valid === true) {
    const validation = validateRuntimeProofAgainstProbe(proof, {
      id: `html-runtime-proof#${reasonCode ?? 'runtime'}#${boundary ?? 'boundary'}`, requiredSignals,
      requireRuntimeProofCapsule: true, requireTelemetryHash: true, requireDomSnapshotHash: true, requireComputedStyleHash: true, requireLayoutSnapshotHash: true,
      requireEventTraceHash: true, requireAccessibilitySnapshotHash: true, requireFocusSnapshotHash: true, requireLayoutShiftHash: true, requireScreenshotHash: true,
      maxCumulativeLayoutShift: typeof proof.maxCumulativeLayoutShift === 'number' ? proof.maxCumulativeLayoutShift : 0.01
    });
    return validation.ok ? validation.metadata : undefined;
  }
  const signals = runtimeSignals(proof);
  const command = firstString(proof.runtimeCommand, proof.browserCommand, proof.command, proof.commandId, proof.probeCommand, proof.evidence?.command, proof.runtimeEvidence?.command, proof.browserEvidence?.command);
  const probeId = firstString(proof.runtimeProbeId, proof.browserProbeId, proof.probeId, proof.probe?.id, proof.evidence?.probeId, proof.runtimeEvidence?.probeId, proof.browserEvidence?.probeId);
  const evidenceHash = firstString(proof.runtimeEvidenceHash, proof.browserEvidenceHash, proof.evidenceHash, proof.domEvidenceHash, proof.renderEvidenceHash, proof.hydrationEvidenceHash, proof.resourceEvidenceHash, proof.evidence?.hash, proof.evidence?.evidenceHash, proof.runtimeEvidence?.hash, proof.runtimeEvidence?.evidenceHash, proof.browserEvidence?.hash, proof.browserEvidence?.evidenceHash);
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
  if (text.includes('custom-runtime-attribute')) return ['html-custom-runtime-attribute-runtime', 'custom-runtime-attribute-runtime'];
  if (text.includes('framework-directive')) return ['html-framework-directive-runtime', 'framework-directive-runtime'];
  if (text.includes('script')) return ['html-script-runtime', 'script-runtime', 'browser-script-runtime'];
  return ['html-browser-runtime', 'browser-runtime'];
}

function firstString(...values) { return values.find((value) => typeof value === 'string' && value.length > 0); }
function uniqueStrings(values) { return [...new Set(values)]; }

function conflict(id, sourcePath, code, reasonCode, details = {}) {
  return { code, gateId: 'html-semantic-merge', sourcePath, details: { reasonCode, conflictKey: `html#${id}#${reasonCode}#${details.recordKey ?? sourcePath ?? 'source'}`, ...details } };
}

function broadClaimConflict(id, sourcePath, proof, item) {
  return conflict(id, sourcePath, 'html-runtime-proof-broad-claim', 'html-runtime-proof-broad-claim', {
    proofId: proof.id,
    recordKey: item.change.key,
    boundary: item.boundary,
    attributeName: item.attributeName,
    boundaryAttributes: item.boundaryAttributes,
    proofGap: item.gap,
    broadClaimFields: runtimeProofBroadClaimFields(proof),
    proofGapCode: item.gap.code,
    summary: 'HTML runtime proofs cannot self-assert broad browser, render, semantic, or auto-merge equivalence claims.'
  });
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

function runtimeEvidenceInput(input) {
  const capsule = normalizeRuntimeProofCapsule(input);
  if (capsule?.valid === false) return {};
  if (capsule?.valid === true) return runtimeEvidenceMetadataFromProof(input) ?? {};
  return {
    command: firstString(input.runtimeCommand, input.browserCommand, input.command, input.commandId, input.probeCommand, input.evidence?.command, input.runtimeEvidence?.command, input.browserEvidence?.command),
    probeId: firstString(input.runtimeProbeId, input.browserProbeId, input.probeId, input.probe?.id, input.evidence?.probeId, input.runtimeEvidence?.probeId, input.browserEvidence?.probeId),
    evidenceHash: firstString(input.runtimeEvidenceHash, input.browserEvidenceHash, input.evidenceHash, input.domEvidenceHash, input.renderEvidenceHash, input.hydrationEvidenceHash, input.resourceEvidenceHash, input.evidence?.hash, input.evidence?.evidenceHash, input.runtimeEvidence?.hash, input.runtimeEvidence?.evidenceHash, input.browserEvidence?.hash, input.browserEvidence?.evidenceHash),
    signals: runtimeSignals(input)
  };
}

function runtimeProofCapsuleFields(runtime = {}) {
  const capsule = runtime?.capsule;
  return compactRecord({
    runtimeProofCapsule: capsule,
    runtimeProofMode: capsule?.mode,
    runtimeProofCapsuleHash: capsule?.hash,
    runtimeBrowserName: capsule?.browserName,
    runtimeBrowserVersion: capsule?.browserVersion,
    runtimeViewport: capsule?.viewport,
    runtimeTelemetryHash: capsule?.telemetryHash,
    runtimeDomSnapshotHash: capsule?.domSnapshotHash,
    runtimeComputedStyleHash: capsule?.computedStyleHash,
    runtimeLayoutSnapshotHash: capsule?.layoutSnapshotHash,
    runtimeEventTraceHash: capsule?.eventTraceHash,
    runtimeAccessibilitySnapshotHash: capsule?.accessibilitySnapshotHash,
    runtimeFocusSnapshotHash: capsule?.focusSnapshotHash,
    runtimeLayoutShiftHash: capsule?.layoutShiftHash,
    runtimeScreenshotHash: capsule?.screenshotHash,
    runtimeCumulativeLayoutShift: capsule?.cumulativeLayoutShift
  });
}

function sourceHash(input, role) {
  const hashFields = role === 'output' ? ['outputSourceHash', 'mergedSourceHash'] : [`${role}SourceHash`];
  for (const field of hashFields) if (firstHashString(input[field])) return firstHashString(input[field]);
  for (const alias of roleAliases(role)) {
    if (firstHashString(input.sourceHashes?.[alias], input.hashes?.[alias])) return firstHashString(input.sourceHashes?.[alias], input.hashes?.[alias]);
    const sourceText = firstSourceString(input[`${alias}SourceText`], input.sourceTexts?.[alias], input.sources?.[alias], input[alias]);
    if (sourceText !== undefined) return hashSemanticValue(sourceText);
  }
  return undefined;
}

function roleAliases(role) { return role === 'output' ? ['output', 'merged'] : [role]; }
function firstHashString(...values) { return values.find((value) => typeof value === 'string' && value.length > 0); }
function firstSourceString(...values) { return values.find((value) => typeof value === 'string'); }
function compactRecord(record) { return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined && !(Array.isArray(value) && value.length === 0))); }

const HtmlRuntimeProofKinds = new Set(['html-browser-runtime-proof', 'html-source-bound-browser-runtime-proof', 'html-source-bound-runtime-proof', 'html-runtime-boundary-proof', 'html-source-bound-runtime-boundary-proof']);

export { admitHtmlRuntimeProofs, createHtmlRuntimeBoundaryProof, createHtmlRuntimeProof };
