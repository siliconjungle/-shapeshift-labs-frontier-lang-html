import assert from 'node:assert/strict';
import { hashSemanticValue } from '@shapeshift-labs/frontier-lang-kernel';
import { safeMergeHtmlSource } from '../dist/index.js';

function runtimeEvidence(reasonCode, boundary, label) {
  return {
    runtimeCommand: `node test/html-runtime/${label}.mjs`,
    runtimeProbeId: `html:${reasonCode}:${boundary}`,
    runtimeEvidenceHash: hashSemanticValue(`html-runtime-evidence:${reasonCode}:${boundary}:${label}`),
    runtimeSignals: ['html-resource-loading-runtime']
  };
}

const linkBase = '<link data-frontier-key="theme" rel="stylesheet" href="/a.css">\n';
const linkWorker = '<link data-frontier-key="theme" rel="stylesheet" href="/b.css">\n';
const linkProof = {
  id: 'proof_html_link_resource_runtime',
  kind: 'html-source-bound-runtime-boundary-proof',
  status: 'passed',
  sourcePath: 'view.html',
  reasonCode: 'resource-loading-runtime-boundary',
  side: 'worker',
  boundary: 'html-resource-loading-attribute',
  boundaryAttributes: ['href'],
  baseSourceHash: hashSemanticValue(linkBase),
  workerSourceHash: hashSemanticValue(linkWorker),
  headSourceHash: hashSemanticValue(linkBase),
  outputSourceHash: hashSemanticValue(linkWorker),
  ...runtimeEvidence('resource-loading-runtime-boundary', 'html-resource-loading-attribute', 'link-resource')
};
const linkBlocked = safeMergeHtmlSource({ id: 'html_link_resource_blocked', sourcePath: 'view.html', baseSourceText: linkBase, workerSourceText: linkWorker, headSourceText: linkBase });
assert.equal(linkBlocked.status, 'blocked');
assert.equal(linkBlocked.conflicts.some((conflict) => conflict.details.reasonCode === 'resource-loading-runtime-boundary'), true);
const linkWrongAttributeProof = safeMergeHtmlSource({ id: 'html_link_resource_wrong_attribute', sourcePath: 'view.html', baseSourceText: linkBase, workerSourceText: linkWorker, headSourceText: linkBase, htmlRuntimeBoundaryProofs: [{ ...linkProof, boundaryAttributes: ['media'] }] });
assert.equal(linkWrongAttributeProof.status, 'blocked');
const linkProven = safeMergeHtmlSource({ id: 'html_link_resource_proven', sourcePath: 'view.html', baseSourceText: linkBase, workerSourceText: linkWorker, headSourceText: linkBase, htmlRuntimeBoundaryProofs: [linkProof] });
assert.equal(linkProven.status, 'merged');
assert.equal(linkProven.browserRuntimeEquivalenceClaim, true);
assert.equal(linkProven.htmlRuntimeProofs[0].boundary, 'html-resource-loading-attribute');
assert.equal(linkProven.htmlRuntimeProofs[0].attributeName, 'href');
assert.equal(linkProven.mergedSourceText, linkWorker);

const baseBase = '<base data-frontier-key="base" href="/old/">\n';
const baseWorker = '<base data-frontier-key="base" href="/new/">\n';
const baseBlocked = safeMergeHtmlSource({ id: 'html_base_runtime_blocked', sourcePath: 'view.html', baseSourceText: baseBase, workerSourceText: baseWorker, headSourceText: baseBase });
assert.equal(baseBlocked.status, 'blocked');
assert.equal(baseBlocked.conflicts.some((conflict) => conflict.details.reasonCode === 'document-base-runtime-boundary'), true);

const metaBase = '<meta data-frontier-key="refresh" http-equiv="refresh" content="30">\n';
const metaWorker = '<meta data-frontier-key="refresh" http-equiv="refresh" content="0">\n';
const metaBlocked = safeMergeHtmlSource({ id: 'html_meta_runtime_blocked', sourcePath: 'view.html', baseSourceText: metaBase, workerSourceText: metaWorker, headSourceText: metaBase });
assert.equal(metaBlocked.status, 'blocked');
assert.equal(metaBlocked.conflicts.some((conflict) => conflict.details.reasonCode === 'document-metadata-runtime-boundary'), true);

const mediaBase = '<video data-frontier-key="hero" poster="/a.jpg" preload="metadata"></video>\n';
const mediaWorker = '<video data-frontier-key="hero" poster="/b.jpg" preload="metadata"></video>\n';
const mediaProof = {
  id: 'proof_html_media_resource_runtime',
  kind: 'html-source-bound-runtime-boundary-proof',
  status: 'passed',
  sourcePath: 'view.html',
  reasonCode: 'resource-loading-runtime-boundary',
  side: 'worker',
  boundary: 'html-resource-loading-attribute',
  boundaryAttributes: ['poster'],
  baseSourceHash: hashSemanticValue(mediaBase),
  workerSourceHash: hashSemanticValue(mediaWorker),
  headSourceHash: hashSemanticValue(mediaBase),
  outputSourceHash: hashSemanticValue(mediaWorker),
  ...runtimeEvidence('resource-loading-runtime-boundary', 'html-resource-loading-attribute', 'media-resource')
};
const mediaBlocked = safeMergeHtmlSource({ id: 'html_media_resource_blocked', sourcePath: 'view.html', baseSourceText: mediaBase, workerSourceText: mediaWorker, headSourceText: mediaBase });
assert.equal(mediaBlocked.status, 'blocked');
assert.equal(mediaBlocked.conflicts.some((conflict) => conflict.details.reasonCode === 'resource-loading-runtime-boundary'), true);
const mediaProven = safeMergeHtmlSource({ id: 'html_media_resource_proven', sourcePath: 'view.html', baseSourceText: mediaBase, workerSourceText: mediaWorker, headSourceText: mediaBase, htmlRuntimeBoundaryProofs: [mediaProof] });
assert.equal(mediaProven.status, 'merged');
assert.equal(mediaProven.htmlRuntimeProofs[0].attributeName, 'poster');
assert.equal(mediaProven.mergedSourceText, mediaWorker);
