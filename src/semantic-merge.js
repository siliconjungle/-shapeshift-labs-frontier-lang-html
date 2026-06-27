import { hashSemanticValue } from '@shapeshift-labs/frontier-lang-kernel';
import { parseHtmlMergeTree } from './parser-evidence.js';
import { admitHtmlRuntimeProofs } from './runtime-proof.js';
import { mergeIdentityEvidence } from './safe-merge-identity-evidence.js';
import { mergeParserEvidence } from './safe-merge-parser-evidence.js';
import { structuralConflicts, structuralPatchPlan } from './semantic-merge-structure.js';

function safeMergeHtmlSource(input = {}) {
  const id = String(input.id ?? 'html_safe_merge');
  const sourcePath = input.sourcePath;
  const base = input.baseSourceText;
  const worker = input.workerSourceText ?? base;
  const head = input.headSourceText ?? base;
  if (typeof base !== 'string' || typeof worker !== 'string' || typeof head !== 'string') return blocked(id, sourcePath, 'html-source-text-missing');
  if (worker === head) return singleSideMerge(id, sourcePath, base, worker, 'worker-head-identical', input, 'worker', worker, head);
  if (worker === base) return singleSideMerge(id, sourcePath, base, head, 'worker-unchanged', input, 'head', worker, head);
  if (head === base) return singleSideMerge(id, sourcePath, base, worker, 'head-unchanged', input, 'worker', worker, head);
  const trees = { base: parseMergeTree(base, sourcePath), worker: parseMergeTree(worker, sourcePath), head: parseMergeTree(head, sourcePath) };
  const changes = {
    worker: changedRecords(trees.base.index, trees.worker.index, 'worker'),
    head: changedRecords(trees.base.index, trees.head.index, 'head')
  };
  const parserConflicts = parserRecoveryConflicts(id, sourcePath, trees);
  const structuralMergeConflicts = [
    ...structuralConflicts(id, sourcePath, changes.worker, changes.head),
    ...structuralConflicts(id, sourcePath, changes.head, changes.worker),
    ...overlapConflicts(id, sourcePath, changes.worker, changes.head)
  ];
  const patch = structuralPatchPlan(id, sourcePath, changes.worker, trees.worker, trees.head);
  const mergedSourceText = patch.conflicts.length ? undefined : applyReplacements(head, patch.replacements);
  const runtimeAdmission = admitHtmlRuntimeProofs({
    id,
    sourcePath,
    input,
    proofGaps: runtimeProofChecks([...changes.worker, ...changes.head]),
    binding: { base, worker, head, output: mergedSourceText },
    hash: hashSemanticValue
  });
  const conflicts = [
    ...parserConflicts,
    ...runtimeAdmission.conflicts,
    ...structuralMergeConflicts,
    ...patch.conflicts
  ];
  const parserEvidence = mergeParserEvidence(trees);
  const identityEvidence = mergeIdentityEvidence(trees);
  if (conflicts.length) return blocked(id, sourcePath, 'html-semantic-merge-conflict', conflicts, { parserEvidence, identityEvidence, htmlRuntimeProofs: runtimeAdmission.proofs });
  return merged(id, sourcePath, mergedSourceText, 'semantic-html-merge', {
    baseTreeHash: trees.base.treeHash,
    workerTreeHash: trees.worker.treeHash,
    headTreeHash: trees.head.treeHash,
    workerChangedRecords: changes.worker.length,
    headChangedRecords: changes.head.length,
    parserEvidence,
    identityEvidence,
    htmlRuntimeProofs: runtimeAdmission.proofs,
    browserRuntimeEquivalenceClaim: runtimeAdmission.proofs.length > 0
  });
}

function singleSideMerge(id, sourcePath, base, current, operation, input, side, worker, head) {
  if (base === current) return merged(id, sourcePath, current, operation);
  const trees = { base: parseMergeTree(base, sourcePath), [side]: parseMergeTree(current, sourcePath) };
  const changes = changedRecords(trees.base.index, trees[side].index, side);
  const runtimeAdmission = admitHtmlRuntimeProofs({
    id,
    sourcePath,
    input,
    proofGaps: runtimeProofChecks(changes),
    binding: { base, worker, head, output: current },
    hash: hashSemanticValue
  });
  const conflicts = [
    ...parserRecoveryConflicts(id, sourcePath, trees),
    ...runtimeAdmission.conflicts,
    ...structuralConflicts(id, sourcePath, changes)
  ];
  const parserEvidence = mergeParserEvidence(trees);
  const identityEvidence = mergeIdentityEvidence(trees);
  if (conflicts.length) return blocked(id, sourcePath, 'html-semantic-merge-conflict', conflicts, { parserEvidence, identityEvidence, htmlRuntimeProofs: runtimeAdmission.proofs });
  return merged(id, sourcePath, current, operation, {
    baseTreeHash: trees.base.treeHash,
    mergedTreeHash: trees[side].treeHash,
    changedRecords: changes.length,
    parserEvidence,
    identityEvidence,
    htmlRuntimeProofs: runtimeAdmission.proofs,
    browserRuntimeEquivalenceClaim: runtimeAdmission.proofs.length > 0
  });
}

function parseMergeTree(sourceText, sourcePath) {
  return parseHtmlMergeTree(sourceText, { sourcePath });
}

function changedRecords(baseIndex, currentIndex, side) {
  const keys = unique([...baseIndex.keys(), ...currentIndex.keys()]);
  return keys.flatMap((key) => {
    const before = baseIndex.get(key);
    const after = currentIndex.get(key);
    if ((before?.recordHash ?? '') === (after?.recordHash ?? '')) return [];
    return [{ side, key, before, after, kind: before && after ? 'update' : before ? 'delete' : 'add' }];
  });
}

function proofGapChecks(changes) {
  return changes.flatMap((change) => {
    const record = change.after ?? change.before;
    return (record?.proofGaps ?? []).map((gap) => ({ change, gap }));
  });
}

function runtimeProofChecks(changes) {
  return [...proofGapChecks(changes), ...eventHandlerRuntimeChecks(changes)];
}

function eventHandlerRuntimeChecks(changes) {
  return changes.flatMap((change) => {
    const before = change.before?.kind === 'element' ? change.before.attributes ?? {} : {};
    const after = change.after?.kind === 'element' ? change.after.attributes ?? {} : {};
    return attributeChanges(before, after)
      .filter((attribute) => /^on[\w:.-]+$/i.test(attribute.name))
      .map((attribute) => ({
        change,
        attributeName: attribute.name.toLowerCase(),
        boundary: 'html-event-handler-attribute',
        boundaryAttributes: [attribute.name.toLowerCase()],
        gap: proofGap('event-handler-runtime-boundary', 'HTML event handler attributes execute in the browser runtime and require source-bound host evidence.')
      }));
  });
}

function parserRecoveryConflicts(id, sourcePath, trees) {
  return Object.entries(trees).flatMap(([side, tree]) => (tree.proofGaps ?? [])
    .filter((gap) => gap.code === 'html-parser-recovery')
    .map((gap) => conflict(id, sourcePath, 'html-parser-recovery-blocked', gap.code, { side, proofGap: gap })));
}

function overlapConflicts(id, sourcePath, workerChanges, headChanges) {
  const headByKey = new Map(headChanges.map((change) => [change.key, change]));
  return workerChanges.flatMap((workerChange) => {
    const headChange = headByKey.get(workerChange.key);
    if (!headChange || sameChange(workerChange, headChange)) return [];
    if (workerChange.after?.kind === 'element' && headChange.after?.kind === 'element') return elementOverlapConflicts(id, sourcePath, workerChange, headChange);
    return [conflict(id, sourcePath, 'html-record-conflict', 'html-record-conflict', { recordKey: workerChange.key, worker: changeSummary(workerChange), head: changeSummary(headChange) })];
  });
}

function elementOverlapConflicts(id, sourcePath, workerChange, headChange) {
  if (workerChange.after.tagName !== headChange.after.tagName) return [conflict(id, sourcePath, 'html-element-tag-conflict', 'html-element-tag-conflict', { recordKey: workerChange.key })];
  return sharedAttributeConflicts(workerChange, headChange).map((attributeName) => conflict(id, sourcePath, 'html-attribute-conflict', 'html-attribute-conflict', {
    recordKey: workerChange.key,
    attributeName,
    workerValue: workerChange.after.attributes[attributeName],
    headValue: headChange.after.attributes[attributeName]
  }));
}

function attributeChanges(before = {}, after = {}) {
  return unique([...Object.keys(before), ...Object.keys(after)]).filter((name) => before[name] !== after[name]).map((name) => ({ name, before: before[name], after: after[name] }));
}

function sharedAttributeConflicts(left, right) {
  const rightChanges = new Map(attributeChanges(right.before.attributes, right.after.attributes).map((item) => [item.name, item]));
  return attributeChanges(left.before.attributes, left.after.attributes)
    .filter((item) => rightChanges.has(item.name) && rightChanges.get(item.name).after !== item.after)
    .map((item) => item.name);
}

function applyReplacements(sourceText, replacements) {
  return [...replacements].sort((a, b) => b.start - a.start).reduce((text, replacement) => text.slice(0, replacement.start) + replacement.text + text.slice(replacement.end), sourceText);
}

function merged(id, sourcePath, sourceText, operation, extra = {}) {
  return result(id, sourcePath, 'merged', { operation, mergedSourceText: sourceText, mergedSourceHash: hashSemanticValue(sourceText), conflicts: [], ...extra });
}

function blocked(id, sourcePath, reasonCode, conflicts = [], extra = {}) {
  return result(id, sourcePath, 'blocked', { operation: 'blocked', conflicts: conflicts.length ? conflicts : [conflict(id, sourcePath, reasonCode, reasonCode)], ...extra });
}

function result(id, sourcePath, status, body) {
  const browserRuntimeEquivalenceClaim = status === 'merged' && body.browserRuntimeEquivalenceClaim === true;
  return {
    kind: 'frontier.lang.htmlSafeMerge',
    version: 1,
    id,
    sourcePath,
    status,
    autoMergeClaim: false,
    semanticEquivalenceClaim: false,
    browserRuntimeEquivalenceClaim,
    ...body,
    admission: {
      status: status === 'merged' ? 'auto-merge-candidate' : 'blocked',
      action: status === 'merged' ? 'apply-html' : 'human-review',
      reviewRequired: status !== 'merged',
      reasonCodes: unique((body.conflicts ?? []).map((item) => item.details.reasonCode)),
      browserRuntimeEquivalenceClaim: browserRuntimeEquivalenceClaim || undefined,
      htmlBrowserRuntimeProofs: body.htmlRuntimeProofs?.length ? body.htmlRuntimeProofs : undefined
    }
  };
}

function conflict(id, sourcePath, code, reasonCode, details = {}) {
  return { code, gateId: 'html-semantic-merge', sourcePath, details: { reasonCode, conflictKey: `html#${id}#${reasonCode}#${details.recordKey ?? sourcePath ?? 'source'}`, ...details } };
}

function proofGap(code, summary) { return { code, status: 'not-claimed', summary, failClosed: true, semanticEquivalenceClaim: false }; }
function sameChange(left, right) { return (left.after?.recordHash ?? '') === (right.after?.recordHash ?? '') && left.kind === right.kind; }
function changeSummary(change) { return { kind: change.kind, recordKind: change.after?.kind ?? change.before?.kind, recordHash: change.after?.recordHash }; }
function unique(values) { return [...new Set(values.filter((value) => value !== undefined && value !== null && String(value)))]; }

export { safeMergeHtmlSource };
