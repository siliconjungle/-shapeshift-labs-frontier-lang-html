import assert from 'node:assert/strict';
import { safeMergeHtmlSource } from '../dist/index.js';

const unkeyedAddBase = [
  '<ul id="todos">',
  '  <li>A</li>',
  '</ul>',
  ''
].join('\n');
const unkeyedAddWorker = [
  '<ul id="todos">',
  '  <li>A</li>',
  '  <li>B</li>',
  '</ul>',
  ''
].join('\n');
const unkeyedAddHead = unkeyedAddBase.replace('id="todos"', 'id="todos" class="list"');
const unkeyedAddMerged = safeMergeHtmlSource({
  id: 'html_unkeyed_structural_add_under_explicit_parent',
  sourcePath: 'view.html',
  baseSourceText: unkeyedAddBase,
  workerSourceText: unkeyedAddWorker,
  headSourceText: unkeyedAddHead
});
assert.equal(unkeyedAddMerged.status, 'merged');
assert.match(unkeyedAddMerged.mergedSourceText, /class="list"/);
assert.match(unkeyedAddMerged.mergedSourceText, /<li>B<\/li>/);
assert.equal(unkeyedAddMerged.htmlUnkeyedStructuralAddEvidence.length, 1);
assert.equal(unkeyedAddMerged.htmlUnkeyedStructuralAddEvidence[0].parentExplicitIdentity, true);
assert.equal(unkeyedAddMerged.htmlUnkeyedStructuralAddEvidence[0].semanticEquivalenceClaim, false);
assert.equal(unkeyedAddMerged.admission.htmlUnkeyedStructuralAddEvidence.length, 1);

const unkeyedParentBlocked = safeMergeHtmlSource({
  id: 'html_unkeyed_structural_add_under_unkeyed_parent_blocked',
  sourcePath: 'view.html',
  baseSourceText: '<section><p>A</p></section>\n',
  workerSourceText: '<section><p>A</p><p>B</p></section>\n',
  headSourceText: '<section class="panel"><p>A</p></section>\n'
});
assert.equal(unkeyedParentBlocked.status, 'blocked');
assert.equal(unkeyedParentBlocked.conflicts.some((conflict) => conflict.details.reasonCode === 'html-structural-add-delete-unsupported'), true);

const siblingRaceBlocked = safeMergeHtmlSource({
  id: 'html_unkeyed_structural_add_sibling_race_blocked',
  sourcePath: 'view.html',
  baseSourceText: unkeyedAddBase,
  workerSourceText: unkeyedAddWorker,
  headSourceText: [
    '<ul id="todos">',
    '  <li>A</li>',
    '  <li>C</li>',
    '</ul>',
    ''
  ].join('\n')
});
assert.equal(siblingRaceBlocked.status, 'blocked');
assert.equal(siblingRaceBlocked.conflicts.some((conflict) => conflict.details.reasonCode === 'html-structural-add-delete-unsupported'), true);

const unkeyedDeleteBase = [
  '<ul id="todos">',
  '  <li>A</li>',
  '  <li>B</li>',
  '</ul>',
  ''
].join('\n');
const unkeyedDeleteMerged = safeMergeHtmlSource({
  id: 'html_unkeyed_structural_delete_under_explicit_parent',
  sourcePath: 'view.html',
  baseSourceText: unkeyedDeleteBase,
  workerSourceText: [
    '<ul id="todos">',
    '  <li>A</li>',
    '</ul>',
    ''
  ].join('\n'),
  headSourceText: unkeyedDeleteBase.replace('id="todos"', 'id="todos" class="list"')
});
assert.equal(unkeyedDeleteMerged.status, 'merged');
assert.match(unkeyedDeleteMerged.mergedSourceText, /class="list"/);
assert.doesNotMatch(unkeyedDeleteMerged.mergedSourceText, /<li>B<\/li>/);
assert.equal(unkeyedDeleteMerged.htmlUnkeyedStructuralDeleteEvidence.length, 1);
assert.equal(unkeyedDeleteMerged.htmlUnkeyedStructuralDeleteEvidence[0].deleteOnly, true);
assert.equal(unkeyedDeleteMerged.htmlUnkeyedStructuralDeleteEvidence[0].semanticEquivalenceClaim, false);
assert.equal(unkeyedDeleteMerged.admission.htmlUnkeyedStructuralDeleteEvidence.length, 1);

const unkeyedDeleteParentBlocked = safeMergeHtmlSource({
  id: 'html_unkeyed_structural_delete_under_unkeyed_parent_blocked',
  sourcePath: 'view.html',
  baseSourceText: '<section><p>A</p><p>B</p></section>\n',
  workerSourceText: '<section><p>A</p></section>\n',
  headSourceText: '<section class="panel"><p>A</p><p>B</p></section>\n'
});
assert.equal(unkeyedDeleteParentBlocked.status, 'blocked');
assert.equal(unkeyedDeleteParentBlocked.conflicts.some((conflict) => conflict.details.reasonCode === 'html-structural-add-delete-unsupported'), true);

const unkeyedDeleteSiblingRaceBlocked = safeMergeHtmlSource({
  id: 'html_unkeyed_structural_delete_sibling_race_blocked',
  sourcePath: 'view.html',
  baseSourceText: unkeyedDeleteBase,
  workerSourceText: [
    '<ul id="todos">',
    '  <li>A</li>',
    '</ul>',
    ''
  ].join('\n'),
  headSourceText: [
    '<ul id="todos">',
    '  <li>A</li>',
    '  <li>B</li>',
    '  <li>C</li>',
    '</ul>',
    ''
  ].join('\n')
});
assert.equal(unkeyedDeleteSiblingRaceBlocked.status, 'blocked');
assert.equal(unkeyedDeleteSiblingRaceBlocked.conflicts.some((conflict) => conflict.details.reasonCode === 'html-structural-add-delete-unsupported'), true);

const unkeyedDeleteNestedEditBlocked = safeMergeHtmlSource({
  id: 'html_unkeyed_structural_delete_nested_edit_blocked',
  sourcePath: 'view.html',
  baseSourceText: unkeyedDeleteBase,
  workerSourceText: [
    '<ul id="todos">',
    '  <li>A</li>',
    '</ul>',
    ''
  ].join('\n'),
  headSourceText: unkeyedDeleteBase.replace('>B</li>', '>Bee</li>')
});
assert.equal(unkeyedDeleteNestedEditBlocked.status, 'blocked');
assert.equal(unkeyedDeleteNestedEditBlocked.conflicts.some((conflict) => conflict.code === 'html-structural-overlap-conflict' || conflict.code === 'html-record-conflict'), true);
