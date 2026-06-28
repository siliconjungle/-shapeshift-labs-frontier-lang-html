import assert from 'node:assert/strict';
import { safeMergeHtmlSource } from '../dist/index.js';

const htmlPartTokenMerge = safeMergeHtmlSource({
  id: 'html_part_token_additions_merge',
  sourcePath: 'view.html',
  baseSourceText: '<div data-frontier-key="panel" part="card">Panel</div>\n',
  workerSourceText: '<div data-frontier-key="panel" part="card toolbar">Panel</div>\n',
  headSourceText: '<div data-frontier-key="panel" part="card compact">Panel</div>\n'
});
assert.equal(htmlPartTokenMerge.status, 'merged');
assert.match(htmlPartTokenMerge.mergedSourceText, /part="card compact toolbar"/);
assert.equal(htmlPartTokenMerge.htmlTokenListMergeEvidence.length, 1);
assert.equal(htmlPartTokenMerge.htmlTokenListMergeEvidence[0].kind, 'frontier.lang.htmlTokenListMergeEvidence');
assert.equal(htmlPartTokenMerge.htmlTokenListMergeEvidence[0].attributeName, 'part');
assert.deepEqual(htmlPartTokenMerge.htmlTokenListMergeEvidence[0].workerAddedTokens, ['toolbar']);
assert.deepEqual(htmlPartTokenMerge.htmlTokenListMergeEvidence[0].headAddedTokens, ['compact']);
assert.equal(htmlPartTokenMerge.htmlTokenListMergeEvidence[0].browserRenderEquivalenceClaim, false);
assert.equal(htmlPartTokenMerge.browserRuntimeEquivalenceClaim, false);

const htmlItempropAddRemoveMerge = safeMergeHtmlSource({
  id: 'html_itemprop_token_add_remove_merge',
  sourcePath: 'view.html',
  baseSourceText: '<span data-frontier-key="name" itemprop="name headline label">Name</span>\n',
  workerSourceText: '<span data-frontier-key="name" itemprop="name label">Name</span>\n',
  headSourceText: '<span data-frontier-key="name" itemprop="name headline label shortName">Name</span>\n'
});
assert.equal(htmlItempropAddRemoveMerge.status, 'merged');
assert.match(htmlItempropAddRemoveMerge.mergedSourceText, /itemprop="name label shortName"/);
assert.equal(htmlItempropAddRemoveMerge.htmlTokenListMergeEvidence[0].attributeName, 'itemprop');
assert.deepEqual(htmlItempropAddRemoveMerge.htmlTokenListMergeEvidence[0].workerRemovedTokens, ['headline']);
assert.deepEqual(htmlItempropAddRemoveMerge.htmlTokenListMergeEvidence[0].headAddedTokens, ['shortName']);

const htmlPartDuplicateConflict = safeMergeHtmlSource({
  id: 'html_part_token_duplicate_conflict',
  sourcePath: 'view.html',
  baseSourceText: '<div data-frontier-key="panel" part="card">Panel</div>\n',
  workerSourceText: '<div data-frontier-key="panel" part="card toolbar">Panel</div>\n',
  headSourceText: '<div data-frontier-key="panel" part="card card compact">Panel</div>\n'
});
assert.equal(htmlPartDuplicateConflict.status, 'blocked');
assert.equal(htmlPartDuplicateConflict.conflicts.some((conflict) => conflict.details.reasonCode === 'html-token-list-duplicate-conflict'), true);

const htmlPartOrderOnlyConflict = safeMergeHtmlSource({
  id: 'html_part_token_order_only_conflict',
  sourcePath: 'view.html',
  baseSourceText: '<div data-frontier-key="panel" part="card toolbar">Panel</div>\n',
  workerSourceText: '<div data-frontier-key="panel" part="toolbar card">Panel</div>\n',
  headSourceText: '<div data-frontier-key="panel" part="card toolbar compact">Panel</div>\n'
});
assert.equal(htmlPartOrderOnlyConflict.status, 'blocked');
assert.equal(htmlPartOrderOnlyConflict.conflicts.some((conflict) => conflict.details.reasonCode === 'html-token-list-order-conflict'), true);

const unsupportedTokenLikeAttributeConflict = safeMergeHtmlSource({
  id: 'html_unsupported_token_like_attribute_conflict',
  sourcePath: 'view.html',
  baseSourceText: '<div data-frontier-key="panel" data-tags="card">Panel</div>\n',
  workerSourceText: '<div data-frontier-key="panel" data-tags="card toolbar">Panel</div>\n',
  headSourceText: '<div data-frontier-key="panel" data-tags="card compact">Panel</div>\n'
});
assert.equal(unsupportedTokenLikeAttributeConflict.status, 'blocked');
assert.equal(unsupportedTokenLikeAttributeConflict.conflicts.some((conflict) => conflict.details.reasonCode === 'html-attribute-conflict'), true);
