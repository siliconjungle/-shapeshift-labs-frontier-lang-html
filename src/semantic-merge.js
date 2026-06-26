import { hashSemanticValue } from '@shapeshift-labs/frontier-lang-kernel';
import { structuralConflicts, structuralPatchPlan } from './semantic-merge-structure.js';

const VoidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const RuntimeBoundaryTags = new Set(['script', 'style', 'template', 'slot']);

function safeMergeHtmlSource(input = {}) {
  const id = String(input.id ?? 'html_safe_merge');
  const sourcePath = input.sourcePath;
  const base = input.baseSourceText;
  const worker = input.workerSourceText ?? base;
  const head = input.headSourceText ?? base;
  if (typeof base !== 'string' || typeof worker !== 'string' || typeof head !== 'string') return blocked(id, sourcePath, 'html-source-text-missing');
  if (worker === head) return singleSideMerge(id, sourcePath, base, worker, 'worker-head-identical');
  if (worker === base) return singleSideMerge(id, sourcePath, base, head, 'worker-unchanged');
  if (head === base) return singleSideMerge(id, sourcePath, base, worker, 'head-unchanged');
  const trees = { base: parseMergeTree(base, sourcePath), worker: parseMergeTree(worker, sourcePath), head: parseMergeTree(head, sourcePath) };
  const changes = {
    worker: changedRecords(trees.base.index, trees.worker.index, 'worker'),
    head: changedRecords(trees.base.index, trees.head.index, 'head')
  };
  const conflicts = [
    ...proofGapConflicts(id, sourcePath, changes.worker, trees),
    ...proofGapConflicts(id, sourcePath, changes.head, trees),
    ...structuralConflicts(id, sourcePath, changes.worker, changes.head),
    ...structuralConflicts(id, sourcePath, changes.head, changes.worker),
    ...overlapConflicts(id, sourcePath, changes.worker, changes.head)
  ];
  if (conflicts.length) return blocked(id, sourcePath, 'html-semantic-merge-conflict', conflicts);
  const patch = structuralPatchPlan(id, sourcePath, changes.worker, trees.worker, trees.head);
  if (patch.conflicts.length) return blocked(id, sourcePath, 'html-semantic-merge-conflict', patch.conflicts);
  return merged(id, sourcePath, applyReplacements(head, patch.replacements), 'semantic-html-merge', {
    baseTreeHash: trees.base.treeHash,
    workerTreeHash: trees.worker.treeHash,
    headTreeHash: trees.head.treeHash,
    workerChangedRecords: changes.worker.length,
    headChangedRecords: changes.head.length
  });
}

function singleSideMerge(id, sourcePath, base, current, operation) {
  if (base === current) return merged(id, sourcePath, current, operation);
  const trees = { base: parseMergeTree(base, sourcePath), current: parseMergeTree(current, sourcePath) };
  const changes = changedRecords(trees.base.index, trees.current.index, 'current');
  const conflicts = [
    ...proofGapConflicts(id, sourcePath, changes, trees),
    ...structuralConflicts(id, sourcePath, changes)
  ];
  if (conflicts.length) return blocked(id, sourcePath, 'html-semantic-merge-conflict', conflicts);
  return merged(id, sourcePath, current, operation, {
    baseTreeHash: trees.base.treeHash,
    mergedTreeHash: trees.current.treeHash,
    changedRecords: changes.length
  });
}

function parseMergeTree(sourceText, sourcePath) {
  const lineStarts = computeLineStarts(sourceText);
  const sourceHash = hashSemanticValue({ kind: 'frontier.lang.html.merge.source.v1', sourceText });
  const stack = [{ tagName: '#document', childCounts: new Map(), path: [], proofGaps: [] }];
  const records = [];
  const tokenPattern = /<!--[\s\S]*?-->|<!doctype[^>]*>|<\/?[A-Za-z][^>]*>/gi;
  let match;
  let lastIndex = 0;
  while ((match = tokenPattern.exec(sourceText))) {
    const gapText = sourceText.slice(lastIndex, match.index);
    const structuralStart = gapText && !gapText.trim() ? lastIndex : match.index;
    if (gapText.trim()) pushTextRecord(sourceText, lastIndex, match.index, lineStarts, sourcePath, sourceHash, stack, records);
    const token = match[0];
    if (token.startsWith('<!--')) pushCommentRecord(token, match.index, lineStarts, sourcePath, sourceHash, stack, records);
    else if (/^<\//.test(token)) closeElement(token, match.index + token.length, lineStarts, sourcePath, sourceHash, stack);
    else if (!/^<!doctype/i.test(token)) pushElementRecord(token, match.index, lineStarts, sourcePath, sourceHash, stack, records, structuralStart);
    lastIndex = match.index + token.length;
  }
  if (lastIndex < sourceText.length) pushTextRecord(sourceText, lastIndex, sourceText.length, lineStarts, sourcePath, sourceHash, stack, records);
  finalizeOpenElements(stack, sourceText.length, lineStarts, sourcePath, sourceHash);
  const index = new Map(records.map((record) => [record.key, record]));
  return { records, index, sourceText, treeHash: hashSemanticValue({ kind: 'frontier.lang.html.merge.tree.v1', records: records.map(hashableRecord) }) };
}

function pushElementRecord(token, offset, lineStarts, sourcePath, sourceHash, stack, records, structuralStart = offset) {
  const parsed = parseStartTag(token);
  if (!parsed) return;
  const parent = stack.at(-1);
  const ordinal = nextOrdinal(parent, parsed.tagName);
  const path = [...parent.path, `${parsed.tagName}[${ordinal}]`];
  const proofGaps = [...parent.proofGaps, ...htmlProofGaps(parsed)];
  const sourceSpan = span(offset, offset + token.length, lineStarts, sourcePath);
  const explicitIdentity = parsed.attributes.id !== undefined || parsed.attributes['data-frontier-key'] !== undefined;
  const identityKey = parsed.attributes.id ?? parsed.attributes['data-frontier-key'] ?? path.join('/');
  const record = compact({
    key: `element#${identityKey}`,
    kind: 'element',
    tagName: parsed.tagName,
    path,
    parentPath: parent.path,
    parentKey: parent.record?.key,
    identityKey,
    explicitIdentity,
    attributes: parsed.attributes,
    selfClosing: parsed.selfClosing,
    sourceSpan,
    structuralSpan: span(structuralStart, offset + token.length, lineStarts, sourcePath),
    fullSpan: span(offset, offset + token.length, lineStarts, sourcePath),
    sourceHash,
    tokenText: token,
    recordHash: hashSemanticValue({ kind: 'html.element', tagName: parsed.tagName, attributes: parsed.attributes, selfClosing: parsed.selfClosing }),
    proofGaps: proofGaps.length ? proofGaps : undefined
  });
  records.push(record);
  if (!parsed.selfClosing && !VoidTags.has(parsed.tagName)) stack.push({ tagName: parsed.tagName, childCounts: new Map(), path, proofGaps, record });
  else finishElementRecord(record, offset + token.length, lineStarts, sourcePath, sourceHash);
}

function pushTextRecord(sourceText, start, end, lineStarts, sourcePath, sourceHash, stack, records) {
  const value = sourceText.slice(start, end);
  if (!value.trim()) return;
  const parent = stack.at(-1);
  const ordinal = nextOrdinal(parent, '#text');
  const path = [...parent.path, `#text[${ordinal}]`];
  const proofGaps = parent.proofGaps ?? [];
  records.push(compact({
    key: `text#${path.join('/')}`,
    kind: 'text',
    path,
    parentPath: parent.path,
    parentKey: parent.record?.key,
    value,
    sourceSpan: span(start, end, lineStarts, sourcePath),
    sourceHash,
    recordHash: hashSemanticValue({ kind: 'html.text', value }),
    proofGaps: proofGaps.length ? proofGaps : undefined
  }));
}

function pushCommentRecord(token, offset, lineStarts, sourcePath, sourceHash, stack, records) {
  const parent = stack.at(-1);
  const ordinal = nextOrdinal(parent, '#comment');
  const path = [...parent.path, `#comment[${ordinal}]`];
  records.push({
    key: `comment#${path.join('/')}`,
    kind: 'comment',
    path,
    parentPath: parent.path,
    parentKey: parent.record?.key,
    value: token,
    sourceSpan: span(offset, offset + token.length, lineStarts, sourcePath),
    sourceHash,
    recordHash: hashSemanticValue({ kind: 'html.comment', value: token })
  });
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

function proofGapConflicts(id, sourcePath, changes, trees) {
  return changes.flatMap((change) => {
    const record = change.after ?? change.before;
    return (record?.proofGaps ?? []).map((gap) => conflict(id, sourcePath, 'html-proof-gap-blocked', gap.code, { recordKey: change.key, proofGap: gap }));
  });
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

function blocked(id, sourcePath, reasonCode, conflicts = []) {
  return result(id, sourcePath, 'blocked', { operation: 'blocked', conflicts: conflicts.length ? conflicts : [conflict(id, sourcePath, reasonCode, reasonCode)] });
}

function result(id, sourcePath, status, body) {
  return {
    kind: 'frontier.lang.htmlSafeMerge',
    version: 1,
    id,
    sourcePath,
    status,
    autoMergeClaim: false,
    semanticEquivalenceClaim: false,
    browserRuntimeEquivalenceClaim: false,
    ...body,
    admission: { status: status === 'merged' ? 'auto-merge-candidate' : 'blocked', action: status === 'merged' ? 'apply-html' : 'human-review', reviewRequired: status !== 'merged', reasonCodes: unique((body.conflicts ?? []).map((item) => item.details.reasonCode)) }
  };
}

function conflict(id, sourcePath, code, reasonCode, details = {}) {
  return { code, gateId: 'html-semantic-merge', sourcePath, details: { reasonCode, conflictKey: `html#${id}#${reasonCode}#${details.recordKey ?? sourcePath ?? 'source'}`, ...details } };
}

function parseStartTag(token) {
  const match = /^<([A-Za-z][\w:-]*)([\s\S]*?)\/?>$/.exec(token);
  if (!match) return undefined;
  return { tagName: match[1].toLowerCase(), attributes: parseAttributes(match[2] ?? ''), selfClosing: /\/>$/.test(token) };
}

function parseAttributes(text) {
  const result = {};
  const pattern = /([:@A-Za-z_][\w:.-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (const match of text.matchAll(pattern)) result[match[1]] = match[2] ?? match[3] ?? match[4] ?? true;
  return result;
}

function htmlProofGaps(parsed) {
  const gaps = [];
  if (RuntimeBoundaryTags.has(parsed.tagName)) gaps.push(proofGap(`${parsed.tagName}-runtime-boundary`, `HTML <${parsed.tagName}> runtime/template semantics require host evidence.`));
  if (parsed.tagName.includes('-')) gaps.push(proofGap('custom-element-runtime-boundary', 'Custom element upgrade and lifecycle semantics require browser/runtime evidence.'));
  if (Object.keys(parsed.attributes).some((key) => key.startsWith('@') || key.startsWith(':') || key.startsWith('v-') || key.startsWith('x-'))) gaps.push(proofGap('framework-directive-boundary', 'Framework directive semantics require framework-specific evidence.'));
  return gaps;
}

function closeElement(token, endOffset, lineStarts, sourcePath, sourceHash, stack) {
  const tagName = token.replace(/^<\//, '').replace(/>$/, '').trim().toLowerCase();
  for (let index = stack.length - 1; index > 0; index -= 1) {
    if (stack[index].tagName === tagName) {
      finishElementRecord(stack[index].record, endOffset, lineStarts, sourcePath, sourceHash);
      stack.length = index;
      return;
    }
  }
}

function finalizeOpenElements(stack, endOffset, lineStarts, sourcePath, sourceHash) {
  for (let index = stack.length - 1; index > 0; index -= 1) finishElementRecord(stack[index].record, endOffset, lineStarts, sourcePath, sourceHash);
}

function finishElementRecord(record, endOffset, lineStarts, sourcePath, sourceHash) {
  if (!record) return;
  record.fullSpan = span(record.sourceSpan.startOffset, endOffset, lineStarts, sourcePath);
  record.fullHash = hashSemanticValue({ kind: 'html.element.full', sourceHash, key: record.key, start: record.sourceSpan.startOffset, end: endOffset });
  record.recordHash = hashSemanticValue({ kind: 'html.element', tagName: record.tagName, attributes: record.attributes, selfClosing: record.selfClosing });
}

function proofGap(code, summary) { return { code, status: 'not-claimed', summary, failClosed: true, semanticEquivalenceClaim: false }; }
function nextOrdinal(parent, key) { const next = (parent.childCounts.get(key) ?? 0) + 1; parent.childCounts.set(key, next); return next; }
function hashableRecord(record) { return { key: record.key, kind: record.kind, tagName: record.tagName, path: record.path, identityKey: record.identityKey, attributes: record.attributes, recordHash: record.recordHash, fullHash: record.fullHash, proofGaps: record.proofGaps?.map((gap) => gap.code) }; }
function sameChange(left, right) { return (left.after?.recordHash ?? '') === (right.after?.recordHash ?? '') && left.kind === right.kind; }
function changeSummary(change) { return { kind: change.kind, recordKind: change.after?.kind ?? change.before?.kind, recordHash: change.after?.recordHash }; }
function span(start, end, lineStarts, path) { const from = positionAt(start, lineStarts); const to = positionAt(end, lineStarts); return { path, startOffset: start, endOffset: end, startLine: from.line, startColumn: from.column, endLine: to.line, endColumn: to.column }; }
function positionAt(offset, lineStarts) { let line = 0; while (line + 1 < lineStarts.length && lineStarts[line + 1] <= offset) line += 1; return { line: line + 1, column: offset - lineStarts[line] + 1 }; }
function computeLineStarts(text) { const starts = [0]; for (let index = 0; index < text.length; index += 1) if (text[index] === '\n') starts.push(index + 1); return starts; }
function compact(record) { return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined)); }
function unique(values) { return [...new Set(values.filter((value) => value !== undefined && value !== null && String(value)))]; }

export { safeMergeHtmlSource };
