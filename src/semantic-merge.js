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
  return [...proofGapChecks(changes), ...attributeRuntimeChecks(changes)];
}

function attributeRuntimeChecks(changes) {
  return changes.flatMap((change) => {
    const before = change.before?.kind === 'element' ? change.before.attributes ?? {} : {};
    const after = change.after?.kind === 'element' ? change.after.attributes ?? {} : {};
    const tagName = String(change.after?.tagName ?? change.before?.tagName ?? '').toLowerCase();
    return attributeChanges(before, after)
      .flatMap((attribute) => attributeRuntimeCheck(change, attribute, tagName));
  });
}

function attributeRuntimeCheck(change, attribute, tagName) {
  const name = attribute.name.toLowerCase();
  const spec = runtimeAttributeSpec(name, tagName);
  return spec ? [{ change, attributeName: name, boundaryAttributes: [name], ...spec, gap: proofGap(spec.reasonCode, spec.summary) }] : [];
}

function runtimeAttributeSpec(name, tagName) {
  if (/^on[\w:.-]+$/i.test(name)) return { boundary: 'html-event-handler-attribute', reasonCode: 'event-handler-runtime-boundary', summary: 'HTML event handler attributes execute in the browser runtime and require source-bound host evidence.' };
  if (name === 'style') return { boundary: 'html-inline-style-attribute', reasonCode: 'inline-style-runtime-boundary', summary: 'HTML inline style attributes affect browser cascade and rendering and require source-bound host evidence.' };
  if (tagName === 'iframe' && name === 'srcdoc') return { boundary: 'html-iframe-srcdoc-attribute', reasonCode: 'iframe-srcdoc-runtime-boundary', summary: 'HTML iframe srcdoc attributes define nested browsing-context content and require source-bound host evidence.' };
  if (tagName === 'iframe' && IframeRuntimeAttributes.has(name)) return { boundary: 'html-iframe-runtime-attribute', reasonCode: 'iframe-runtime-boundary', summary: 'HTML iframe runtime attributes affect nested browsing-context execution and require source-bound host evidence.' };
  if (tagName === 'form' && FormRuntimeAttributes.has(name)) return { boundary: 'html-form-runtime-attribute', reasonCode: 'form-runtime-boundary', summary: 'HTML form runtime attributes affect submission, navigation, encoding, or validation and require source-bound host evidence.' };
  if (FormSubmitterTags.has(tagName) && FormSubmitterRuntimeAttributes.has(name)) return { boundary: 'html-form-submitter-runtime-attribute', reasonCode: 'form-submitter-runtime-boundary', summary: 'HTML submitter attributes affect form submission behavior and require source-bound host evidence.' };
  if (FormControlTags.has(tagName) && FormControlRuntimeAttributes.has(name)) return { boundary: 'html-form-control-runtime-attribute', reasonCode: 'form-control-runtime-boundary', summary: 'HTML form-control attributes affect user input, validation, state, or submission data and require source-bound host evidence.' };
  if (tagName === 'base' && BaseRuntimeAttributes.has(name)) return { boundary: 'html-document-base-runtime-attribute', reasonCode: 'document-base-runtime-boundary', summary: 'HTML base attributes affect URL resolution or navigation targets and require source-bound host evidence.' };
  if (tagName === 'meta' && MetaRuntimeAttributes.has(name)) return { boundary: 'html-document-metadata-runtime-attribute', reasonCode: 'document-metadata-runtime-boundary', summary: 'HTML metadata attributes can affect document loading, policy, refresh, viewport, or discovery behavior and require source-bound host evidence.' };
  if (ResourceLoadingTags.has(tagName) && ResourceLoadingAttributes.has(name)) return { boundary: 'html-resource-loading-attribute', reasonCode: 'resource-loading-runtime-boundary', summary: 'HTML resource-loading attributes affect fetched resources, selection, privacy, media behavior, or layout and require source-bound host evidence.' };
  return undefined;
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

const IframeRuntimeAttributes = new Set(['allow', 'allowfullscreen', 'allowpaymentrequest', 'credentialless', 'csp', 'fetchpriority', 'loading', 'name', 'referrerpolicy', 'sandbox', 'src']);
const FormRuntimeAttributes = new Set(['accept-charset', 'action', 'autocomplete', 'enctype', 'method', 'novalidate', 'target']);
const FormSubmitterTags = new Set(['button', 'input']);
const FormSubmitterRuntimeAttributes = new Set(['form', 'formaction', 'formenctype', 'formmethod', 'formnovalidate', 'formtarget', 'type']);
const FormControlTags = new Set(['button', 'fieldset', 'input', 'optgroup', 'option', 'output', 'select', 'textarea']);
const FormControlRuntimeAttributes = new Set(['accept', 'autocomplete', 'capture', 'checked', 'disabled', 'form', 'list', 'max', 'maxlength', 'min', 'minlength', 'multiple', 'name', 'pattern', 'readonly', 'required', 'selected', 'size', 'step', 'value']);
const BaseRuntimeAttributes = new Set(['href', 'target']);
const MetaRuntimeAttributes = new Set(['charset', 'content', 'http-equiv', 'media', 'name', 'property']);
const ResourceLoadingTags = new Set(['audio', 'embed', 'img', 'link', 'object', 'source', 'track', 'video']);
const ResourceLoadingAttributes = new Set(['as', 'autoplay', 'blocking', 'color', 'controls', 'controlslist', 'crossorigin', 'data', 'decoding', 'default', 'disablepictureinpicture', 'disableremoteplayback', 'fetchpriority', 'height', 'href', 'imagesizes', 'imagesrcset', 'integrity', 'ismap', 'kind', 'label', 'loading', 'loop', 'media', 'muted', 'poster', 'preload', 'referrerpolicy', 'rel', 'sizes', 'src', 'srcset', 'srclang', 'type', 'usemap', 'width']);

export { safeMergeHtmlSource };
