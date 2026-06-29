import { hashSemanticValue } from '@shapeshift-labs/frontier-lang-kernel';

function unkeyedStructuralMovePairs(changes = [], options = {}) {
  const baseTree = options.baseTree;
  const sideTree = options.sideTree;
  const targetTree = options.targetTree;
  if (!baseTree || !sideTree) return [];
  const candidates = [];
  const adds = changes.filter((change) => isUnkeyedStructuralMoveAdd(change));
  const deletes = changes.filter((change) => isUnkeyedStructuralMoveDelete(change));
  for (const add of adds) {
    for (const deletion of deletes) {
      if (!sameMoveSubtree(add, deletion, baseTree, sideTree)) continue;
      if (!hasStableSiblingAnchor(add.after, sideTree, targetTree)) continue;
      if (hasSiblingStructuralRace(add, deletion, changes, options.oppositeChanges)) continue;
      candidates.push({ add, deletion });
    }
  }
  return candidates.filter((pair) =>
    candidates.filter((candidate) => candidate.add === pair.add).length === 1 &&
    candidates.filter((candidate) => candidate.deletion === pair.deletion).length === 1
  );
}

function unkeyedStructuralMoveKeySet(changes, options) {
  const keys = new Set();
  for (const pair of unkeyedStructuralMovePairs(changes, options)) {
    keys.add(pair.add.key);
    keys.add(pair.deletion.key);
  }
  return keys;
}

function unkeyedStructuralMoveRecord(sourcePath, pair, baseTree, sideTree, targetTree) {
  const movedText = fullText(pair.add.after, sideTree);
  const evidence = {
    kind: 'frontier.lang.htmlUnkeyedStructuralMoveEvidence',
    version: 1,
    status: 'passed',
    sourcePath,
    fromRecordKey: pair.deletion.key,
    toRecordKey: pair.add.key,
    parentKey: pair.add.after.parentKey,
    tagName: pair.add.after.tagName,
    parserBackedStructuralSpans: true,
    parentExplicitIdentity: true,
    moveOnly: true,
    exactSubtreeText: true,
    keyedSiblingAnchor: true,
    siblingStructuralRace: false,
    baseSourceHash: baseTree.sourceHash,
    workerSourceHash: sideTree.sourceHash,
    headSourceHash: targetTree?.sourceHash,
    movedRecordHash: pair.add.after.recordHash,
    movedSubtreeHash: hashSemanticValue({ kind: 'frontier.lang.html.unkeyedStructuralMove.subtree.v1', text: movedText }),
    autoMergeClaim: false,
    semanticEquivalenceClaim: false,
    browserRuntimeEquivalenceClaim: false,
    browserRenderEquivalenceClaim: false
  };
  return { ...evidence, evidenceHash: hashSemanticValue(evidence) };
}

function sameMoveSubtree(add, deletion, baseTree, sideTree) {
  return add.after.parentKey === deletion.before.parentKey &&
    add.after.tagName === deletion.before.tagName &&
    add.after.recordHash === deletion.before.recordHash &&
    fullText(add.after, sideTree) === fullText(deletion.before, baseTree);
}

function isUnkeyedStructuralMoveAdd(change) {
  return change.kind === 'add' && isUnkeyedAddressableElement(change.after);
}

function isUnkeyedStructuralMoveDelete(change) {
  return change.kind === 'delete' && isUnkeyedAddressableElement(change.before);
}

function isUnkeyedAddressableElement(record) {
  return record?.kind === 'element' && record.explicitIdentity !== true &&
    record.parentExplicitIdentity === true && record.fullSpan && record.structuralSpan;
}

function hasStableSiblingAnchor(record, sideTree, targetTree) {
  return [previousSibling(record, sideTree), nextSibling(record, sideTree)]
    .some((sibling) => sibling?.explicitIdentity === true && (!targetTree || targetTree.index.has(sibling.key)));
}

function hasSiblingStructuralRace(add, deletion, changes = [], oppositeChanges = []) {
  return [...changes, ...oppositeChanges].some((change) => {
    if (change === add || change === deletion || !isStructural(change)) return false;
    const record = change.after ?? change.before;
    if (pathContains(add.after.path, record?.path) || pathContains(deletion.before.path, record?.path)) return false;
    return record?.parentKey === add.after.parentKey;
  });
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

function nextSibling(record, tree) {
  const index = tree.records.indexOf(record);
  for (let cursor = index + 1; cursor < tree.records.length; cursor += 1) {
    const candidate = tree.records[cursor];
    if (samePath(candidate.parentPath, record.parentPath)) return candidate;
    if (candidate.path.length < record.path.length) return undefined;
  }
  return undefined;
}

function fullText(record, tree) {
  return tree.sourceText.slice(record.structuralSpan.startOffset, record.fullSpan.endOffset);
}

function isStructural(change) {
  return change.kind === 'add' || change.kind === 'delete';
}

function pathContains(parentPath, childPath) {
  return Array.isArray(parentPath) && Array.isArray(childPath) && parentPath.length < childPath.length && parentPath.every((part, index) => part === childPath[index]);
}

function samePath(left, right) {
  return Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((part, index) => part === right[index]);
}

export { unkeyedStructuralMoveKeySet, unkeyedStructuralMovePairs, unkeyedStructuralMoveRecord };
