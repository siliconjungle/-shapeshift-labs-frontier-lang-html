import assert from 'node:assert/strict';
import { safeMergeHtmlSource } from '../dist/index.js';

const htmlClassTokenMerge = safeMergeHtmlSource({
  id: 'html_class_token_additions_merge',
  sourcePath: 'view.html',
  baseSourceText: '<div data-frontier-key="panel" class="card">Panel</div>\n',
  workerSourceText: '<div data-frontier-key="panel" class="card selected">Panel</div>\n',
  headSourceText: '<div data-frontier-key="panel" class="card compact">Panel</div>\n'
});
assert.equal(htmlClassTokenMerge.status, 'merged');
assert.match(htmlClassTokenMerge.mergedSourceText, /class="card compact selected"/);
assert.equal(htmlClassTokenMerge.htmlClassTokenMergeEvidence.length, 1);
assert.equal(htmlClassTokenMerge.htmlTokenListMergeEvidence.length, 1);
assert.deepEqual(htmlClassTokenMerge.htmlClassTokenMergeEvidence[0].workerAddedTokens, ['selected']);
assert.deepEqual(htmlClassTokenMerge.htmlClassTokenMergeEvidence[0].headAddedTokens, ['compact']);
assert.equal(htmlClassTokenMerge.htmlClassTokenMergeEvidence[0].browserRenderEquivalenceClaim, false);
assert.equal(htmlClassTokenMerge.htmlTokenListMergeEvidence[0].kind, 'frontier.lang.htmlClassTokenMergeEvidence');

const htmlClassTokenAddRemoveMerge = safeMergeHtmlSource({
  id: 'html_class_token_add_remove_merge',
  sourcePath: 'view.html',
  baseSourceText: '<div data-frontier-key="panel" class="card selected muted">Panel</div>\n',
  workerSourceText: '<div data-frontier-key="panel" class="card muted">Panel</div>\n',
  headSourceText: '<div data-frontier-key="panel" class="card selected muted compact">Panel</div>\n'
});
assert.equal(htmlClassTokenAddRemoveMerge.status, 'merged');
assert.match(htmlClassTokenAddRemoveMerge.mergedSourceText, /class="card muted compact"/);
assert.deepEqual(htmlClassTokenAddRemoveMerge.htmlClassTokenMergeEvidence[0].workerRemovedTokens, ['selected']);
assert.deepEqual(htmlClassTokenAddRemoveMerge.htmlClassTokenMergeEvidence[0].headAddedTokens, ['compact']);

const htmlClassTokenDuplicateConflict = safeMergeHtmlSource({
  id: 'html_class_token_duplicate_conflict',
  sourcePath: 'view.html',
  baseSourceText: '<div data-frontier-key="panel" class="card">Panel</div>\n',
  workerSourceText: '<div data-frontier-key="panel" class="card selected">Panel</div>\n',
  headSourceText: '<div data-frontier-key="panel" class="card card compact">Panel</div>\n'
});
assert.equal(htmlClassTokenDuplicateConflict.status, 'blocked');
assert.equal(htmlClassTokenDuplicateConflict.conflicts.some((conflict) => conflict.details.reasonCode === 'html-class-token-duplicate-conflict'), true);

const htmlClassTokenOrderOnlyConflict = safeMergeHtmlSource({
  id: 'html_class_token_order_only_conflict',
  sourcePath: 'view.html',
  baseSourceText: '<div data-frontier-key="panel" class="card selected">Panel</div>\n',
  workerSourceText: '<div data-frontier-key="panel" class="selected card">Panel</div>\n',
  headSourceText: '<div data-frontier-key="panel" class="card selected compact">Panel</div>\n'
});
assert.equal(htmlClassTokenOrderOnlyConflict.status, 'blocked');
assert.equal(htmlClassTokenOrderOnlyConflict.conflicts.some((conflict) => conflict.details.reasonCode === 'html-class-token-order-conflict'), true);
