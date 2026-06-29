import { classTokenMergePlan, htmlTokenListMergePlan, isHtmlTokenListMergeAttribute } from './class-token-merge.js';
import { hashSemanticValue } from '@shapeshift-labs/frontier-lang-kernel';
import { unkeyedStructuralMoveKeySet, unkeyedStructuralMovePairs, unkeyedStructuralMoveRecord } from './unkeyed-structural-move.js';

function structuralConflicts(id, sourcePath, sideChanges, oppositeChanges = [], options = {}) {
  const roots = structuralRoots(sideChanges, oppositeChanges, options);
  const conflicts = [];
  for (const change of sideChanges) {
    if ((change.after ?? change.before)?.kind === 'child-order') continue;
    if (!isStructural(change)) continue;
    if (roots.includes(change)) continue;
    if (containedByStructuralRoot(change, roots)) continue;
    conflicts.push(conflict(id, sourcePath, 'html-structural-add-delete-unsupported', 'html-structural-add-delete-unsupported', { recordKey: change.key, changeKind: change.kind }));
  }
  for (const root of roots) conflicts.push(...oppositeOverlapConflicts(id, sourcePath, root, oppositeChanges));
  return conflicts;
}

function structuralPatchPlan(id, sourcePath, workerChanges, workerTree, headTree, baseTree) {
  const conflicts = [];
  const replacements = [];
  const classTokenMergeEvidence = [];
  const tokenListMergeEvidence = [];
  const unkeyedStructuralAddEvidence = [];
  const unkeyedStructuralDeleteEvidence = [];
  const moveOptions = { baseTree, sideTree: workerTree, targetTree: headTree };
  const movePairs = unkeyedStructuralMovePairs(workerChanges, moveOptions);
  const moveKeySet = unkeyedStructuralMoveKeySet(workerChanges, moveOptions);
  const roots = structuralRoots(workerChanges, [], { ...moveOptions, movePairs });
  for (const change of workerChanges) {
    if (containedByStructuralRoot(change, roots)) continue;
    if ((change.after ?? change.before)?.kind === 'child-order' && change.kind !== 'update') continue;
    if (change.kind === 'add') {
      const existing = headTree.index.get(change.key);
      if (existing) {
        if (fullText(existing, headTree) !== fullText(change.after, workerTree)) conflicts.push(conflict(id, sourcePath, 'html-structural-add-conflict', 'html-structural-add-conflict', { recordKey: change.key }));
        continue;
      }
      const offset = insertionOffset(change.after, workerTree, headTree);
      if (offset === undefined) conflicts.push(conflict(id, sourcePath, 'html-structural-anchor-missing', 'html-structural-anchor-missing', { recordKey: change.key }));
      else {
        replacements.push({ start: offset, end: offset, text: insertText(change.after, workerTree) });
        if (!moveKeySet.has(change.key) && isSafeUnkeyedStructuralAdd(change, workerChanges)) unkeyedStructuralAddEvidence.push(unkeyedStructuralAddRecord(sourcePath, change, workerTree, headTree));
      }
      continue;
    }
    if (change.kind === 'delete') {
      const headRecord = headTree.index.get(change.key);
      if (!headRecord) continue;
      replacements.push({ start: headRecord.structuralSpan.startOffset, end: headRecord.fullSpan.endOffset, text: '' });
      if (!moveKeySet.has(change.key) && isSafeUnkeyedStructuralDelete(change, workerChanges)) unkeyedStructuralDeleteEvidence.push(unkeyedStructuralDeleteRecord(sourcePath, change, workerTree, headTree, headRecord));
      continue;
    }
    const headRecord = headTree.index.get(change.key);
    if (!headRecord) conflicts.push(conflict(id, sourcePath, 'html-head-record-missing', 'html-head-record-missing', { recordKey: change.key }));
    else if (change.after.kind === 'child-order') {
      const replacement = childOrderReplacement(id, sourcePath, change, workerTree, headTree);
      if (replacement.conflict) conflicts.push(replacement.conflict);
      else if (replacement.replacement) replacements.push(replacement.replacement);
    }
    else if (change.after.kind === 'element') {
      const replacement = elementReplacement(id, sourcePath, change, headRecord);
      conflicts.push(...replacement.conflicts);
      classTokenMergeEvidence.push(...replacement.classTokenMergeEvidence);
      tokenListMergeEvidence.push(...replacement.tokenListMergeEvidence);
      if (replacement.replacement) replacements.push(replacement.replacement);
    }
    else replacements.push({ start: headRecord.sourceSpan.startOffset, end: headRecord.sourceSpan.endOffset, text: change.after.value });
  }
  return { conflicts, replacements, classTokenMergeEvidence, tokenListMergeEvidence, unkeyedStructuralAddEvidence, unkeyedStructuralDeleteEvidence, unkeyedStructuralMoveEvidence: movePairs.map((pair) => unkeyedStructuralMoveRecord(sourcePath, pair, baseTree, workerTree, headTree)) };
}

function structuralRoots(changes, oppositeChanges = [], options = {}) {
  const moveKeys = options.movePairs ? new Set(options.movePairs.flatMap((pair) => [pair.add.key, pair.deletion.key])) : unkeyedStructuralMoveKeySet(changes, { ...options, oppositeChanges });
  return changes.filter((change) => moveKeys.has(change.key) || isSafeStructuralRoot(change, changes, oppositeChanges));
}

function isSafeStructuralRoot(change, sideChanges = [], oppositeChanges = []) {
  const record = change.after ?? change.before;
  return isStructural(change) && record?.kind === 'element' && record.fullSpan && record.structuralSpan &&
    (record.explicitIdentity === true || isSafeUnkeyedStructuralAdd(change, sideChanges, oppositeChanges) || isSafeUnkeyedStructuralDelete(change, sideChanges, oppositeChanges));
}

function isSafeUnkeyedStructuralAdd(change, sideChanges = [], oppositeChanges = []) {
  const record = change.after;
  return change.kind === 'add' && record?.kind === 'element' && record.explicitIdentity !== true &&
    record.parentExplicitIdentity === true && record.fullSpan && record.structuralSpan &&
    !sameParentStructuralChanges(change, sideChanges).length &&
    !sameParentStructuralChanges(change, oppositeChanges).length;
}

function isSafeUnkeyedStructuralDelete(change, sideChanges = [], oppositeChanges = []) {
  const record = change.before;
  return change.kind === 'delete' && record?.kind === 'element' && record.explicitIdentity !== true &&
    record.parentExplicitIdentity === true && record.fullSpan && record.structuralSpan &&
    !sameParentStructuralChanges(change, sideChanges).length &&
    !sameParentStructuralChanges(change, oppositeChanges).length;
}

function sameParentStructuralChanges(change, changes = []) {
  const record = change.after ?? change.before;
  return changes.filter((candidate) => candidate !== change && isStructural(candidate)).filter((candidate) => {
    const candidateRecord = candidate.after ?? candidate.before;
    return candidateRecord?.parentKey === record?.parentKey && !pathContains(record?.path, candidateRecord?.path);
  });
}

function unkeyedStructuralAddRecord(sourcePath, change, workerTree, headTree) {
  const record = change.after;
  const evidence = {
    kind: 'frontier.lang.htmlUnkeyedStructuralAddEvidence',
    version: 1,
    status: 'passed',
    sourcePath,
    recordKey: change.key,
    parentKey: record.parentKey,
    tagName: record.tagName,
    parserBackedStructuralSpans: true,
    parentExplicitIdentity: true,
    addOnly: true,
    siblingStructuralRace: false,
    workerSourceHash: workerTree.sourceHash,
    headSourceHash: headTree.sourceHash,
    addedRecordFullHash: record.fullHash,
    addedRecordHash: record.recordHash,
    autoMergeClaim: false,
    semanticEquivalenceClaim: false,
    browserRuntimeEquivalenceClaim: false,
    browserRenderEquivalenceClaim: false
  };
  return { ...evidence, evidenceHash: hashSemanticValue(evidence) };
}

function unkeyedStructuralDeleteRecord(sourcePath, change, workerTree, headTree, headRecord) {
  const record = change.before;
  const evidence = {
    kind: 'frontier.lang.htmlUnkeyedStructuralDeleteEvidence',
    version: 1,
    status: 'passed',
    sourcePath,
    recordKey: change.key,
    parentKey: record.parentKey,
    tagName: record.tagName,
    parserBackedStructuralSpans: true,
    parentExplicitIdentity: true,
    deleteOnly: true,
    siblingStructuralRace: false,
    baseSourceHash: record.sourceHash,
    workerSourceHash: workerTree.sourceHash,
    headSourceHash: headTree.sourceHash,
    deletedRecordFullHash: record.fullHash,
    deletedRecordHash: record.recordHash,
    headRecordHash: headRecord.recordHash,
    autoMergeClaim: false,
    semanticEquivalenceClaim: false,
    browserRuntimeEquivalenceClaim: false,
    browserRenderEquivalenceClaim: false
  };
  return { ...evidence, evidenceHash: hashSemanticValue(evidence) };
}

function isStructural(change) {
  return change.kind === 'add' || change.kind === 'delete';
}

function containedByStructuralRoot(change, roots) {
  if (roots.includes(change)) return false;
  const record = change.after ?? change.before;
  return roots.some((root) => pathContains((root.after ?? root.before).path, record?.path));
}

function oppositeOverlapConflicts(id, sourcePath, root, oppositeChanges) {
  const rootRecord = root.after ?? root.before;
  return oppositeChanges.flatMap((change) => {
    const record = change.after ?? change.before;
    if (!record || !pathContains(rootRecord.path, record.path)) return [];
    if (root.kind === 'add' && change.kind === 'add' && root.key === change.key && fullComparable(root, change)) return [];
    return [conflict(id, sourcePath, 'html-structural-overlap-conflict', 'html-structural-overlap-conflict', { recordKey: root.key, overlappingRecordKey: change.key, changeKind: root.kind, overlappingChangeKind: change.kind })];
  });
}

function fullComparable(left, right) {
  const leftRecord = left.after ?? left.before;
  const rightRecord = right.after ?? right.before;
  return leftRecord?.fullHash && leftRecord.fullHash === rightRecord?.fullHash;
}

function insertionOffset(record, workerTree, headTree) {
  const previous = previousSibling(record, workerTree);
  if (previous) return headTree.index.get(previous.key)?.fullSpan?.endOffset;
  if (!record.parentKey) return 0;
  return headTree.index.get(record.parentKey)?.sourceSpan?.endOffset;
}

function previousSibling(record, tree) {
  const index = tree.records.indexOf(record);
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const candidate = tree.records[cursor];
    if (samePath(candidate.parentPath, record.parentPath)) return candidate;
    if (candidate.path.length < record.path.length) return undefined;
  }
  return undefined;
}

function elementReplacement(id, sourcePath, change, headRecord) {
  const workerAttrs = attributeChanges(change.before.attributes, change.after.attributes);
  const attributes = { ...headRecord.attributes };
  const conflicts = [];
  const classTokenMergeEvidence = [];
  const tokenListMergeEvidence = [];
  for (const attr of workerAttrs) {
    if (isHtmlTokenListMergeAttribute(attr.name) && headRecord.attributes[attr.name] !== change.before.attributes[attr.name]) {
      const plan = tokenListPlanForAttribute(attr.name, {
        sourcePath,
        recordKey: change.key,
        baseValue: change.before.attributes[attr.name],
        workerValue: change.after.attributes[attr.name],
        headValue: headRecord.attributes[attr.name]
      });
      if (plan.status !== 'merged') {
        conflicts.push(conflict(id, sourcePath, plan.reasonCode, plan.reasonCode, { recordKey: change.key, attributeName: attr.name, ...plan.details }));
        continue;
      }
      if (plan.value === undefined) delete attributes[attr.name];
      else attributes[attr.name] = plan.value;
      tokenListMergeEvidence.push(plan.evidence);
      if (attr.name === 'class') classTokenMergeEvidence.push(plan.evidence);
      continue;
    }
    if (attr.after === undefined) delete attributes[attr.name];
    else attributes[attr.name] = attr.after;
  }
  return {
    conflicts,
    classTokenMergeEvidence,
    tokenListMergeEvidence,
    replacement: conflicts.length ? undefined : { start: headRecord.sourceSpan.startOffset, end: headRecord.sourceSpan.endOffset, text: renderStartTag(headRecord.tagName, attributes, headRecord.selfClosing) }
  };
}

function tokenListPlanForAttribute(attributeName, input) {
  return attributeName === 'class' ? classTokenMergePlan(input) : htmlTokenListMergePlan({ ...input, attributeName });
}

function childOrderReplacement(id, sourcePath, change, workerTree, headTree) {
  if (!sameSet(change.before.childKeys, change.after.childKeys)) return {};
  const headChildren = change.after.childKeys.map((key) => headTree.index.get(key));
  if (headChildren.some((record) => !record?.structuralSpan || !record?.fullSpan)) {
    return { conflict: conflict(id, sourcePath, 'html-child-order-anchor-missing', 'html-child-order-anchor-missing', { recordKey: change.key }) };
  }
  const parentKey = change.after.parentKey;
  const unsafeDirectChild = headTree.records.some((record) => record.parentKey === parentKey
    && ((record.kind === 'element' && record.explicitIdentity !== true) || record.kind === 'comment'));
  if (unsafeDirectChild) {
    return { conflict: conflict(id, sourcePath, 'html-child-order-unkeyed-sibling', 'html-child-order-unkeyed-sibling', { recordKey: change.key }) };
  }
  const currentKeys = headChildrenInSourceOrder(parentKey, headTree).map((record) => record.key);
  if (!sameSet(currentKeys, change.after.childKeys)) {
    return { conflict: conflict(id, sourcePath, 'html-child-order-head-diverged', 'html-child-order-head-diverged', { recordKey: change.key }) };
  }
  const sortedChildren = [...headChildren].sort((left, right) => left.structuralSpan.startOffset - right.structuralSpan.startOffset);
  const start = sortedChildren[0].structuralSpan.startOffset;
  const end = sortedChildren.at(-1).fullSpan.endOffset;
  const text = change.after.childKeys.map((key) => {
    const record = headTree.index.get(key);
    return headTree.sourceText.slice(record.structuralSpan.startOffset, record.fullSpan.endOffset);
  }).join('');
  return { replacement: { start, end, text } };
}

function attributeChanges(before = {}, after = {}) {
  return unique([...Object.keys(before), ...Object.keys(after)]).filter((name) => before[name] !== after[name]).map((name) => ({ name, before: before[name], after: after[name] }));
}

function renderStartTag(tagName, attributes, selfClosing) {
  const attrs = Object.entries(attributes).sort(([left], [right]) => left.localeCompare(right)).map(([key, value]) => value === true ? ` ${key}` : ` ${key}="${escapeAttribute(value)}"`).join('');
  return `<${tagName}${attrs}${selfClosing ? ' /' : ''}>`;
}

function insertText(record, tree) {
  return tree.sourceText.slice(record.structuralSpan.startOffset, record.fullSpan.endOffset);
}

function fullText(record, tree) {
  return tree.sourceText.slice(record.sourceSpan.startOffset, record.fullSpan.endOffset);
}

function pathContains(parentPath, childPath) {
  return Array.isArray(parentPath) && Array.isArray(childPath) && parentPath.length < childPath.length && parentPath.every((part, index) => part === childPath[index]);
}

function samePath(left, right) {
  return Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((part, index) => part === right[index]);
}

function sameSet(left = [], right = []) {
  return left.length === right.length && left.every((value) => right.includes(value));
}

function headChildrenInSourceOrder(parentKey, tree) {
  return tree.records
    .filter((record) => record.kind === 'element' && record.parentKey === parentKey && record.explicitIdentity === true)
    .sort((left, right) => left.sourceSpan.startOffset - right.sourceSpan.startOffset);
}

function conflict(id, sourcePath, code, reasonCode, details = {}) {
  return { code, gateId: 'html-semantic-merge', sourcePath, details: { reasonCode, conflictKey: `html#${id}#${reasonCode}#${details.recordKey ?? sourcePath ?? 'source'}`, ...details } };
}

function escapeAttribute(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function unique(values) {
  return [...new Set(values.filter((value) => value !== undefined && value !== null && String(value)))];
}

export { structuralConflicts, structuralPatchPlan };
