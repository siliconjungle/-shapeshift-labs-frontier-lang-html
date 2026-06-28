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
