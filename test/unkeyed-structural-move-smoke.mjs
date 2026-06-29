import assert from 'node:assert/strict';
import { safeMergeHtmlSource } from '../dist/index.js';

const unkeyedMoveBase = [
  '<ul id="todos">',
  '  <li data-frontier-key="a">A</li>',
  '  <li>Loose</li>',
  '  <li data-frontier-key="b">B</li>',
  '</ul>',
  ''
].join('\n');
const unkeyedMoveMerged = safeMergeHtmlSource({
  id: 'html_unkeyed_structural_move_under_explicit_parent',
  sourcePath: 'view.html',
  baseSourceText: unkeyedMoveBase,
  workerSourceText: [
    '<ul id="todos">',
    '  <li data-frontier-key="a">A</li>',
    '  <li data-frontier-key="b">B</li>',
    '  <li>Loose</li>',
    '</ul>',
    ''
  ].join('\n'),
  headSourceText: unkeyedMoveBase.replace('id="todos"', 'id="todos" class="list"')
});
assert.equal(unkeyedMoveMerged.status, 'merged');
assert.match(unkeyedMoveMerged.mergedSourceText, /<ul id="todos" class="list">/);
assert.match(unkeyedMoveMerged.mergedSourceText, /data-frontier-key="b">B<\/li>\n  <li>Loose<\/li>/);
assert.equal(unkeyedMoveMerged.htmlUnkeyedStructuralMoveEvidence.length, 1);
assert.equal(unkeyedMoveMerged.htmlUnkeyedStructuralMoveEvidence[0].parentExplicitIdentity, true);
assert.equal(unkeyedMoveMerged.htmlUnkeyedStructuralMoveEvidence[0].moveOnly, true);
assert.equal(unkeyedMoveMerged.htmlUnkeyedStructuralMoveEvidence[0].keyedSiblingAnchor, true);
assert.equal(unkeyedMoveMerged.htmlUnkeyedStructuralMoveEvidence[0].semanticEquivalenceClaim, false);
assert.equal(unkeyedMoveMerged.admission.htmlUnkeyedStructuralMoveEvidence.length, 1);

const unkeyedMoveSiblingRaceBlocked = safeMergeHtmlSource({
  id: 'html_unkeyed_structural_move_sibling_race_blocked',
  sourcePath: 'view.html',
  baseSourceText: unkeyedMoveBase,
  workerSourceText: [
    '<ul id="todos">',
    '  <li data-frontier-key="a">A</li>',
    '  <li data-frontier-key="b">B</li>',
    '  <li>Loose</li>',
    '</ul>',
    ''
  ].join('\n'),
  headSourceText: [
    '<ul id="todos">',
    '  <li data-frontier-key="a">A</li>',
    '  <li>Loose</li>',
    '  <li data-frontier-key="b">B</li>',
    '  <li>New</li>',
    '</ul>',
    ''
  ].join('\n')
});
assert.equal(unkeyedMoveSiblingRaceBlocked.status, 'blocked');
assert.equal(unkeyedMoveSiblingRaceBlocked.conflicts.some((conflict) => conflict.details.reasonCode === 'html-structural-add-delete-unsupported'), true);
